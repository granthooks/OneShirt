import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { PageShell } from "../components/PageShell";
import { Button } from "../components/Button";
import { BuyItNowModal } from "../components/BuyItNowModal";
import { shirtGradient } from "../lib/shirtArt";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useToast } from "../components/Toast";

export default function ShirtSharePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSignedIn } = useCurrentUser();
  const { showToast } = useToast();
  const [showBuyNow, setShowBuyNow] = useState(false);
  const shirt = useQuery(
    api.shirts.getShirt,
    id ? { shirtId: id as Id<"shirts"> } : "skip"
  );
  const placeBid = useMutation(api.bids.placeBid);

  if (shirt === undefined) {
    return (
      <PageShell title="Shirt">
        <div />
      </PageShell>
    );
  }

  const progressPct =
    shirt.bidThreshold > 0
      ? Math.min(100, (shirt.bidCount / shirt.bidThreshold) * 100)
      : 0;

  async function handleBid() {
    if (!isSignedIn) {
      navigate("/", { state: { openLogin: true } });
      return;
    }
    try {
      await placeBid({ shirtId: id as Id<"shirts"> });
      showToast("Entry placed!");
    } catch (err) {
      if (err instanceof ConvexError && err.data === "NO_CREDITS") {
        showToast("Out of credits — visit your wallet to top up");
      } else if (
        err instanceof ConvexError &&
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
      } else {
        showToast("Something went wrong. Please try again.");
      }
    }
  }

  return (
    <PageShell title={shirt.name}>
      <div
        className="h-64 w-full rounded-2xl"
        style={{
          background: shirt.webImageUrl
            ? `center / cover no-repeat url(${shirt.webImageUrl})`
            : shirtGradient(shirt.id),
        }}
      />
      <div className="mt-4 flex flex-col gap-2">
        <h2 className="font-[family-name:var(--font-display)] text-xl uppercase text-white">
          {shirt.name}
        </h2>
        {shirt.designer && (
          <p className="font-mono text-[10.5px] uppercase tracking-[2px] text-muted">
            by {shirt.designer}
          </p>
        )}
        {shirt.description && (
          <p className="text-sm text-muted">{shirt.description}</p>
        )}

        {shirt.status === "won" && shirt.winnerFirstName && (
          <p className="text-sm text-lime">
            Won by {shirt.winnerFirstName}
          </p>
        )}

        {shirt.status === "active" && (
          <>
            <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[1px] text-lime">
              <span>Draws when full</span>
              <span>
                {shirt.bidCount} / {shirt.bidThreshold}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/[.14]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progressPct}%`,
                  background: "linear-gradient(90deg,#c6ff4d,#00ffa3)",
                }}
              />
            </div>
            <Button variant="lime" glow onClick={handleBid} className="mt-3 w-full">
              Bid
            </Button>
          </>
        )}

        {(shirt.status === "active" || shirt.status === "won") && (
          <Button
            variant="outline-pink"
            onClick={() => {
              if (!isSignedIn) {
                navigate("/", { state: { openLogin: true } });
                return;
              }
              setShowBuyNow(true);
            }}
            className="mt-2 w-full"
          >
            Buy It Now — ${(shirt.retailPriceCents / 100).toFixed(2)}
          </Button>
        )}
      </div>

      {showBuyNow && (
        <BuyItNowModal
          shirtId={shirt.id}
          shirtName={shirt.name}
          retailPriceCents={shirt.retailPriceCents}
          onClose={() => setShowBuyNow(false)}
        />
      )}
    </PageShell>
  );
}
