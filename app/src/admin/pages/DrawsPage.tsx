import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

/** Read-only audit log — evidence-of-fairness per docs/11-admin.md §6. */
export default function DrawsPage() {
  const draws = useQuery(api.admin.listDraws, {});

  return (
    <div className="rounded-2xl border border-border bg-panel">
      <div className="grid grid-cols-[1fr_1fr_110px_110px_1fr_170px] items-center gap-4 border-b border-[#22223a] px-5 py-3 font-mono text-[9.5px] uppercase tracking-[2px] text-faint">
        <span>Shirt</span>
        <span>Winner</span>
        <span>Entries</span>
        <span>Bidders</span>
        <span>Random Value</span>
        <span>Executed At</span>
      </div>

      {draws === undefined && (
        <p className="px-5 py-6 text-xs text-muted">Loading…</p>
      )}
      {draws?.length === 0 && (
        <p className="px-5 py-6 text-xs text-muted">No draws executed yet.</p>
      )}

      {draws?.map((draw) => (
        <div
          key={draw._id}
          className="grid grid-cols-[1fr_1fr_110px_110px_1fr_170px] items-center gap-4 border-b border-[#22223a] px-5 py-3 font-mono text-[10.5px] last:border-b-0 hover:bg-[#1a1a30]"
        >
          <span className="truncate text-white">{draw.shirtName}</span>
          <span className="truncate text-lime">{draw.winnerName}</span>
          <span className="text-white">{draw.totalEntries}</span>
          <span className="text-white">{draw.totalBidders}</span>
          <span className="truncate text-faint" title={draw.randomValue}>
            {draw.randomValue}
          </span>
          <span className="text-faint">
            {new Date(draw.executedAt).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
