import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { useToast } from "./Toast";

const SIZES = ["S", "M", "L", "XL", "2XL", "3XL"] as const;

/**
 * Buy It Now flow (docs/10-frontend.md): size picker -> address (from
 * profile) -> credit-applied summary -> confirm -> `orders.startPurchase`
 * -> Stripe checkout for any remainder, or an immediate success toast if
 * fully credit-covered.
 */
export function BuyItNowModal({
  shirtId,
  shirtName,
  retailPriceCents,
  onClose,
}: {
  shirtId: Id<"shirts">;
  shirtName: string;
  retailPriceCents: number;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const wallet = useQuery(api.wallet.get, {});
  const addresses = useQuery(api.addresses.list, {});
  const startPurchase = useMutation(api.orders.startPurchase);
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);
  const { showToast } = useToast();

  const [size, setSize] = useState<(typeof SIZES)[number] | "">("");
  const [submitting, setSubmitting] = useState(false);

  const defaultAddress = addresses?.find((a) => a.isDefault) ?? addresses?.[0];

  const stakedOnThisShirt =
    wallet?.stakedBreakdown.find((b) => b.shirtId === shirtId)?.credits ?? 0;
  const availableCredits = wallet?.availableCredits ?? 0;
  // Mirrors the server's creditValueCents (first pack's price/credit).
  const firstPack = wallet?.creditPacks[0];
  const creditCents =
    firstPack && firstPack.credits > 0 ? firstPack.priceCents / firstPack.credits : 10;

  const fromAvailableCents = Math.min(
    Math.round(availableCredits * creditCents),
    retailPriceCents
  );
  const remainingAfterAvailable = retailPriceCents - fromAvailableCents;
  const fromStakedCents = Math.min(
    remainingAfterAvailable,
    Math.round(stakedOnThisShirt * creditCents)
  );
  const totalCreditsAppliedCents = fromAvailableCents + fromStakedCents;
  const remainderCents = Math.max(0, retailPriceCents - totalCreditsAppliedCents);
  const usesStaked = fromStakedCents > 0;

  async function handleConfirm() {
    if (!size || !defaultAddress) return;
    setSubmitting(true);
    try {
      const result = await startPurchase({
        shirtId,
        size,
        addressId: defaultAddress._id,
      });
      if (!result.needsPayment) {
        showToast("Order placed — it's headed to production!");
        onClose();
        return;
      }
      const { url } = await createCheckoutSession({ orderId: result.orderId });
      window.location.href = url;
    } catch (err) {
      if (err instanceof ConvexError && String(err.data).startsWith("NOT_CONFIGURED")) {
        showToast("Payments aren't set up yet — coming soon");
      } else if (err instanceof ConvexError && err.data === "SHIRT_DRAWING") {
        showToast("This shirt is drawing right now — staked credits are locked");
      } else {
        showToast("Couldn't start your order. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      <Modal onClose={onClose} zIndex={82}>
        <h2 className="font-[family-name:var(--font-display)] text-lg uppercase text-white">
          Buy It Now — {shirtName}
        </h2>

        <div className="mt-5 flex flex-col gap-4">
          <div>
            <p className="mb-1.5 font-mono text-[9.5px] uppercase tracking-[2px] text-faint">
              Size
            </p>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                    size === s
                      ? "border-lime text-lime"
                      : "border-border2 text-white"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 font-mono text-[9.5px] uppercase tracking-[2px] text-faint">
              Ship to
            </p>
            {defaultAddress ? (
              <p className="text-sm text-white">
                {defaultAddress.address1}, {defaultAddress.city} {defaultAddress.region}{" "}
                {defaultAddress.zip}
              </p>
            ) : (
              <div className="rounded-xl border border-border2 px-3 py-2.5 text-xs text-muted">
                No address on file.{" "}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate("/profile");
                  }}
                  className="text-lime underline"
                >
                  Add one in your profile
                </button>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border2 px-4 py-3 text-xs text-muted">
            <div className="flex justify-between">
              <span>Retail price</span>
              <span className="text-white">${(retailPriceCents / 100).toFixed(2)}</span>
            </div>
            {totalCreditsAppliedCents > 0 && (
              <div className="mt-1 flex justify-between text-lime">
                <span>Credits applied</span>
                <span>-${(totalCreditsAppliedCents / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between font-bold text-white">
              <span>Due at checkout</span>
              <span>${(remainderCents / 100).toFixed(2)}</span>
            </div>
            {usesStaked && (
              <p className="mt-2 text-pink">
                Your {Math.ceil(fromStakedCents / creditCents)} staked credits cover $
                {(fromStakedCents / 100).toFixed(2)} — withdrawing them removes your
                entries on this shirt.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="lime"
            onClick={handleConfirm}
            disabled={submitting || !size || !defaultAddress}
            className="flex-1"
          >
            {submitting ? "Placing…" : "Confirm"}
          </Button>
        </div>
      </Modal>
    </AnimatePresence>
  );
}
