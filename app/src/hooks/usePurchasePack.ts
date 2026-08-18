import { useState } from "react";
import { useAction } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import { useToast } from "../components/Toast";

/**
 * Starts a Stripe Checkout session for a credit pack and redirects to it.
 * Shared by BuyCreditsSheet and WalletPage so both surfaces trigger the
 * same live purchase flow instead of duplicating the handler.
 */
export function usePurchasePack() {
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);
  const { showToast } = useToast();
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

  async function purchasePack(packIndex: number) {
    setLoadingIndex(packIndex);
    try {
      const { url } = await createCheckoutSession({ packIndex });
      window.location.href = url;
    } catch (err) {
      if (err instanceof ConvexError && String(err.data).startsWith("NOT_CONFIGURED")) {
        showToast("Payments aren't set up yet — coming soon");
      } else {
        showToast("Couldn't start checkout. Please try again.");
      }
    } finally {
      setLoadingIndex(null);
    }
  }

  return { purchasePack, loadingIndex };
}
