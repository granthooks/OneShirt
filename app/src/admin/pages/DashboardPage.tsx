import type { ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { shirtGradient } from "../../lib/shirtArt";
import { ProgressBar } from "../components/ProgressBar";

const SOURCE_LABEL: Record<string, string> = {
  paid: "bid on",
  free: "bid on",
};

export default function DashboardPage() {
  const stats = useQuery(api.admin.stats, {});

  if (stats === undefined) {
    return (
      <p className="font-mono text-xs uppercase tracking-[2px] text-faint">
        Loading…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats.totalUsers} />
        <StatCard label="Active Shirts" value={stats.activeShirts} />
        <StatCard label="Bids Today" value={stats.totalBidsToday} />
        <StatCard label="Credits Outstanding" value={stats.creditsOutstanding} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Panel title="Top Shirts">
          {stats.topShirts.length === 0 && <EmptyRow />}
          <div className="flex flex-col gap-3">
            {stats.topShirts.map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <div
                  className="h-10 w-10 shrink-0 rounded-lg"
                  style={{
                    background: s.webImageUrl
                      ? `center / cover no-repeat url(${s.webImageUrl})`
                      : shirtGradient(s.id),
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">{s.name}</p>
                  <ProgressBar pct={s.progress * 100} />
                </div>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-[1px] text-lime">
                  {s.bidCount}/{s.bidThreshold}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Top Users">
          {stats.topUsers.length === 0 && <EmptyRow />}
          <div className="flex flex-col gap-3">
            {stats.topUsers.map((u, i) => (
              <div key={u.id} className="flex items-center gap-3">
                <span className="w-5 shrink-0 font-mono text-xs text-faint">
                  #{i + 1}
                </span>
                <div
                  className="h-8 w-8 shrink-0 rounded-full"
                  style={{
                    background: u.avatarUrl
                      ? `center / cover no-repeat url(${u.avatarUrl})`
                      : "linear-gradient(135deg,#ff2d78,#7b2ff7)",
                  }}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-white">
                  {u.name}
                </span>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-[1px] text-lime">
                  {u.entryCount} bids
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Recent Activity">
        {stats.recentActivity.length === 0 && <EmptyRow />}
        <div className="flex flex-col gap-2.5">
          {stats.recentActivity.map((a, i) => (
            <div key={i} className="flex items-center justify-between">
              <p className="text-sm text-white">
                <span className="font-bold">{a.userName}</span>{" "}
                {SOURCE_LABEL[a.source] ?? "bid on"}{" "}
                <span className="italic text-muted">{a.shirtName}</span>
              </p>
              <span className="shrink-0 font-mono text-[9.5px] uppercase tracking-[1px] text-faint">
                {new Date(a.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-panel p-5">
      <p className="font-mono text-[9.5px] uppercase tracking-[2px] text-faint">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-[28px] text-lime">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-panel p-5">
      <p className="mb-4 font-mono text-[9.5px] uppercase tracking-[2px] text-faint">
        {title}
      </p>
      {children}
    </div>
  );
}

function EmptyRow() {
  return <p className="text-xs text-muted">Nothing here yet.</p>;
}
