import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireUser } from "./lib/auth";

/**
 * Toggle a like on a shirt for the caller. Inserts/deletes the `likes`
 * row and keeps `shirts.likeCount` denormalized in the same mutation.
 */
export const toggle = mutation({
  args: { shirtId: v.id("shirts") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const shirt = await ctx.db.get(args.shirtId);
    if (!shirt) {
      throw new ConvexError("SHIRT_NOT_FOUND");
    }

    const existing = await ctx.db
      .query("likes")
      .withIndex("by_userId_shirtId", (q) =>
        q.eq("userId", user._id).eq("shirtId", args.shirtId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(shirt._id, {
        likeCount: Math.max(0, shirt.likeCount - 1),
      });
      return { liked: false, likeCount: Math.max(0, shirt.likeCount - 1) };
    }

    await ctx.db.insert("likes", {
      userId: user._id,
      shirtId: args.shirtId,
      createdAt: Date.now(),
    });
    await ctx.db.patch(shirt._id, { likeCount: shirt.likeCount + 1 });
    return { liked: true, likeCount: shirt.likeCount + 1 };
  },
});
