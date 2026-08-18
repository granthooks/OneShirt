import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Resolve the authenticated caller to their `users` row.
 * Throws ConvexError("NOT_AUTHENTICATED") if there is no identity or no
 * matching user row yet.
 */
export async function requireUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("NOT_AUTHENTICATED");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) {
    throw new ConvexError("NOT_AUTHENTICATED");
  }

  return user;
}

/**
 * Require an authenticated admin. Throws ConvexError("NOT_AUTHENTICATED")
 * if unauthenticated, or ConvexError("NOT_ADMIN") if authenticated but not
 * an admin.
 */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "admin") {
    throw new ConvexError("NOT_ADMIN");
  }
  return user;
}

/**
 * Guest-tolerant lookup: returns the caller's `users` row, or null if the
 * caller is unauthenticated or has no row yet. Never throws.
 */
export async function getUserOrNull(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();

  return user ?? null;
}
