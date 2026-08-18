import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { getConfig } from "./lib/config";
import { postLedger } from "./lib/ledger";

/**
 * Caller's orders (prize + purchase), most recent first, with the shirt's
 * name/image joined in for display on the /orders page.
 */
export const myOrders = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    const results = [];
    for (const order of orders) {
      const shirt = await ctx.db.get(order.shirtId);
      const webImageUrl = shirt?.webImageId
        ? await ctx.storage.getUrl(shirt.webImageId)
        : null;
      results.push({
        id: order._id,
        shirtId: order.shirtId,
        shirtName: shirt?.name ?? "Unknown shirt",
        webImageUrl,
        type: order.type,
        size: order.size,
        status: order.status,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        carrier: order.carrier,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      });
    }
    return results;
  },
});

/**
 * Effective cents-per-credit, derived from the first configured credit
 * pack (same convention as `admin.activateShirt`'s prize-load math).
 */
function creditValueCents(config: Awaited<ReturnType<typeof getConfig>>): number {
  const firstPack = config.creditPacks[0];
  return firstPack && firstPack.credits > 0
    ? firstPack.priceCents / firstPack.credits
    : 10;
}

/**
 * Buy It Now: start a retail purchase of an active/won shirt.
 *
 * Applies the caller's available credits first, then staked credits on
 * *this* shirt (withdrawing the corresponding entries oldest-first and
 * decrementing the shirt's bid/entry counts) up to the retail price. Per
 * invariant 4 (05-backend-functions.md): if the shirt is `drawing`,
 * staked credits on it are locked — reject with SHIRT_DRAWING rather than
 * withdrawing from an in-flight draw. Credits used are `redeem`d
 * (unstake+redeem semantics per 07-payments-credits.md). Any remaining
 * cents are due via Stripe Checkout; if the order is fully covered by
 * credits, it's finalized immediately and scheduled for Printify
 * submission.
 */
export const startPurchase = mutation({
  args: {
    shirtId: v.id("shirts"),
    size: v.string(),
    addressId: v.id("addresses"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const config = await getConfig(ctx);

    const shirt = await ctx.db.get(args.shirtId);
    if (!shirt) {
      throw new ConvexError("SHIRT_NOT_FOUND");
    }
    if (shirt.status !== "active" && shirt.status !== "won") {
      throw new ConvexError("SHIRT_NOT_PURCHASABLE");
    }

    const address = await ctx.db.get(args.addressId);
    if (!address || address.userId !== user._id) {
      throw new ConvexError("ADDRESS_NOT_FOUND");
    }

    const retailCents = shirt.retailPriceCents;
    const creditCents = creditValueCents(config);

    // Available credits first.
    const availableValueCents = Math.round(user.availableCredits * creditCents);
    const fromAvailableCents = Math.min(availableValueCents, retailCents);
    const fromAvailableCredits =
      creditCents > 0 ? Math.round(fromAvailableCents / creditCents) : 0;

    let remainingCents = retailCents - fromAvailableCents;

    // Then staked credits on THIS shirt, oldest entries withdrawn first.
    const stakedEntries = await ctx.db
      .query("entries")
      .withIndex("by_shirtId_userId", (q) =>
        q.eq("shirtId", shirt._id).eq("userId", user._id)
      )
      .filter((q) =>
        q.and(q.eq(q.field("status"), "active"), q.eq(q.field("source"), "paid"))
      )
      .order("asc")
      .collect();

    const stakedValueCents = Math.round(stakedEntries.length * creditCents);
    const fromStakedCents = Math.min(remainingCents, stakedValueCents);
    const fromStakedCredits =
      creditCents > 0 ? Math.ceil(fromStakedCents / creditCents) : 0;

    // Invariant 4 (05-backend-functions.md): staked credits on a shirt
    // that's currently `drawing` are locked and must not be withdrawn.
    // We only reach here for shirt.status "active" or "won" (checked
    // above), so this can't actually fire today — the check up top is
    // the enforcement point; SHIRT_DRAWING would be its rejection.

    remainingCents -= fromStakedCents;

    const totalCreditsApplied = fromAvailableCredits + fromStakedCredits;
    const creditsCentsApplied = Math.round(totalCreditsApplied * creditCents);
    const stripeCentsCharged = Math.max(0, retailCents - creditsCentsApplied);

    // Withdraw staked entries (oldest first) up to fromStakedCredits.
    const entriesToWithdraw = stakedEntries.slice(0, fromStakedCredits);
    for (const entry of entriesToWithdraw) {
      await ctx.db.patch(entry._id, { status: "withdrawn" });
    }
    if (entriesToWithdraw.length > 0) {
      const withdrawnWeight = entriesToWithdraw.reduce((sum, e) => sum + e.weight, 0);
      await ctx.db.patch(shirt._id, {
        bidCount: Math.max(0, shirt.bidCount - entriesToWithdraw.length),
        entryCount: Math.max(0, shirt.entryCount - withdrawnWeight),
      });
    }

    // Post the redeem ledger row(s). `redeem` only debits `available`, so
    // staked credits must be unstaked (staked -> available) before being
    // redeemed (available -> 0), matching the ledger kind semantics in
    // lib/ledger.ts.
    if (fromStakedCredits > 0) {
      await postLedger(ctx, {
        userId: user._id,
        delta: fromStakedCredits,
        kind: "unstake",
        shirtId: shirt._id,
        note: `Unstaked ${fromStakedCredits} entr${fromStakedCredits === 1 ? "y" : "ies"} to redeem toward purchase`,
      });
    }
    if (totalCreditsApplied > 0) {
      await postLedger(ctx, {
        userId: user._id,
        delta: totalCreditsApplied,
        kind: "redeem",
        shirtId: shirt._id,
        note: `Redeemed ${totalCreditsApplied} credit${totalCreditsApplied === 1 ? "" : "s"} toward purchase`,
      });
    }

    const addressSnapshot = {
      firstName: address.firstName,
      lastName: address.lastName,
      address1: address.address1,
      address2: address.address2,
      city: address.city,
      region: address.region,
      zip: address.zip,
      country: address.country,
      phone: address.phone,
    };

    const orderId = await ctx.db.insert("orders", {
      userId: user._id,
      shirtId: shirt._id,
      type: "purchase",
      size: args.size,
      addressSnapshot,
      creditsCentsApplied,
      stripeCentsCharged,
      status: stripeCentsCharged === 0 ? "submitting" : "pending_info",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link the redeem ledger row to this order for reporting/audit.
    if (totalCreditsApplied > 0) {
      const redeemRow = await ctx.db
        .query("creditLedger")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .order("desc")
        .first();
      if (redeemRow && redeemRow.kind === "redeem" && !redeemRow.orderId) {
        await ctx.db.patch(redeemRow._id, { orderId });
      }
    }

    if (stripeCentsCharged === 0) {
      await ctx.scheduler.runAfter(0, internal.printify.submitOrder, { orderId });
      return { needsPayment: false as const, orderId };
    }

    return { needsPayment: true as const, orderId };
  },
});

/**
 * Internal: called from the Stripe webhook once a purchase-order's cash
 * remainder is confirmed paid. Idempotent — only fires the Printify
 * submission if the order is still `pending_info`.
 */
export const finalizePurchase = internalMutation({
  args: {
    orderId: v.id("orders"),
    stripePaymentIntentId: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return;
    if (order.status !== "pending_info") {
      // Already finalized (webhook redelivery) — no-op.
      return;
    }

    await ctx.db.patch(order._id, {
      status: "submitting",
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.printify.submitOrder, {
      orderId: order._id,
    });
  },
});
