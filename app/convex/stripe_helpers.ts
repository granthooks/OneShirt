import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { getUserOrNull } from "./lib/auth";
import { getConfig } from "./lib/config";
import { postLedger } from "./lib/ledger";

/**
 * Internal query helpers for `convex/stripe.ts`. Pulled into a separate
 * (non "use node") module because Convex actions running in the Node
 * runtime cannot define queries/mutations directly — the action calls
 * these via `ctx.runQuery`.
 */

export const getCallerUser = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await getUserOrNull(ctx);
  },
});

export const getConfigInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await getConfig(ctx);
  },
});

export const getOrderForCheckout = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;
    const shirt = await ctx.db.get(order.shirtId);
    return {
      userId: order.userId,
      stripeCentsCharged: order.stripeCentsCharged,
      shirtName: shirt?.name ?? "Shirt",
    };
  },
});

/**
 * Fulfill a completed credit-pack Stripe Checkout session. Idempotent on
 * `stripePaymentIntentId` via the `creditLedger.by_stripePaymentIntentId`
 * index — safe to call more than once for the same payment intent (Stripe
 * may redeliver the webhook).
 */
export const fulfillPack = internalMutation({
  args: {
    userId: v.id("users"),
    packIndex: v.number(),
    stripePaymentIntentId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("creditLedger")
      .withIndex("by_stripePaymentIntentId", (q) =>
        q.eq("stripePaymentIntentId", args.stripePaymentIntentId)
      )
      .first();
    if (existing) {
      // Already fulfilled — webhook redelivery, no-op.
      return;
    }

    const config = await getConfig(ctx);
    const pack = config.creditPacks[args.packIndex];
    if (!pack) {
      throw new ConvexError(
        `Cannot fulfill unknown pack index ${args.packIndex}`
      );
    }

    await postLedger(ctx, {
      userId: args.userId,
      delta: pack.credits,
      kind: "purchase",
      stripePaymentIntentId: args.stripePaymentIntentId,
      note: `Purchased ${pack.credits} credits ($${(pack.priceCents / 100).toFixed(2)})`,
    });

    await ctx.db.insert("notifications", {
      userId: args.userId,
      kind: "credits",
      title: "Credits added",
      body: `${pack.credits} credits were added to your wallet.`,
      read: false,
      emailed: false,
      createdAt: Date.now(),
    });
  },
});
