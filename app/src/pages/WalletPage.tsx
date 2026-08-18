import { useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import { PageShell } from "../components/PageShell";
import { Button } from "../components/Button";
import { useToast } from "../components/Toast";
import { SignedOutState } from "../components/SignedOutState";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { usePurchasePack } from "../hooks/usePurchasePack";

const LEDGER_KIND_LABEL: Record<string, string> = {
  purchase: "Purchased credits",
  welcome: "Welcome credits",
  referral: "Referral bonus",
  streak: "Streak bonus",
  stake: "Bid placed",
  unstake: "Entry returned",
  expiry_refund: "Shirt expired — refunded",
  redeem: "Redeemed for purchase",
  admin_adjust: "Admin adjustment",
};

export default function WalletPage() {
  const { isSignedIn } = useCurrentUser();
  const wallet = useQuery(api.wallet.get, {});
  const claimDailySwipes = useMutation(api.wallet.claimDailySwipes);
  const { showToast } = useToast();
  const [claiming, setClaiming] = useState(false);
  const { purchasePack, loadingIndex } = usePurchasePack();

  const ledger = usePaginatedQuery(
    api.wallet.getLedger,
    isSignedIn ? {} : "skip",
    { initialNumItems: 20 }
  );

  async function handleClaim() {
    setClaiming(true);
    try {
      const result = await claimDailySwipes({});
      showToast(
        result.bonusGranted > 0
          ? `+${result.freeSwipesRemaining} free swipes! ${result.streakDays}-day streak +${result.bonusGranted} credits`
          : `+${result.freeSwipesRemaining} free swipes! ${result.streakDays}-day streak`
      );
    } catch (err) {
      if (err instanceof ConvexError && err.data === "ALREADY_CLAIMED_TODAY") {
        showToast("Already claimed today — come back tomorrow");
      } else {
        showToast("Something went wrong. Please try again.");
      }
    } finally {
      setClaiming(false);
    }
  }

  if (!isSignedIn) {
    return (
      <PageShell title="Wallet">
        <SignedOutState label="Log in to view your credit balance and wallet history." />
      </PageShell>
    );
  }

  if (wallet === undefined) {
    return (
      <PageShell title="Wallet">
        <div />
      </PageShell>
    );
  }

  if (wallet === null) {
    return (
      <PageShell title="Wallet">
        <SignedOutState label="Log in to view your credit balance and wallet history." />
      </PageShell>
    );
  }

  return (
    <PageShell title="Wallet">
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-border bg-panel p-5">
          <div className="flex justify-between">
            <div>
              <p className="font-mono text-[9.5px] uppercase tracking-[2px] text-faint">
                Available
              </p>
              <p className="font-[family-name:var(--font-display)] text-2xl text-lime">
                {wallet.availableCredits}
              </p>
            </div>
            <div>
              <p className="font-mono text-[9.5px] uppercase tracking-[2px] text-faint">
                Staked
              </p>
              <p className="font-[family-name:var(--font-display)] text-2xl text-white">
                {wallet.stakedCredits}
              </p>
            </div>
          </div>

          {wallet.stakedBreakdown.length > 0 && (
            <div className="mt-4 flex flex-col gap-1.5 border-t border-[#22223a] pt-3">
              {wallet.stakedBreakdown.map((b) => (
                <div
                  key={b.shirtId}
                  className="flex justify-between text-xs text-muted"
                >
                  <span>Shirt {b.shirtId.slice(-6)}</span>
                  <span className="text-lime">{b.credits} credits</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-panel p-5 text-center">
          <p className="font-mono text-[9.5px] uppercase tracking-[2px] text-faint">
            Daily free swipes
          </p>
          <p className="mt-1 text-sm text-white">
            {wallet.freeSwipesRemaining} remaining &middot; {wallet.streakDays} day streak
          </p>
          <Button
            variant="lime"
            glow
            onClick={handleClaim}
            disabled={claiming}
            className="mt-3 w-full"
          >
            {claiming ? "Claiming…" : "Claim today's swipes"}
          </Button>
        </div>

        <div>
          <p className="mb-2 font-mono text-[9.5px] uppercase tracking-[2px] text-faint">
            Credit packs
          </p>
          <div className="flex flex-col gap-2">
            {wallet.creditPacks.map((pack, i) => (
              <button
                key={pack.stripePriceId || i}
                type="button"
                onClick={() => purchasePack(i)}
                disabled={loadingIndex !== null}
                className="flex items-center justify-between rounded-xl border border-border2 px-4 py-3 text-left transition-transform duration-[120ms] active:scale-95 disabled:opacity-60"
              >
                <span className="font-bold text-lime">{pack.credits} credits</span>
                <span className="font-mono text-sm text-white">
                  {loadingIndex === i ? "…" : `$${(pack.priceCents / 100).toFixed(2)}`}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-center font-mono text-[9.5px] uppercase tracking-[1px] text-faint">
            secure checkout via stripe
          </p>
        </div>

        <div>
          <p className="mb-2 font-mono text-[9.5px] uppercase tracking-[2px] text-faint">
            Ledger
          </p>
          <div className="flex flex-col gap-2">
            {ledger.results.map((entry) => (
              <div
                key={entry._id}
                className="flex items-center justify-between rounded-xl border border-border2 px-4 py-2.5 text-xs"
              >
                <span className="text-white">
                  {LEDGER_KIND_LABEL[entry.kind] ?? entry.kind}
                </span>
                <span className={entry.delta >= 0 ? "text-lime" : "text-pink"}>
                  {entry.delta >= 0 ? "+" : ""}
                  {entry.delta}
                </span>
              </div>
            ))}
            {ledger.results.length === 0 && (
              <p className="text-xs text-muted">No activity yet.</p>
            )}
          </div>
          {ledger.status === "CanLoadMore" && (
            <button
              type="button"
              onClick={() => ledger.loadMore(20)}
              className="mt-3 w-full text-center text-xs text-lime underline"
            >
              Load more
            </button>
          )}
        </div>
      </div>
    </PageShell>
  );
}
