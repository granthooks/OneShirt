import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { getConfig } from "./lib/config";
import { postLedger } from "./lib/ledger";

/** Internal query helpers for `convex/printify.ts` (Node-runtime action). */

export const getStorageUrl = internalQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const getOrderForSubmission = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;
    const shirt = await ctx.db.get(order.shirtId);
    if (!shirt) return null;
    const user = await ctx.db.get(order.userId);
    if (!user) return null;
    const config = await getConfig(ctx);
    return { order, shirt, user, config };
  },
});

export const getShirtPrintify = internalQuery({
  args: { shirtId: v.id("shirts") },
  handler: async (ctx, args) => {
    const shirt = await ctx.db.get(args.shirtId);
    if (!shirt?.printify) return null;
    return {
      productId: shirt.printify.productId,
      variants: shirt.printify.variants,
    };
  },
});

export const saveProductInfo = internalMutation({
  args: {
    shirtId: v.id("shirts"),
    productId: v.string(),
    blueprintId: v.number(),
    printProviderId: v.number(),
    variants: v.record(v.string(), v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.shirtId, {
      printify: {
        blueprintId: args.blueprintId,
        printProviderId: args.printProviderId,
        productId: args.productId,
        variants: args.variants,
      },
    });
  },
});

/** Orders in submitting/in_production with `updatedAt` older than `cutoff`. */
export const getStaleOrders = internalQuery({
  args: { cutoff: v.number() },
  handler: async (ctx, args) => {
    const submitting = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "submitting"))
      .collect();
    const inProduction = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "in_production"))
      .collect();
    return [...submitting, ...inProduction].filter(
      (o) => o.updatedAt < args.cutoff
    );
  },
});

export const applyStatusUpdate = internalMutation({
  args: {
    orderId: v.id("orders"),
    status: v.union(
      v.literal("in_production"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("failed")
    ),
    trackingNumber: v.optional(v.string()),
    trackingUrl: v.optional(v.string()),
    carrier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return;

    await ctx.db.patch(args.orderId, {
      status: args.status,
      trackingNumber: args.trackingNumber ?? order.trackingNumber,
      trackingUrl: args.trackingUrl ?? order.trackingUrl,
      carrier: args.carrier ?? order.carrier,
      updatedAt: Date.now(),
    });

    if (args.status === "shipped" || args.status === "delivered") {
      const shirt = await ctx.db.get(order.shirtId);
      await ctx.db.insert("notifications", {
        userId: order.userId,
        kind: "order_update",
        title:
          args.status === "shipped"
            ? `${shirt?.name ?? "Your order"} has shipped!`
            : `${shirt?.name ?? "Your order"} was delivered`,
        body:
          args.status === "shipped"
            ? args.trackingUrl
              ? `Track it here: ${args.trackingUrl}`
              : "Your order is on its way."
            : "Enjoy your new shirt!",
        orderId: args.orderId,
        read: false,
        emailed: false,
        createdAt: Date.now(),
      });
    } else if (args.status === "failed") {
      const admins = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("role"), "admin"))
        .collect();
      for (const admin of admins) {
        await ctx.db.insert("notifications", {
          userId: admin._id,
          kind: "order_update",
          title: "Printify order failed",
          body: `Order ${args.orderId} was canceled or payment was not received on Printify.`,
          orderId: args.orderId,
          read: false,
          emailed: false,
          createdAt: Date.now(),
        });
      }
    }
  },
});

/** Auto-cancel stale unpaid purchase orders (24h+, no Stripe payment). */
export const getStalePendingPurchases = internalQuery({
  args: { cutoff: v.number() },
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "pending_info"))
      .collect();
    return pending.filter(
      (o) => o.type === "purchase" && o.createdAt < args.cutoff
    );
  },
});

export const cancelStalePurchase = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order || order.status !== "pending_info" || order.type !== "purchase") {
      return;
    }

    // Restore any credits that were redeemed toward this order.
    if (order.creditsCentsApplied > 0) {
      const config = await getConfig(ctx);
      const firstPack = config.creditPacks[0];
      const creditCents =
        firstPack && firstPack.credits > 0
          ? firstPack.priceCents / firstPack.credits
          : 10;
      const creditsToRestore = Math.round(order.creditsCentsApplied / creditCents);
      if (creditsToRestore > 0) {
        await postLedger(ctx, {
          userId: order.userId,
          delta: creditsToRestore,
          kind: "admin_adjust",
          orderId: order._id,
          note: `Restored ${creditsToRestore} credits — unpaid order auto-canceled after 24h`,
        });
      }
    }

    await ctx.db.patch(order._id, { status: "canceled", updatedAt: Date.now() });
  },
});

export const markOrderSubmitted = internalMutation({
  args: { orderId: v.id("orders"), printifyOrderId: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      printifyOrderId: args.printifyOrderId,
      status: "in_production",
      updatedAt: Date.now(),
    });
  },
});

/**
 * Mark an order failed and notify every admin — Printify submission
 * failures must never be silent (docs/09-fulfillment-printify.md).
 */
export const markOrderFailed = internalMutation({
  args: { orderId: v.id("orders"), errorMessage: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return;

    await ctx.db.patch(args.orderId, {
      status: "failed",
      updatedAt: Date.now(),
    });

    const admins = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "admin"))
      .collect();

    for (const admin of admins) {
      await ctx.db.insert("notifications", {
        userId: admin._id,
        kind: "order_update",
        title: "Printify order submission failed",
        body: `Order ${args.orderId} failed to submit: ${args.errorMessage}`,
        orderId: args.orderId,
        read: false,
        emailed: false,
        createdAt: Date.now(),
      });
    }
  },
});
