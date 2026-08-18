import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Bottom marquee. Real data only (draws.recentWinners) — never fabricate
 * ambient activity. Falls back to a static "new drops" strip when there is
 * no real event history yet.
 */
export function Ticker() {
  const winners = useQuery(api.draws.recentWinners, { limit: 12 });

  const items =
    winners && winners.length > 0
      ? winners.map(
          (w) => `▲ ${w.winnerFirstName.toUpperCase()} WON ${w.shirtName.toUpperCase()}`
        )
      : ["NEW DROPS COMING"];

  const content = items.join("     ·     ");

  return (
    <div className="shrink-0 overflow-hidden border-t border-[#22223a] py-2">
      <div className="flex w-max whitespace-nowrap" style={{ animation: "tick 20s linear infinite" }}>
        <span className="px-4 font-mono text-[9.5px] uppercase tracking-[2px] text-lime">
          {content}
        </span>
        <span className="px-4 font-mono text-[9.5px] uppercase tracking-[2px] text-lime">
          {content}
        </span>
      </div>
    </div>
  );
}
