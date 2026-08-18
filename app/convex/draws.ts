import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { postLedger } from "./lib/ledger";

/**
 * Internal action, scheduled by `bids.placeBid` when a shirt crosses its
 * bid threshold. Picks a winner uniformly at random (weighted by entry
 * weight) using a CSPRNG, then commits the result via `finalize`.
 */
export const execute = internalAction({
  args: { shirtId: v.id("shirts") },
  handler: async (ctx, args) => {
    const shirt = await ctx.runQuery(internal.draws.getShirtForDraw, {
      shirtId: args.shirtId,
    });
    // Idempotency: only proceed if still in "drawing".
    if (!shirt || shirt.status !== "drawing") {
      return;
    }

    const entries = await ctx.runQuery(internal.draws.getActiveEntries, {
      shirtId: args.shirtId,
    });
    if (entries.length === 0) {
      // Nothing to draw from (shouldn't happen if threshold > 0); bail
      // out without finalizing so an admin can investigate.
      return;
    }

    const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);

    // CSPRNG: draw a random 32-bit value, map to [0, totalWeight).
    const randomBuffer = new Uint32Array(1);
    crypto.getRandomValues(randomBuffer);
    const randomValue = randomBuffer[0];
    const fraction = randomValue / 0xffffffff;
    const target = fraction * totalWeight;

    let cumulative = 0;
    let winningEntry = entries[entries.length - 1];
    for (const entry of entries) {
      cumulative += entry.weight;
      if (target < cumulative) {
        winningEntry = entry;
        break;
      }
    }

    await ctx.runMutation(internal.draws.finalize, {
      shirtId: args.shirtId,
      winningEntryId: winningEntry._id,
      randomValue: String(randomValue),
    });
  },
});

/** Internal: load the shirt for the draw action's idempotency check. */
export const getShirtForDraw = internalQuery({
  args: { shirtId: v.id("shirts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.shirtId);
  },
});

/** Internal: load all active entries for a shirt. */
export const getActiveEntries = internalQuery({
  args: { shirtId: v.id("shirts") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("entries")
      .withIndex("by_shirtId", (q) => q.eq("shirtId", args.shirtId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
  },
});

/**
 * Internal mutation: commits the draw result. Inserts the `draws` audit
 * row, transitions shirt + entries, unstakes all paid entries (winner
 * included), notifies entrants, and creates the winner's prize order.
 */
export const finalize = internalMutation({
  args: {
    shirtId: v.id("shirts"),
    winningEntryId: v.id("entries"),
    randomValue: v.string(),
  },
  handler: async (ctx, args) => {
    const shirt = await ctx.db.get(args.shirtId);
    if (!shirt || shirt.status !== "drawing") {
      // Idempotency guard: already finalized (or state changed under us).
      return;
    }

    const winningEntry = await ctx.db.get(args.winningEntryId);
    if (!winningEntry) {
      throw new Error(`Winning entry ${args.winningEntryId} not found`);
    }
    const winnerId = winningEntry.userId;

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_shirtId", (q) => q.eq("shirtId", args.shirtId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const totalEntries = entries.reduce((sum, e) => sum + e.weight, 0);
    const distinctBidders = new Set(entries.map((e) => e.userId as unknown as string));

    const drawId = await ctx.db.insert("draws", {
      shirtId: args.shirtId,
      totalEntries,
      totalBidders: distinctBidders.size,
      winningEntryId: args.winningEntryId,
      winnerId,
      randomValue: args.randomValue,
      executedAt: Date.now(),
    });

    // Unstake all paid entries, one ledger row per user (winner included).
    const paidCountByUser = new Map<string, number>();
    for (const entry of entries) {
      if (entry.source !== "paid") continue;
      const key = entry.userId as unknown as string;
      paidCountByUser.set(key, (paidCountByUser.get(key) ?? 0) + 1);
    }
    for (const [userIdStr, count] of paidCountByUser.entries()) {
      await postLedger(ctx, {
        userId: userIdStr as Id<"users">,
        delta: count,
        kind: "unstake",
        shirtId: args.shirtId,
        note: `Unstaked ${count} entr${count === 1 ? "y" : "ies"} after draw`,
      });
    }

    // Transition entries to won/lost and notify entrants.
    for (const entry of entries) {
      const isWinner = entry._id === args.winningEntryId;
      await ctx.db.patch(entry._id, { status: isWinner ? "won" : "lost" });
    }

    for (const userIdStr of distinctBidders) {
      const userId = userIdStr as Id<"users">;
      const isWinner = userId === winnerId;
      await ctx.db.insert("notifications", {
        userId,
        kind: isWinner ? "draw_result_win" : "draw_result_lose",
        title: isWinner ? `You won ${shirt.name}!` : `${shirt.name} has been drawn`,
        body: isWinner
          ? `Congratulations! You won ${shirt.name}. We'll email you to confirm shipping details.`
          : `${shirt.name} was drawn and your credits have been returned to your available balance.`,
        shirtId: args.shirtId,
        read: false,
        emailed: false,
        createdAt: Date.now(),
      });
    }

    // Create the winner's prize order.
    const winner = await ctx.db.get(winnerId);
    const defaultAddress = await ctx.db
      .query("addresses")
      .withIndex("by_userId", (q) => q.eq("userId", winnerId))
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();

    const hasSizeAndAddress = Boolean(winner?.shirtSize) && Boolean(defaultAddress);

    const addressSnapshot = defaultAddress
      ? {
          firstName: defaultAddress.firstName,
          lastName: defaultAddress.lastName,
          address1: defaultAddress.address1,
          address2: defaultAddress.address2,
          city: defaultAddress.city,
          region: defaultAddress.region,
          zip: defaultAddress.zip,
          country: defaultAddress.country,
          phone: defaultAddress.phone,
        }
      : {
          firstName: "",
          lastName: "",
          address1: "",
          city: "",
          region: "",
          zip: "",
          country: "US",
        };

    const orderId = await ctx.db.insert("orders", {
      userId: winnerId,
      shirtId: args.shirtId,
      type: "prize",
      size: winner?.shirtSize ?? "",
      addressSnapshot,
      creditsCentsApplied: 0,
      stripeCentsCharged: 0,
      status: hasSizeAndAddress ? "submitting" : "pending_info",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.patch(args.shirtId, {
      status: "won",
      winnerId,
      drawId,
    });

    if (hasSizeAndAddress) {
      await ctx.scheduler.runAfter(0, internal.printify.submitOrder, { orderId });
    }

    return { drawId, orderId, winnerId };
  },
});

/**
 * Public: recent real winners (first name + shirt name + date) for social
 * proof. No fabricated data — only actual `draws` rows.
 */
export const recentWinners = query({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit, 50));
    const draws = await ctx.db.query("draws").order("desc").take(limit);

    const results = [];
    for (const draw of draws) {
      const [winner, shirt] = await Promise.all([
        ctx.db.get(draw.winnerId),
        ctx.db.get(draw.shirtId),
      ]);
      if (!winner || !shirt) continue;
      results.push({
        winnerFirstName: winner.name.trim().split(/\s+/)[0] ?? "A player",
        shirtName: shirt.name,
        executedAt: draw.executedAt,
      });
    }
    return results;
  },
});

export type DrawDoc = Doc<"draws">;
