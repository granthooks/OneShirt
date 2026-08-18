import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PageShell } from "../components/PageShell";
import { shirtGradient } from "../lib/shirtArt";
import { SignedOutState } from "../components/SignedOutState";
import { useCurrentUser } from "../hooks/useCurrentUser";

const STATUS_LABEL: Record<string, string> = {
  active: "Bidding open",
  drawing: "Drawing now",
  won: "Won",
  expired: "Expired",
  archived: "Archived",
};

export default function BidsPage() {
  const { isSignedIn } = useCurrentUser();
  const entries = useQuery(api.bids.myEntries, isSignedIn ? {} : "skip");

  if (!isSignedIn) {
    return (
      <PageShell title="My Bids">
        <SignedOutState label="Log in to see the shirts you've bid on." />
      </PageShell>
    );
  }

  return (
    <PageShell title="My Bids">
      {entries === undefined && <div />}

      {entries && entries.length === 0 && (
        <p className="text-sm text-muted">
          You haven&apos;t bid on anything yet. Head back to the deck and
          swipe right on a design you&apos;d wear.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {entries?.map((entry) => {
          const progressPct =
            entry.bidThreshold > 0
              ? Math.min(100, (entry.bidCount / entry.bidThreshold) * 100)
              : 0;
          return (
            <div
              key={entry.id}
              className="flex gap-3 rounded-2xl border border-border bg-panel p-3"
            >
              <div
                className="h-16 w-16 shrink-0 rounded-xl"
                style={{
                  background: entry.webImageUrl
                    ? `center / cover no-repeat url(${entry.webImageUrl})`
                    : shirtGradient(entry.id),
                }}
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-white">{entry.name}</p>
                  {entry.status === "drawing" && (
                    <span className="rounded-full bg-pink/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[1px] text-pink">
                      Drawing
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-lime">
                  You have {entry.myEntries} {entry.myEntries === 1 ? "entry" : "entries"}
                </p>
                <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[1px] text-lime">
                  <span>{STATUS_LABEL[entry.status] ?? entry.status}</span>
                  <span>
                    {entry.bidCount} / {entry.bidThreshold}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/[.14]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${progressPct}%`,
                      background: "linear-gradient(90deg,#c6ff4d,#00ffa3)",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
