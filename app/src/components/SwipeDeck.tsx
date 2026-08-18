import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ShirtCard } from "./ShirtCard";
import type { DeckCard } from "./ShirtCard";
import { EmptyDeck } from "./EmptyDeck";
import { DrawImminentOverlay } from "./DrawImminentOverlay";
import { BidQuantityPicker } from "./BidQuantityPicker";
import { useToast } from "./Toast";
import { useCurrentUser } from "../hooks/useCurrentUser";

export function SwipeDeck({
  onRequireLogin,
  onNoCredits,
}: {
  onRequireLogin: () => void;
  onNoCredits: () => void;
}) {
  const { isSignedIn } = useCurrentUser();
  const deck = useQuery(api.shirts.getDeck, {});
  const placeBid = useMutation(api.bids.placeBid);
  const { showToast } = useToast();

  // Local skip order: swiped-left cards cycle to the back locally.
  const [skipped, setSkipped] = useState<string[]>([]);
  const [flyOut, setFlyOut] = useState<{ id: string; dir: "left" | "right" } | null>(null);
  const [drawImminent, setDrawImminent] = useState<{ shirtName: string } | null>(null);
  const [bidQuantity, setBidQuantity] = useState(1);

  if (deck === undefined) {
    return <div className="relative min-h-0 flex-1" />;
  }

  const ordered = orderDeck(deck, skipped);

  if (ordered.length === 0) {
    return (
      <div className="relative min-h-0 flex-1 px-4 pb-4">
        <EmptyDeck />
      </div>
    );
  }

  const topThree = ordered.slice(0, 3);

  /** Retires a card from the visible stack once its fly-out animation has
   * genuinely finished (called by `ShirtCard`, not a fixed timer — this
   * decouples retirement from network latency on the bid path). */
  function retireCard(cardId: string) {
    setSkipped((prev) => [...prev, cardId]);
    setFlyOut((current) => (current?.id === cardId ? null : current));
  }

  function handleSwipe(card: DeckCard, direction: "left" | "right") {
    // Single fly-out trigger point for both the drag-release path
    // (ShirtCard's onDragEnd) and the button-click path below — ShirtCard
    // owns the actual animation and reports back via onFlyOutComplete, so
    // there is exactly one fly-out per swipe regardless of trigger.
    setFlyOut({ id: card.id, dir: direction });

    if (direction === "left") {
      return;
    }

    // Right swipe = bid.
    if (!isSignedIn) {
      setFlyOut(null);
      onRequireLogin();
      return;
    }

    void placeBidBatch(card, bidQuantity);
  }

  async function placeBidBatch(card: DeckCard, count: number) {
    try {
      const result = await placeBid({ shirtId: card.id as Id<"shirts">, count });

      if (result.placedCount > 0) {
        const parts: string[] = [];
        if (result.freeUsed > 0) parts.push(`${result.freeUsed} free`);
        if (result.paidUsed > 0) parts.push(`${result.paidUsed} credit${result.paidUsed === 1 ? "" : "s"}`);
        const breakdown = parts.length > 0 ? ` — ${parts.join(" + ")}` : "";
        showToast(
          result.placedCount === 1
            ? `Bid placed${breakdown}`
            : `${result.placedCount} bids placed${breakdown}`
        );
      }

      if (result.becameDrawing) {
        setDrawImminent({ shirtName: card.name });
      }
    } catch (err) {
      setFlyOut(null);
      if (err instanceof ConvexError) {
        if (err.data === "NO_CREDITS") {
          onNoCredits();
          return;
        }
        if (
          err.data &&
          typeof err.data === "object" &&
          err.data.code === "ENTRY_CAP_REACHED"
        ) {
          const remainingCap = err.data.remainingCap ?? 0;
          showToast(
            remainingCap > 0
              ? `Only ${remainingCap} more ${remainingCap === 1 ? "entry" : "entries"} allowed on this shirt`
              : "You've maxed your entries on this one — keeps draws fair"
          );
          setSkipped((prev) => [...prev, card.id]);
          return;
        }
        if (err.data === "SHIRT_NOT_ACTIVE") {
          showToast("This shirt is no longer accepting bids");
          setSkipped((prev) => [...prev, card.id]);
          return;
        }
      }
      showToast("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col px-4 pb-3">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {topThree.map((card, i) => (
          <ShirtCard
            key={card.id}
            card={card}
            index={i}
            isTop={i === 0}
            flyOutDirection={flyOut?.id === card.id ? flyOut.dir : null}
            onSwipe={(dir) => handleSwipe(card, dir)}
            onFlyOutComplete={() => retireCard(card.id)}
          />
        ))}
      </div>

      <div className="mt-3 flex shrink-0 items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => handleSwipe(topThree[0], "left")}
          className="flex h-[62px] w-[62px] items-center justify-center rounded-full border-2 border-pink text-2xl text-pink transition-transform duration-[120ms] active:scale-90"
          aria-label="Skip"
        >
          ✕
        </button>
        <button
          type="button"
          onClick={() => handleSwipe(topThree[0], "right")}
          className="flex h-[74px] w-[74px] items-center justify-center rounded-full bg-lime text-2xl text-ink animate-[glowPulse_2.4s_infinite] transition-transform duration-[120ms] active:scale-90"
          aria-label="Bid"
        >
          ✓
        </button>
        <BidQuantityPicker value={bidQuantity} onChange={setBidQuantity} />
      </div>

      <AnimatePresence>
        {drawImminent && (
          <DrawImminentOverlay
            shirtName={drawImminent.shirtName}
            onDismiss={() => setDrawImminent(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/** Reorders the live deck so locally-skipped cards move to the back. */
function orderDeck(deck: DeckCard[], skipped: string[]): DeckCard[] {
  const skippedSet = new Set(skipped);
  const fresh = deck.filter((c) => !skippedSet.has(c.id));
  const cycled = skipped
    .map((id) => deck.find((c) => c.id === id))
    .filter((c): c is DeckCard => Boolean(c));
  return [...fresh, ...cycled];
}
