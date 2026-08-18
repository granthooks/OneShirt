import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireAdmin, requireUser } from "./lib/auth";
import { getConfig as getConfigLib } from "./lib/config";
import { postLedger } from "./lib/ledger";

const RECENT_ACTIVITY_LIMIT = 20;
const LIST_LIMIT = 200;

/** Admin dashboard summary stats. */
export const stats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const users = await ctx.db.query("users").collect();
    const totalUsers = users.length;
    const creditsOutstanding = users.reduce(
      (sum, u) => sum + u.availableCredits + u.stakedCredits,
      0
    );

    const activeShirts = (
      await ctx.db
        .query("shirts")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .collect()
    ).length;

    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const startOfTodayMs = startOfToday.getTime();

    // Bound this scan — entries has no createdAt index, so take a large
    // recent slice ordered by insertion (creation) time.
    const recentEntries = await ctx.db.query("entries").order("desc").take(2000);
    const totalBidsToday = recentEntries.filter(
      (e) => e.createdAt >= startOfTodayMs
    ).length;

    const draws = await ctx.db.query("draws").order("desc").take(LIST_LIMIT);
    const drawsExecuted = draws.length;

    const orders = await ctx.db.query("orders").take(LIST_LIMIT);
    const ordersByStatus: Record<string, number> = {};
    for (const order of orders) {
      ordersByStatus[order.status] = (ordersByStatus[order.status] ?? 0) + 1;
    }

    const allActiveShirts = await ctx.db
      .query("shirts")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    const topShirtsRanked = allActiveShirts
      .sort((a, b) => b.bidCount - a.bidCount)
      .slice(0, 10);
    const topShirts = [];
    for (const s of topShirtsRanked) {
      const webImageUrl = s.webImageId
        ? await ctx.storage.getUrl(s.webImageId)
        : null;
      topShirts.push({
        id: s._id,
        name: s.name,
        webImageUrl,
        bidCount: s.bidCount,
        bidThreshold: s.bidThreshold,
        progress: s.bidThreshold > 0 ? s.bidCount / s.bidThreshold : 0,
      });
    }

    const entryCountByUser = new Map<string, number>();
    for (const entry of recentEntries) {
      const key = entry.userId as unknown as string;
      entryCountByUser.set(key, (entryCountByUser.get(key) ?? 0) + 1);
    }
    const topUsersRanked = Array.from(entryCountByUser.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const topUsers = [];
    for (const [userIdStr, count] of topUsersRanked) {
      const user = await ctx.db.get(userIdStr as (typeof users)[number]["_id"]);
      if (!user) continue;
      topUsers.push({
        id: user._id,
        name: user.name,
        avatarUrl: user.avatarUrl ?? null,
        entryCount: count,
      });
    }

    const recentActivityEntries = recentEntries.slice(0, RECENT_ACTIVITY_LIMIT);
    const recentActivity = [];
    for (const entry of recentActivityEntries) {
      const [user, shirt] = await Promise.all([
        ctx.db.get(entry.userId),
        ctx.db.get(entry.shirtId),
      ]);
      recentActivity.push({
        userName: user?.name ?? "Unknown",
        shirtName: shirt?.name ?? "Unknown",
        createdAt: entry.createdAt,
        source: entry.source,
      });
    }

    return {
      totalUsers,
      activeShirts,
      totalBidsToday,
      creditsOutstanding,
      drawsExecuted,
      ordersByStatus,
      topShirts,
      topUsers,
      recentActivity,
    };
  },
});

export const listShirts = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("active"),
        v.literal("drawing"),
        v.literal("won"),
        v.literal("expired"),
        v.literal("archived")
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const shirts = args.status
      ? await ctx.db
          .query("shirts")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .order("desc")
          .take(LIST_LIMIT)
      : await ctx.db.query("shirts").order("desc").take(LIST_LIMIT);

    const withImages = [];
    for (const shirt of shirts) {
      const webImageUrl = shirt.webImageId
        ? await ctx.storage.getUrl(shirt.webImageId)
        : null;
      withImages.push({ ...shirt, webImageUrl });
    }
    return withImages;
  },
});

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("users").order("desc").take(LIST_LIMIT);
  },
});

export const listOrders = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending_info"),
        v.literal("submitting"),
        v.literal("in_production"),
        v.literal("shipped"),
        v.literal("delivered"),
        v.literal("canceled"),
        v.literal("failed")
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const orders = args.status
      ? await ctx.db
          .query("orders")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .order("desc")
          .take(LIST_LIMIT)
      : await ctx.db.query("orders").order("desc").take(LIST_LIMIT);

    const withDetails = [];
    for (const order of orders) {
      const [user, shirt] = await Promise.all([
        ctx.db.get(order.userId),
        ctx.db.get(order.shirtId),
      ]);
      const webImageUrl = shirt?.webImageId
        ? await ctx.storage.getUrl(shirt.webImageId)
        : null;
      withDetails.push({
        ...order,
        userName: user?.name ?? "Unknown",
        shirtName: shirt?.name ?? "Unknown",
        webImageUrl,
      });
    }
    return withDetails;
  },
});

/** Read-only draw audit log: recent draws joined with shirt + winner names. */
export const listDraws = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const draws = await ctx.db.query("draws").order("desc").take(LIST_LIMIT);

    const withDetails = [];
    for (const draw of draws) {
      const [shirt, winner] = await Promise.all([
        ctx.db.get(draw.shirtId),
        ctx.db.get(draw.winnerId),
      ]);
      withDetails.push({
        ...draw,
        shirtName: shirt?.name ?? "Unknown",
        winnerName: winner?.name ?? "Unknown",
      });
    }
    return withDetails;
  },
});

/** Current gameConfig, for the admin config editor. */
export const getConfig = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await getConfigLib(ctx);
  },
});

export const createShirt = mutation({
  args: {
    name: v.string(),
    designer: v.optional(v.string()),
    description: v.optional(v.string()),
    retailPriceCents: v.optional(v.number()),
    bidThreshold: v.optional(v.number()),
    prizeCostCents: v.optional(v.number()),
    webImageId: v.optional(v.id("_storage")),
    printMasterId: v.optional(v.id("_storage")),
    generationMeta: v.optional(
      v.object({
        prompt: v.string(),
        model: v.string(),
        seed: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const config = await getConfigLib(ctx);

    const shirtId = await ctx.db.insert("shirts", {
      name: args.name,
      designer: args.designer,
      description: args.description,
      printMasterId: args.printMasterId,
      webImageId: args.webImageId,
      generationMeta: args.generationMeta,
      status: "draft",
      bidThreshold: args.bidThreshold ?? config.defaultThreshold,
      bidCount: 0,
      entryCount: 0,
      retailPriceCents: args.retailPriceCents ?? config.defaultRetailCents,
      prizeCostCents: args.prizeCostCents ?? 0,
      earlyBirdRemaining: config.earlyBirdWindow,
      perUserEntryCap: Math.max(
        1,
        Math.round(
          ((args.bidThreshold ?? config.defaultThreshold) *
            config.perUserEntryCapPct) /
            100
        )
      ),
      likeCount: 0,
      createdBy: admin._id,
      createdAt: Date.now(),
    });

    return shirtId;
  },
});

export const updateShirt = mutation({
  args: {
    shirtId: v.id("shirts"),
    name: v.optional(v.string()),
    designer: v.optional(v.string()),
    description: v.optional(v.string()),
    retailPriceCents: v.optional(v.number()),
    bidThreshold: v.optional(v.number()),
    prizeCostCents: v.optional(v.number()),
    webImageId: v.optional(v.id("_storage")),
    printMasterId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { shirtId, ...fields } = args;
    const shirt = await ctx.db.get(shirtId);
    if (!shirt) {
      throw new ConvexError("SHIRT_NOT_FOUND");
    }
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) patch[key] = value;
    }
    await ctx.db.patch(shirtId, patch);
  },
});

/**
 * Activate a draft shirt: computes perUserEntryCap, expiresAt, seeds
 * earlyBirdRemaining, sets activatedAt. Returns the computed prize load
 * and a warn flag if it falls outside the configured band.
 */
export const activateShirt = mutation({
  args: { shirtId: v.id("shirts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const config = await getConfigLib(ctx);
    const shirt = await ctx.db.get(args.shirtId);
    if (!shirt) {
      throw new ConvexError("SHIRT_NOT_FOUND");
    }
    if (shirt.status !== "draft") {
      throw new ConvexError("SHIRT_NOT_DRAFT");
    }
    if (!shirt.printMasterId || !shirt.webImageId) {
      throw new ConvexError("SHIRT_MISSING_IMAGES");
    }
    // Print master validation (docs/08-image-generation.md): must be a
    // PNG. Full pixel-dimension (>=1800px short side) and transparency
    // checks require decoding image bytes, which isn't available in a
    // mutation — enforced content-type only here; see deviations.
    const printMasterMeta = await ctx.db.system.get(shirt.printMasterId);
    if (!printMasterMeta || printMasterMeta.contentType !== "image/png") {
      throw new ConvexError("SHIRT_PRINT_MASTER_NOT_PNG");
    }

    const now = Date.now();
    const perUserEntryCap = Math.max(
      1,
      Math.round((shirt.bidThreshold * config.perUserEntryCapPct) / 100)
    );
    const expiresAt = now + config.shirtExpiryDays * 24 * 60 * 60 * 1000;

    await ctx.db.patch(shirt._id, {
      status: "active",
      perUserEntryCap,
      earlyBirdRemaining: config.earlyBirdWindow,
      activatedAt: now,
      expiresAt,
    });

    // Prize load % = (prizeCost / threshold) as a fraction of the price
    // paid per credit (docs/02-game-mechanics.md §6). Derive the
    // effective credit price from the first configured pack, falling
    // back to the ~$0.10 default if no packs are configured.
    const firstPack = config.creditPacks[0];
    const creditPriceCents =
      firstPack && firstPack.credits > 0
        ? firstPack.priceCents / firstPack.credits
        : 10;
    const prizeLoadPerCreditCents =
      shirt.bidThreshold > 0 ? shirt.prizeCostCents / shirt.bidThreshold : 0;
    const prizeLoadPct =
      creditPriceCents > 0
        ? (prizeLoadPerCreditCents / creditPriceCents) * 100
        : 0;
    const [minPct, maxPct] = config.prizeLoadWarnPct;
    const warn = prizeLoadPct < minPct || prizeLoadPct > maxPct;

    return { prizeLoadPct, warn };
  },
});

export const archiveShirt = mutation({
  args: { shirtId: v.id("shirts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const shirt = await ctx.db.get(args.shirtId);
    if (!shirt) {
      throw new ConvexError("SHIRT_NOT_FOUND");
    }
    await ctx.db.patch(shirt._id, { status: "archived" });
  },
});

export const adjustCredits = mutation({
  args: {
    userId: v.id("users"),
    delta: v.number(),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await postLedger(ctx, {
      userId: args.userId,
      delta: args.delta,
      kind: "admin_adjust",
      note: args.note,
    });
  },
});

export const setRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("player"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("USER_NOT_FOUND");
    }
    await ctx.db.patch(args.userId, { role: args.role });
  },
});

/**
 * Internal-only ops helper: set a user's role by email. Not callable from
 * clients (no admin auth check needed) — for CLI use only, e.g.:
 *   npx convex run admin:internalSetRole '{"email":"...","role":"admin"}'
 * There's no `by_email` index (users are looked up by `clerkId` in normal
 * app flows), so this does a table scan — acceptable for an infrequent
 * ops command, not used on any request path.
 */
export const internalSetRole = internalMutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("player"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .unique();
    if (!user) {
      throw new ConvexError("USER_NOT_FOUND");
    }
    await ctx.db.patch(user._id, { role: args.role });
  },
});

/** Retry a failed order's Printify submission. */
export const resubmitOrder = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new ConvexError("ORDER_NOT_FOUND");
    }
    if (order.status !== "failed") {
      throw new ConvexError("ORDER_NOT_FAILED");
    }
    await ctx.db.patch(args.orderId, { status: "submitting", updatedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.printify.submitOrder, {
      orderId: args.orderId,
    });
  },
});

export const updateConfig = mutation({
  args: {
    defaultThreshold: v.optional(v.number()),
    defaultRetailCents: v.optional(v.number()),
    creditPacks: v.optional(
      v.array(
        v.object({
          credits: v.number(),
          priceCents: v.number(),
          stripePriceId: v.string(),
        })
      )
    ),
    welcomeCredits: v.optional(v.number()),
    freeSwipesPerDay: v.optional(v.number()),
    earlyBirdWindow: v.optional(v.number()),
    earlyBirdWeight: v.optional(v.number()),
    perUserEntryCapPct: v.optional(v.number()),
    shirtExpiryDays: v.optional(v.number()),
    drawDelayMinutes: v.optional(v.number()),
    streakBonus: v.optional(
      v.object({ days: v.number(), credits: v.number() })
    ),
    referralBonus: v.optional(
      v.object({ referrer: v.number(), referee: v.number() })
    ),
    prizeLoadWarnPct: v.optional(v.array(v.number())),
    printifyDefaults: v.optional(
      v.object({ blueprintId: v.number(), printProviderId: v.number() })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const config = await getConfigLib(ctx);
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) patch[key] = value;
    }
    await ctx.db.patch(config._id, patch);
  },
});

/**
 * One-time bootstrap: promotes the calling (already-authenticated) user to
 * admin. `setRole` above requires an existing admin, so on a fresh
 * deployment there's no way to create the first one through the app —
 * this closes that gap. Guarded to only run when zero admins exist yet;
 * once any admin has been created, this always throws and further role
 * changes must go through `setRole`.
 */
export const bootstrapFirstAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const caller = await requireUser(ctx);

    const existingAdmin = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "admin"))
      .first();
    if (existingAdmin) {
      throw new ConvexError("ADMIN_ALREADY_EXISTS");
    }

    await ctx.db.patch(caller._id, { role: "admin" });
  },
});
