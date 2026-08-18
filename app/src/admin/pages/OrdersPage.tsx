import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { shirtGradient } from "../../lib/shirtArt";
import { StatusPill } from "../components/StatusPill";

export default function OrdersPage() {
  const orders = useQuery(api.admin.listOrders, {});

  if (orders === undefined) {
    return (
      <p className="font-mono text-xs uppercase tracking-[2px] text-faint">
        Loading…
      </p>
    );
  }

  if (orders.length === 0) {
    return <p className="text-xs text-muted">No orders yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {orders.map((order) => (
        <div
          key={order._id}
          className="flex gap-4 rounded-2xl border border-border bg-panel p-4"
        >
          <div
            className="h-[90px] w-[74px] shrink-0 rounded-xl"
            style={{
              background: order.webImageUrl
                ? `center / cover no-repeat url(${order.webImageUrl})`
                : shirtGradient(order.shirtId),
            }}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-sm font-bold text-white">
                {order.shirtName}
              </p>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[1px] ${
                  order.type === "prize"
                    ? "bg-lime/20 text-lime"
                    : "bg-cyan/20 text-cyan"
                }`}
              >
                {order.type}
              </span>
            </div>
            <p className="font-mono text-[9.5px] uppercase tracking-[1px] text-muted">
              won by {order.userName} &middot;{" "}
              {new Date(order.createdAt).toLocaleDateString()}
            </p>
            <p className="font-mono text-[10px] text-lime">
              {order.addressSnapshot.address1}, {order.addressSnapshot.city}{" "}
              {order.addressSnapshot.region} {order.addressSnapshot.zip}
            </p>
            <div className="mt-auto flex items-center gap-2">
              <span className="rounded-full border border-border2 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[1px] text-white">
                {order.size}
              </span>
              <StatusPill status={order.status} kind="order" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
