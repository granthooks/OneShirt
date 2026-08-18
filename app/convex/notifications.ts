import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserOrNull, requireUser } from "./lib/auth";

/**
 * Paginated notifications for the caller, most recent first. Guest-safe:
 * non-critical header/deck UI subscribes to this on every load (including
 * the brief window before the Convex auth handshake completes), so it
 * returns an empty page for unauthenticated callers instead of throwing —
 * matches `wallet.get`'s guest-safe pattern.
 */
export const list = query({
  args: { paginationOpts: v.any() },
  handler: async (ctx, args) => {
    const user = await getUserOrNull(ctx);
    if (!user) {
      return { page: [], isDone: true, continueCursor: "" };
    }
    return await ctx.db
      .query("notifications")
      .withIndex("by_userId_read", (q) => q.eq("userId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/**
 * Count of unread notifications for the caller. Guest-safe (see `list`) —
 * returns 0 for unauthenticated callers instead of throwing.
 */
export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUserOrNull(ctx);
    if (!user) {
      return 0;
    }
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_read", (q) =>
        q.eq("userId", user._id).eq("read", false)
      )
      .collect();
    return unread.length;
  },
});

/**
 * Mark a single notification read, or all of the caller's notifications
 * read if `notificationId` is omitted.
 */
export const markRead = mutation({
  args: { notificationId: v.optional(v.id("notifications")) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    if (args.notificationId) {
      const notification = await ctx.db.get(args.notificationId);
      if (!notification || notification.userId !== user._id) {
        throw new ConvexError("NOTIFICATION_NOT_FOUND");
      }
      await ctx.db.patch(notification._id, { read: true });
      return;
    }

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_read", (q) =>
        q.eq("userId", user._id).eq("read", false)
      )
      .collect();
    for (const notification of unread) {
      await ctx.db.patch(notification._id, { read: true });
    }
  },
});
