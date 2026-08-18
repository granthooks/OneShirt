import { useEffect } from "react";
import { animate, motion, useMotionValue } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { shirtGradient } from "../lib/shirtArt";

export type DeckCard = {
  id: string;
  name: string;
  designer?: string;
  webImageUrl: string | null;
  bidCount: number;
  bidThreshold: number;
  entryCount: number;
  earlyBirdRemaining: number;
  likeCount: number;
  retailPriceCents: number;
  expiresAt?: number;
  myEntries?: number;
  likedByMe?: boolean;
};

const SWIPE_THRESHOLD = 90;
const FLY_DISTANCE = 640;
const SPRING_BACK = { type: "spring", stiffness: 500, damping: 40 } as const;

export function ShirtCard({
  card,
  index,
  isTop,
  flyOutDirection,
  onSwipe,
  onFlyOutComplete,
}: {
  card: DeckCard;
  index: number;
  isTop: boolean;
  /** Set once a swipe (drag-release or button) has committed; drives the
   * single fly-out animation below. `null` while idle. */
  flyOutDirection: "left" | "right" | null;
  onSwipe: (direction: "left" | "right") => void;
  /** Called when the fly-out animation finishes, so the parent can retire
   * the card from the visible stack. */
  onFlyOutComplete?: () => void;
}) {
  // Independent motion values (not derived via useTransform) so both the
  // drag gesture AND the imperative fly-out/cancel animations below can
  // drive them without fighting a read-only transform.
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useMotionValue(0);
  const opacity = useMotionValue(1);
  const toggleLike = useMutation(api.likes.toggle);
  const navigate = useNavigate();

  const expiryWarning = getExpiryWarning(card.expiresAt);

  // Framer Motion's native `drag` gesture drives `x` only (below); `y`/
  // `rotate` are computed here from the raw pointer offset, matching
  // DESIGN.md's `translate(dx, dy*0.15) rotate(dx*0.05deg)` card drag spec.
  // Keeping vertical travel small means the card can never visually bleed
  // out of its clipped stack container and paint over the action buttons.
  function handleDrag(_: unknown, info: PanInfo) {
    y.set(info.offset.y * 0.15);
    rotate.set(info.offset.x * 0.05);
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (Math.abs(info.offset.x) > SWIPE_THRESHOLD) {
      onSwipe(info.offset.x > 0 ? "right" : "left");
    } else {
      animate(x, 0, SPRING_BACK);
      animate(y, 0, SPRING_BACK);
      animate(rotate, 0, SPRING_BACK);
    }
  }

  // Single fly-out animation, driven imperatively from whatever `x`/`y`/
  // `rotate` currently are (0 for a button-triggered swipe, or the live
  // drag-release position/tilt for a drag-triggered swipe) — never a
  // second transform layer starting over from a fresh baseline. This is
  // what fixes the "swipe plays twice" bug: previously a separate wrapper
  // `motion.div` re-animated `x` from 0 while this card's own drag-driven
  // `x` snapped back to 0 at the same instant, reading as two motions.
  useEffect(() => {
    if (!flyOutDirection) {
      // Cancelled (e.g. a bid errored after the fly-out started) — snap
      // back to rest rather than leaving the card stuck mid-flight.
      animate(x, 0, SPRING_BACK);
      animate(y, 0, SPRING_BACK);
      animate(rotate, 0, SPRING_BACK);
      animate(opacity, 1, { duration: 0.15 });
      return;
    }
    const targetX = flyOutDirection === "right" ? FLY_DISTANCE : -FLY_DISTANCE;
    const targetRotate = flyOutDirection === "right" ? 26 : -26;
    const controls = animate(x, targetX, {
      duration: 0.43,
      ease: [0.45, 0, 0.8, 1],
    });
    animate(rotate, targetRotate, { duration: 0.43, ease: [0.45, 0, 0.8, 1] });
    animate(opacity, 0, { duration: 0.43, ease: [0.45, 0, 0.8, 1] });
    controls.then(() => onFlyOutComplete?.());
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyOutDirection]);

  const progressPct = card.bidThreshold > 0
    ? Math.min(100, (card.bidCount / card.bidThreshold) * 100)
    : 0;

  const isFlying = flyOutDirection !== null;

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden rounded-[22px]"
      style={{
        background: card.webImageUrl
          ? `center / cover no-repeat url(${card.webImageUrl})`
          : shirtGradient(card.id),
        x: isTop || isFlying ? x : 0,
        y: isTop || isFlying ? y : index * 14,
        rotate: isTop || isFlying ? rotate : 0,
        opacity: isFlying ? opacity : 1,
        scale: isTop || isFlying ? 1 : 1 - index * 0.045,
        zIndex: isFlying ? 20 : 10 - index,
      }}
      drag={isTop && !isFlying ? "x" : false}
      dragElastic={0.7}
      dragMomentum={false}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      initial={false}
      animate={
        isTop || isFlying
          ? undefined
          : { y: index * 14, scale: 1 - index * 0.045 }
      }
      exit={undefined}
      transition={{ duration: 0 }}
    >
      {/* Like button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          void toggleLike({ shirtId: card.id as never });
        }}
        className={`absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold backdrop-blur ${
          card.likedByMe ? "bg-pink/30 text-pink" : "bg-black/30 text-white"
        }`}
      >
        <span>{card.likedByMe ? "♥" : "♡"}</span>
        <span>{card.likeCount}</span>
      </button>

      {/* Info button — opens the shirt's share page, which has the Buy
          It Now flow (docs/10-frontend.md §Buy It Now flow). */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/s/${card.id}`);
        }}
        className={`absolute left-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/30 text-sm font-bold text-white backdrop-blur ${
          expiryWarning ? "top-12" : "top-3"
        }`}
        aria-label="Shirt details and Buy It Now"
      >
        &#9432;
      </button>

      {expiryWarning && (
        <div className="absolute left-3 top-3 z-10 rounded-full bg-black/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[1px] text-yellow backdrop-blur">
          {expiryWarning}
        </div>
      )}

      {/* Bottom scrim + info */}
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col gap-2 px-4 pb-4 pt-16"
        style={{
          background:
            "linear-gradient(transparent, rgba(5,5,15,.94))",
        }}
      >
        {card.earlyBirdRemaining > 0 && (
          <div className="w-fit rounded-full bg-lime/20 px-2.5 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[1px] text-lime">
            &#9889; 2&times; entries &mdash; {card.earlyBirdRemaining} left
          </div>
        )}

        <h3 className="font-[family-name:var(--font-display)] text-[23px] uppercase leading-none text-white">
          {card.name}
        </h3>
        {card.designer && (
          <p className="font-mono text-[10.5px] uppercase tracking-[2px] text-muted">
            by {card.designer}
          </p>
        )}

        {Boolean(card.myEntries) && (
          <p className="text-xs font-bold text-lime">
            You have {card.myEntries} {card.myEntries === 1 ? "entry" : "entries"}
          </p>
        )}

        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[1px] text-lime">
          <span>Draws when full</span>
          <span>
            {card.bidCount} / {card.bidThreshold}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/[.14]">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg,#c6ff4d,#00ffa3)",
            }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function getExpiryWarning(expiresAt?: number): string | null {
  if (!expiresAt) return null;
  const msRemaining = expiresAt - Date.now();
  if (msRemaining <= 0) return null;
  const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
  // "retires in Nd" when < 25% of the expiry window remains. We don't know
  // the original window length here, so use a fixed conservative cutoff
  // (7 days) as the "< 25% of a 30-day default window" proxy.
  if (daysRemaining <= 7) {
    return `retires in ${daysRemaining}d`;
  }
  return null;
}

export { SWIPE_THRESHOLD, FLY_DISTANCE };
