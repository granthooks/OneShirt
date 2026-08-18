import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { getConfig } from "./lib/config";
import { postLedger } from "./lib/ledger";

const MAX_BID_COUNT = 25;

/**
 * Place one or more bids (swipe right, or a multi-bid quantity) on an
 * active shirt in a single mutation. Per-entry logic matches the original
 * single-bid contract in docs/05-backend-functions.md §placeBid, looped:
 * free swipes consumed first, then credits; early-bird weight decrements
 * per entry; the per-user entry cap and threshold-crossing are evaluated
 * against the whole batch.
 *
 * All-or-nothing on funding and on the cap: if the caller can't cover
 * `count` entries (free swipes + available credits) or `count` would
 * exceed their remaining per-shirt cap, nothing is placed and a
 * ConvexError is thrown (NO_CREDITS / ENTRY_CAP_REACHED) so the UI can
 * show the right guard before anything is charged.
 *
 * If the shirt's threshold is crossed partway through the batch, placement
 * stops there — entries past the threshold are neither placed nor
 * charged — and the shirt transitions to `drawing` once, as before.
 */
export const placeBid = mutation({
  args: { shirtId: v.id("shirts"), count: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const config = await getConfig(ctx);
    const requestedCount = Math.max(1, Math.min(Math.floor(args.count ?? 1), MAX_BID_COUNT));

    // 1. Load shirt; require active.
    const shirt = await ctx.db.get(args.shirtId);
    if (!shirt || shirt.status !== "active") {
      throw new ConvexError("SHIRT_NOT_ACTIVE");
    }

    // 2. Enforce per-user entry cap (active entries only) for the batch.
    const existingActive = await ctx.db
      .query("entries")
      .withIndex("by_shirtId_userId", (q) =>
        q.eq("shirtId", shirt._id).eq("userId", user._id)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    const remainingCap = shirt.perUserEntryCap - existingActive.length;
    if (remainingCap <= 0) {
      throw new ConvexError({ code: "ENTRY_CAP_REACHED", remainingCap: 0 });
    }
    if (requestedCount > remainingCap) {
      throw new ConvexError({ code: "ENTRY_CAP_REACHED", remainingCap });
    }

    // 3. All-or-nothing funding check: free swipes first, then credits.
    const freeSwipesToUse = Math.min(user.freeSwipesRemaining, requestedCount);
    const creditsNeeded = requestedCount - freeSwipesToUse;
    if (creditsNeeded > user.availableCredits) {
      throw new ConvexError("NO_CREDITS");
    }

    // 4. Place entries one at a time so early-bird weight and the
    // threshold-crossing check are correct per-entry; stop early if the
    // shirt crosses its threshold mid-batch.
    let freeSwipesRemaining = user.freeSwipesRemaining;
    let availableCredits = user.availableCredits;
    let stakedCredits = user.stakedCredits;
    let bidCount = shirt.bidCount;
    let entryCount = shirt.entryCount;
    let earlyBirdRemaining = shirt.earlyBirdRemaining;
    let freeUsed = 0;
    let paidUsed = 0;
    let placedCount = 0;
    let becameDrawing = false;

    for (let i = 0; i < requestedCount; i++) {
      if (bidCount >= shirt.bidThreshold) break;

      let usedFreeSwipe = false;
      let ledgerId: Id<"creditLedger"> | undefined;

      if (freeSwipesRemaining > 0) {
        usedFreeSwipe = true;
        freeSwipesRemaining -= 1;
        freeUsed += 1;
      } else {
        const insertedLedgerId = await postLedger(ctx, {
          userId: user._id,
          delta: -1,
          kind: "stake",
          shirtId: shirt._id,
        });
        ledgerId = insertedLedgerId;
        availableCredits -= 1;
        stakedCredits += 1;
        paidUsed += 1;
      }

      const weight: 1 | 2 = earlyBirdRemaining > 0 ? (config.earlyBirdWeight as 1 | 2) : 1;
      if (earlyBirdRemaining > 0) {
        earlyBirdRemaining -= 1;
      }

      await ctx.db.insert("entries", {
        shirtId: shirt._id,
        userId: user._id,
        weight,
        source: usedFreeSwipe ? "free" : "paid",
        ledgerId,
        status: "active",
        createdAt: Date.now(),
      });

      bidCount += 1;
      entryCount += weight;
      placedCount += 1;

      if (bidCount >= shirt.bidThreshold) {
        becameDrawing = true;
        break;
      }
    }

    // 5. Persist the free-swipe balance patch (postLedger already patched
    // available/staked credits per paid entry above).
    if (freeUsed > 0) {
      await ctx.db.patch(user._id, { freeSwipesRemaining });
    }

    // 6. Commit shirt-level counters once, and — if the batch crossed the
    // threshold — transition to drawing exactly as the single-bid path did.
    if (becameDrawing) {
      await ctx.db.patch(shirt._id, {
        earlyBirdRemaining,
        bidCount,
        entryCount,
        status: "drawing" as const,
        drawingAt: Date.now(),
      });

      await ctx.scheduler.runAfter(
        config.drawDelayMinutes * 60 * 1000,
        internal.draws.execute,
        { shirtId: shirt._id }
      );

      // Notify all distinct entrants that the draw is imminent.
      const allEntries = await ctx.db
        .query("entries")
        .withIndex("by_shirtId", (q) => q.eq("shirtId", shirt._id))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();
      const notifiedUsers = new Set<string>();
      for (const entry of allEntries) {
        const key = entry.userId as unknown as string;
        if (notifiedUsers.has(key)) continue;
        notifiedUsers.add(key);
        await ctx.db.insert("notifications", {
          userId: entry.userId,
          kind: "draw_imminent",
          title: `${shirt.name} is drawing soon!`,
          body: `${shirt.name} hit its bid threshold and will draw a winner in ${config.drawDelayMinutes} minutes.`,
          shirtId: shirt._id,
          read: false,
          emailed: false,
          createdAt: Date.now(),
        });
      }
    } else if (placedCount > 0) {
      await ctx.db.patch(shirt._id, {
        earlyBirdRemaining,
        bidCount,
        entryCount,
      });
    }

    const myEntries = existingActive.length + placedCount;

    return {
      bidCount,
      myEntries,
      becameDrawing,
      usedFreeSwipe: freeUsed > 0,
      freeSwipesRemaining,
      availableCredits,
      stakedCredits,
      placedCount,
      freeUsed,
      paidUsed,
    };
  },
});

/**
 * Shirts the caller holds active entries on, with live progress, sorted
 * closest-to-draw (highest bidCount/bidThreshold ratio first).
 */
export const myEntries = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const entriesByShirt = new Map<string, number>();
    for (const entry of entries) {
      const key = entry.shirtId as unknown as string;
      entriesByShirt.set(key, (entriesByShirt.get(key) ?? 0) + 1);
    }

    const results = [];
    for (const [shirtIdStr, myEntryCount] of entriesByShirt.entries()) {
      const shirt = await ctx.db.get(shirtIdStr as (typeof entries)[number]["shirtId"]);
      if (!shirt) continue;
      const webImageUrl = shirt.webImageId
        ? await ctx.storage.getUrl(shirt.webImageId)
        : null;
      results.push({
        id: shirt._id,
        name: shirt.name,
        webImageUrl,
        status: shirt.status,
        bidCount: shirt.bidCount,
        bidThreshold: shirt.bidThreshold,
        myEntries: myEntryCount,
        progress: shirt.bidThreshold > 0 ? shirt.bidCount / shirt.bidThreshold : 0,
        expiresAt: shirt.expiresAt,
      });
    }

    results.sort((a, b) => b.progress - a.progress);
    return results;
  },
});
