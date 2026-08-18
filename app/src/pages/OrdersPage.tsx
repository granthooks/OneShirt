import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PageShell } from "../components/PageShell";
import { shirtGradient } from "../lib/shirtArt";
import { SignedOutState } from "../components/SignedOutState";
import { useCurrentUser } from "../hooks/useCurrentUser";

const STATUS_LABEL: Record<string, string> = {
  pending_info: "Awaiting size & address",
  submitting: "Submitting",
  in_production: "In production",
  shipped: "Shipped",
  delivered: "Delivered",
  canceled: "Canceled",
  failed: "Failed",
};

export default function OrdersPage() {
  const { isSignedIn } = useCurrentUser();
  const orders = useQuery(api.orders.myOrders, isSignedIn ? {} : "skip");

  if (!isSignedIn) {
    return (
      <PageShell title="Orders">
        <SignedOutState label="Log in to see your prize and purchase orders." />
      </PageShell>
    );
  }

  return (
    <PageShell title="Orders">
      {orders === undefined && <div />}

      {orders && orders.length === 0 && (
        <p className="text-sm text-muted">
          No orders yet. Win a draw or buy a shirt to see it here.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {orders?.map((order) => (
          <div
            key={order.id}
            className="flex gap-3 rounded-2xl border border-border bg-panel p-3"
          >
            <div
              className="h-[74px] w-[74px] shrink-0 rounded-xl"
              style={{
                background: order.webImageUrl
                  ? `center / cover no-repeat url(${order.webImageUrl})`
                  : shirtGradient(order.shirtId),
              }}
            />
            <div className="flex-1">
              <p className="font-bold text-white">{order.shirtName}</p>
              <p className="mt-0.5 text-xs text-muted">
                {order.type === "prize" ? "Prize win" : "Purchase"}
                {order.size ? ` · Size ${order.size}` : ""}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-full border border-dashed border-border2 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[1px] text-lime">
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>
              {order.trackingUrl && (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs text-lime underline"
                >
                  Track shipment{order.carrier ? ` (${order.carrier})` : ""}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
