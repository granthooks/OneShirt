import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserOrNull, requireUser } from "./lib/auth";
import { getConfig } from "./lib/config";
import { postLedger } from "./lib/ledger";

function todayKey(): string {
  // "YYYY-MM-DD", UTC-based simple daily gate.
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const da = new Date(a + "T00:00:00Z").getTime();
  const db_ = new Date(b + "T00:00:00Z").getTime();
  return Math.round((db_ - da) / msPerDay);
}

/**
 * Wallet summary: availableCredits, stakedCredits (with per-shirt
 * breakdown from active paid entries), freeSwipesRemaining, streakDays,
 * and the credit packs available for purchase. Null for guests.
 */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUserOrNull(ctx);
    if (!user) {
      return null;
    }

    const config = await getConfig(ctx);

    const activeEntries = await ctx.db
      .query("entries")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.and(q.eq(q.field("status"), "active"), q.eq(q.field("source"), "paid"))
      )
      .collect();

    const stakedByShirt = new Map<string, number>();
    for (const entry of activeEntries) {
      const key = entry.shirtId as unknown as string;
      stakedByShirt.set(key, (stakedByShirt.get(key) ?? 0) + 1);
    }

    const stakedBreakdown = Array.from(stakedByShirt.entries()).map(
      ([shirtId, credits]) => ({
        shirtId: shirtId as unknown as (typeof activeEntries)[number]["shirtId"],
        credits,
      })
    );

    return {
      availableCredits: user.availableCredits,
      stakedCredits: user.stakedCredits,
      stakedBreakdown,
      freeSwipesRemaining: user.freeSwipesRemaining,
      streakDays: user.streakDays,
      creditPacks: config.creditPacks,
    };
  },
});

/** Paginated ledger history for the wallet screen. */
export const getLedger = query({
  args: { paginationOpts: v.any() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query("creditLedger")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/**
 * Claim today's free swipes. Date-gated by `lastFreeSwipeClaimDay`
 * ("YYYY-MM-DD"). Updates streak: consecutive-day claims increment
 * streakDays; a gap of more than 1 day resets it to 1. Grants a streak
 * bonus (via ledger `streak`) whenever streakDays hits a multiple of
 * `config.streakBonus.days`.
 */
export const claimDailySwipes = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const config = await getConfig(ctx);
    const today = todayKey();

    if (user.lastFreeSwipeClaimDay === today) {
      throw new ConvexError("ALREADY_CLAIMED_TODAY");
    }

    let streakDays = 1;
    if (user.lastFreeSwipeClaimDay) {
      const gap = daysBetween(user.lastFreeSwipeClaimDay, today);
      if (gap === 1) {
        streakDays = user.streakDays + 1;
      } else {
        streakDays = 1;
      }
    }

    await ctx.db.patch(user._id, {
      freeSwipesRemaining: config.freeSwipesPerDay,
      lastFreeSwipeClaimDay: today,
      streakDays,
    });

    let bonusGranted = 0;
    if (
      config.streakBonus.days > 0 &&
      streakDays % config.streakBonus.days === 0
    ) {
      bonusGranted = config.streakBonus.credits;
      if (bonusGranted > 0) {
        await postLedger(ctx, {
          userId: user._id,
          delta: bonusGranted,
          kind: "streak",
          note: `${streakDays}-day streak bonus`,
        });
      }
    }

    return {
      freeSwipesRemaining: config.freeSwipesPerDay,
      streakDays,
      bonusGranted,
    };
  },
});
