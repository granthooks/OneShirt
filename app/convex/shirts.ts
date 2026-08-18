import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { getUserOrNull } from "./lib/auth";

const DECK_PAGE_SIZE = 30;

/**
 * Active shirts for the swipe deck. Guest-safe (per-shirt user fields are
 * omitted for unauthenticated callers). Excludes shirts where the caller
 * has already hit their per-user entry cap.
 */
export const getDeck = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUserOrNull(ctx);

    const shirts = await ctx.db
      .query("shirts")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .take(DECK_PAGE_SIZE);

    const results = [];
    for (const shirt of shirts) {
      const card = await buildShirtCard(ctx, shirt, user);
      if (card === null) {
        // User has hit their per-user entry cap on this shirt — exclude.
        continue;
      }
      results.push(card);
    }

    return results;
  },
});

/**
 * Shirt detail. If the shirt has been won, only the winner's first name is
 * exposed (never full name/email).
 */
export const getShirt = query({
  args: { shirtId: v.id("shirts") },
  handler: async (ctx, args) => {
    const user = await getUserOrNull(ctx);
    const shirt = await ctx.db.get(args.shirtId);
    if (!shirt) {
      throw new ConvexError("SHIRT_NOT_FOUND");
    }

    const webImageUrl = shirt.webImageId
      ? await ctx.storage.getUrl(shirt.webImageId)
      : null;

    let winnerFirstName: string | null = null;
    if (shirt.status === "won" && shirt.winnerId) {
      const winner = await ctx.db.get(shirt.winnerId);
      if (winner) {
        winnerFirstName = winner.name.trim().split(/\s+/)[0] ?? null;
      }
    }

    let myEntries = 0;
    let likedByMe = false;
    if (user) {
      const activeEntries = await ctx.db
        .query("entries")
        .withIndex("by_shirtId_userId", (q) =>
          q.eq("shirtId", shirt._id).eq("userId", user._id)
        )
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();
      myEntries = activeEntries.length;

      const like = await ctx.db
        .query("likes")
        .withIndex("by_userId_shirtId", (q) =>
          q.eq("userId", user._id).eq("shirtId", shirt._id)
        )
        .unique();
      likedByMe = like !== null;
    }

    return {
      id: shirt._id,
      name: shirt.name,
      designer: shirt.designer,
      description: shirt.description,
      status: shirt.status,
      webImageUrl,
      bidCount: shirt.bidCount,
      bidThreshold: shirt.bidThreshold,
      entryCount: shirt.entryCount,
      earlyBirdRemaining: shirt.earlyBirdRemaining,
      likeCount: shirt.likeCount,
      retailPriceCents: shirt.retailPriceCents,
      expiresAt: shirt.expiresAt,
      activatedAt: shirt.activatedAt,
      winnerFirstName,
      ...(user ? { myEntries, likedByMe } : {}),
    };
  },
});

/**
 * Build a deck card for a single shirt. Returns null if the shirt should
 * be excluded from the caller's deck (per-user entry cap reached).
 */
async function buildShirtCard(
  ctx: QueryCtx,
  shirt: Doc<"shirts">,
  user: Doc<"users"> | null
) {
  let myEntries = 0;
  let likedByMe = false;

  if (user) {
    const activeEntries = await ctx.db
      .query("entries")
      .withIndex("by_shirtId_userId", (q) =>
        q.eq("shirtId", shirt._id).eq("userId", user._id)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    myEntries = activeEntries.length;

    if (myEntries >= shirt.perUserEntryCap) {
      return null;
    }

    const like = await ctx.db
      .query("likes")
      .withIndex("by_userId_shirtId", (q) =>
        q.eq("userId", user._id).eq("shirtId", shirt._id)
      )
      .unique();
    likedByMe = like !== null;
  }

  const webImageUrl = shirt.webImageId
    ? await ctx.storage.getUrl(shirt.webImageId)
    : null;

  return {
    id: shirt._id,
    name: shirt.name,
    designer: shirt.designer,
    description: shirt.description,
    webImageUrl,
    bidCount: shirt.bidCount,
    bidThreshold: shirt.bidThreshold,
    entryCount: shirt.entryCount,
    earlyBirdRemaining: shirt.earlyBirdRemaining,
    likeCount: shirt.likeCount,
    retailPriceCents: shirt.retailPriceCents,
    expiresAt: shirt.expiresAt,
    ...(user ? { myEntries, likedByMe } : {}),
  };
}

export type ShirtId = Id<"shirts">;
