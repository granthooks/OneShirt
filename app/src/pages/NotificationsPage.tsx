import { useMutation, usePaginatedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PageShell } from "../components/PageShell";
import { SignedOutState } from "../components/SignedOutState";
import { useCurrentUser } from "../hooks/useCurrentUser";

const KIND_ICON: Record<string, string> = {
  draw_imminent: "⚡",
  draw_result_win: "🏆",
  draw_result_lose: "🎟️",
  expiry_refund: "↩️",
  order_update: "📦",
  credits: "🪙",
};

export default function NotificationsPage() {
  const { isSignedIn } = useCurrentUser();
  const { results, status, loadMore } = usePaginatedQuery(
    api.notifications.list,
    isSignedIn ? {} : "skip",
    { initialNumItems: 20 }
  );
  const markRead = useMutation(api.notifications.markRead);

  if (!isSignedIn) {
    return (
      <PageShell title="Notifications">
        <SignedOutState label="Log in to see your notifications." />
      </PageShell>
    );
  }

  return (
    <PageShell title="Notifications">
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => void markRead({})}
          className="text-xs text-lime underline"
        >
          Mark all read
        </button>
      </div>

      {results.length === 0 && (
        <p className="text-sm text-muted">No notifications yet.</p>
      )}

      <div className="flex flex-col gap-2">
        {results.map((n) => (
          <button
            key={n._id}
            type="button"
            onClick={() => {
              if (!n.read) void markRead({ notificationId: n._id });
            }}
            className={`flex gap-3 rounded-2xl border p-3 text-left ${
              n.read ? "border-border bg-panel" : "border-lime bg-panel"
            }`}
          >
            <span className="text-lg">{KIND_ICON[n.kind] ?? "🔔"}</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">{n.title}</p>
              <p className="mt-0.5 text-xs text-muted">{n.body}</p>
            </div>
            {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-lime" />}
          </button>
        ))}
      </div>

      {status === "CanLoadMore" && (
        <button
          type="button"
          onClick={() => loadMore(20)}
          className="mt-3 w-full text-center text-xs text-lime underline"
        >
          Load more
        </button>
      )}
    </PageShell>
  );
}
