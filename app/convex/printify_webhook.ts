import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const PRINTIFY_STATUS_MAP: Record<
  string,
  "in_production" | "shipped" | "delivered" | "failed"
> = {
  pending: "in_production",
  "on-hold": "in_production",
  "in-production": "in_production",
  "sending-to-production": "in_production",
  fulfilled: "shipped",
  shipped: "shipped",
  delivered: "delivered",
  canceled: "failed",
  "payment-not-received": "failed",
};

/**
 * Apply a Printify `order:updated` webhook event to our `orders` table.
 * Looks the order up by `printifyOrderId` (fallback to `external_id`,
 * which we set to the Convex order id string at submission time), maps
 * the Printify status to ours, and delegates the actual patch/notify to
 * `printify_helpers.applyStatusUpdate` (shared with the daily
 * reconciliation cron).
 */
export const applyWebhookUpdate = internalMutation({
  args: {
    printifyOrderId: v.optional(v.string()),
    externalId: v.optional(v.string()),
    printifyStatus: v.string(),
    trackingNumber: v.optional(v.string()),
    trackingUrl: v.optional(v.string()),
    carrier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const mapped = PRINTIFY_STATUS_MAP[args.printifyStatus];
    if (!mapped) return;

    let orderId = null;

    if (args.printifyOrderId) {
      const order = await ctx.db
        .query("orders")
        .withIndex("by_printifyOrderId", (q) =>
          q.eq("printifyOrderId", args.printifyOrderId!)
        )
        .first();
      if (order) orderId = order._id;
    }

    if (!orderId && args.externalId) {
      const candidate = await ctx.db.get(args.externalId as never);
      if (candidate && "shirtId" in candidate && "userId" in candidate) {
        orderId = candidate._id as typeof orderId;
      }
    }

    if (!orderId) return;

    await ctx.runMutation(internal.printify_helpers.applyStatusUpdate, {
      orderId,
      status: mapped,
      trackingNumber: args.trackingNumber,
      trackingUrl: args.trackingUrl,
      carrier: args.carrier,
    });
  },
});
