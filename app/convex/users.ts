import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { getUserOrNull, requireUser } from "./lib/auth";
import { getConfig } from "./lib/config";
import { postLedger } from "./lib/ledger";

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Create a new users row (with welcome credits + referral code) for the
 * given identity fields. Caller must have already confirmed no row exists
 * for this clerkId.
 */
async function createUser(
  ctx: MutationCtx,
  fields: {
    clerkId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }
): Promise<Id<"users">> {
  const config = await getConfig(ctx);

  // Ensure referral code uniqueness (retry on the rare collision).
  let referralCode = generateReferralCode();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const clash = await ctx.db
      .query("users")
      .withIndex("by_referralCode", (q) => q.eq("referralCode", referralCode))
      .unique();
    if (!clash) break;
    referralCode = generateReferralCode();
  }

  const userId = await ctx.db.insert("users", {
    clerkId: fields.clerkId,
    email: fields.email,
    name: fields.name,
    avatarUrl: fields.avatarUrl,
    role: "player",
    availableCredits: 0,
    stakedCredits: 0,
    freeSwipesRemaining: config.freeSwipesPerDay,
    streakDays: 0,
    referralCode,
    createdAt: Date.now(),
  });

  if (config.welcomeCredits > 0) {
    await postLedger(ctx, {
      userId,
      delta: config.welcomeCredits,
      kind: "welcome",
      note: "Welcome credits",
    });
  }

  return userId;
}

/**
 * First-touch upsert from the Clerk identity. Called by the client on
 * sign-in. Idempotent: if the user row already exists (e.g. created by
 * the Clerk webhook), this is a no-op that returns the existing row's id.
 */
export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("NOT_AUTHENTICATED");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existing) {
      return existing._id;
    }

    return await createUser(ctx, {
      clerkId: identity.subject,
      email: identity.email ?? "",
      name: identity.name ?? identity.email ?? "New user",
      avatarUrl: identity.pictureUrl,
    });
  },
});

/**
 * Upsert a users row from a Clerk webhook payload (user.created /
 * user.updated). Internal — only called from convex/http.ts after svix
 * signature verification.
 */
export const upsertFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
        avatarUrl: args.avatarUrl,
      });
      return existing._id;
    }

    return await createUser(ctx, args);
  },
});

/** Current user's row, or null for guests. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    return await getUserOrNull(ctx);
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    shirtSize: v.optional(
      v.union(
        v.literal("S"),
        v.literal("M"),
        v.literal("L"),
        v.literal("XL"),
        v.literal("2XL"),
        v.literal("3XL")
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const patch: Partial<{ name: string; shirtSize: typeof args.shirtSize }> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.shirtSize !== undefined) patch.shirtSize = args.shirtSize;
    await ctx.db.patch(user._id, patch);
  },
});
