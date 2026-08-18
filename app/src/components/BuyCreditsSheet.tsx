import { useQuery } from "convex/react";
import { AnimatePresence } from "framer-motion";
import { api } from "../../convex/_generated/api";
import { Sheet } from "./Modal";
import { usePurchasePack } from "../hooks/usePurchasePack";

export function BuyCreditsSheet({ onClose }: { onClose: () => void }) {
  const wallet = useQuery(api.wallet.get, {});
  const { purchasePack, loadingIndex } = usePurchasePack();
  const packs = wallet?.creditPacks ?? [];
  // Middle pack is highlighted per DESIGN.md.
  const highlightIndex = Math.floor(packs.length / 2);

  return (
    <AnimatePresence>
      <Sheet onClose={onClose}>
        <h2 className="mb-4 text-center font-[family-name:var(--font-display)] text-xl uppercase text-white">
          Out of credits?
        </h2>

        <div className="flex flex-col gap-3">
          {packs.map((pack, i) => {
            const highlighted = i === highlightIndex;
            return (
              <button
                key={pack.stripePriceId || `${pack.credits}-${i}`}
                type="button"
                onClick={() => purchasePack(i)}
                disabled={loadingIndex !== null}
                className={`relative flex items-center justify-between rounded-2xl border px-4 py-4 text-left disabled:opacity-60 ${
                  highlighted
                    ? "border-lime shadow-[0_0_22px_rgba(198,255,77,.5)]"
                    : "border-border2"
                }`}
              >
                {highlighted && (
                  <span className="absolute -top-2.5 right-4 rounded-full bg-pink px-2 py-0.5 text-[9px] font-bold uppercase tracking-[1px] text-white">
                    Popular
                  </span>
                )}
                <span className="font-bold text-lime">
                  {pack.credits} credits
                </span>
                <span className="font-mono text-sm text-white">
                  {loadingIndex === i ? "…" : `$${(pack.priceCents / 100).toFixed(2)}`}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[1px] text-faint">
          secure checkout via stripe
        </p>
      </Sheet>
    </AnimatePresence>
  );
}
