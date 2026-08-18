import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    role: v.union(v.literal("player"), v.literal("admin")),
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
    // cached balances — derived from creditLedger, updated in the same mutation as ledger writes
    availableCredits: v.number(),
    stakedCredits: v.number(),
    freeSwipesRemaining: v.number(),
    lastFreeSwipeClaimDay: v.optional(v.string()), // "YYYY-MM-DD" user-local
    streakDays: v.number(),
    referralCode: v.string(),
    referredBy: v.optional(v.id("users")),
    frozen: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_referralCode", ["referralCode"]),

  addresses: defineTable({
    userId: v.id("users"),
    firstName: v.string(),
    lastName: v.string(),
    address1: v.string(),
    address2: v.optional(v.string()),
    city: v.string(),
    region: v.string(),
    zip: v.string(),
    country: v.string(), // "US" only in v1
    phone: v.optional(v.string()),
    isDefault: v.boolean(),
  }).index("by_userId", ["userId"]),

  shirts: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    designer: v.optional(v.string()),
    // Optional: draft shirts (and seed data) may not have generated print
    // files / web images yet. Required in practice before `activateShirt`.
    printMasterId: v.optional(v.id("_storage")),
    webImageId: v.optional(v.id("_storage")),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("drawing"),
      v.literal("won"),
      v.literal("expired"),
      v.literal("archived")
    ),
    bidThreshold: v.number(),
    bidCount: v.number(),
    entryCount: v.number(),
    retailPriceCents: v.number(),
    prizeCostCents: v.number(),
    earlyBirdRemaining: v.number(),
    perUserEntryCap: v.number(),
    activatedAt: v.optional(v.number()),
    // Set when the shirt transitions to "drawing"; used by the draw
    // watchdog cron to detect stuck draws (> 2h since drawingAt).
    drawingAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    winnerId: v.optional(v.id("users")),
    drawId: v.optional(v.id("draws")),
    likeCount: v.number(),
    printify: v.optional(
      v.object({
        blueprintId: v.number(),
        printProviderId: v.number(),
        productId: v.optional(v.string()),
        // Size -> Printify variant_id, saved after product creation.
        variants: v.optional(v.record(v.string(), v.number())),
      })
    ),
    // Prompt/model/seed used to generate this shirt's art, for
    // reproducibility (docs/08-image-generation.md).
    generationMeta: v.optional(
      v.object({
        prompt: v.string(),
        model: v.string(),
        seed: v.optional(v.number()),
      })
    ),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_status_expiresAt", ["status", "expiresAt"]),

  entries: defineTable({
    shirtId: v.id("shirts"),
    userId: v.id("users"),
    weight: v.union(v.literal(1), v.literal(2)),
    source: v.union(v.literal("paid"), v.literal("free")),
    ledgerId: v.optional(v.id("creditLedger")),
    status: v.union(
      v.literal("active"),
      v.literal("withdrawn"),
      v.literal("refunded"),
      v.literal("won"),
      v.literal("lost")
    ),
    createdAt: v.number(),
  })
    .index("by_shirtId", ["shirtId"])
    .index("by_shirtId_userId", ["shirtId", "userId"])
    .index("by_userId", ["userId"]),

  creditLedger: defineTable({
    userId: v.id("users"),
    delta: v.number(), // +/- credit units (available-balance effect)
    kind: v.union(
      v.literal("purchase"),
      v.literal("welcome"),
      v.literal("referral"),
      v.literal("streak"),
      v.literal("stake"),
      v.literal("unstake"),
      v.literal("expiry_refund"),
      v.literal("redeem"),
      v.literal("admin_adjust")
    ),
    shirtId: v.optional(v.id("shirts")),
    orderId: v.optional(v.id("orders")),
    stripePaymentIntentId: v.optional(v.string()),
    note: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_stripePaymentIntentId", ["stripePaymentIntentId"]),

  draws: defineTable({
    shirtId: v.id("shirts"),
    totalEntries: v.number(),
    totalBidders: v.number(),
    winningEntryId: v.id("entries"),
    winnerId: v.id("users"),
    randomValue: v.string(),
    executedAt: v.number(),
  }).index("by_shirtId", ["shirtId"]),

  orders: defineTable({
    userId: v.id("users"),
    shirtId: v.id("shirts"),
    type: v.union(v.literal("prize"), v.literal("purchase")),
    size: v.string(),
    addressSnapshot: v.object({
      firstName: v.string(),
      lastName: v.string(),
      address1: v.string(),
      address2: v.optional(v.string()),
      city: v.string(),
      region: v.string(),
      zip: v.string(),
      country: v.string(),
      phone: v.optional(v.string()),
    }),
    creditsCentsApplied: v.number(),
    stripeCentsCharged: v.number(), // 0 for prizes
    status: v.union(
      v.literal("pending_info"),
      v.literal("submitting"),
      v.literal("in_production"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("canceled"),
      v.literal("failed")
    ),
    printifyOrderId: v.optional(v.string()),
    trackingNumber: v.optional(v.string()),
    trackingUrl: v.optional(v.string()),
    carrier: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"])
    .index("by_printifyOrderId", ["printifyOrderId"]),

  likes: defineTable({
    userId: v.id("users"),
    shirtId: v.id("shirts"),
    createdAt: v.number(),
  }).index("by_userId_shirtId", ["userId", "shirtId"]),

  notifications: defineTable({
    userId: v.id("users"),
    kind: v.union(
      v.literal("draw_imminent"),
      v.literal("draw_result_win"),
      v.literal("draw_result_lose"),
      v.literal("expiry_refund"),
      v.literal("order_update"),
      v.literal("credits")
    ),
    title: v.string(),
    body: v.string(),
    shirtId: v.optional(v.id("shirts")),
    orderId: v.optional(v.id("orders")),
    read: v.boolean(),
    emailed: v.boolean(),
    createdAt: v.number(),
  }).index("by_userId_read", ["userId", "read"]),

  gameConfig: defineTable({
    defaultThreshold: v.number(),
    defaultRetailCents: v.number(),
    creditPacks: v.array(
      v.object({
        credits: v.number(),
        priceCents: v.number(),
        stripePriceId: v.string(),
      })
    ),
    welcomeCredits: v.number(),
    freeSwipesPerDay: v.number(),
    earlyBirdWindow: v.number(),
    earlyBirdWeight: v.number(),
    perUserEntryCapPct: v.number(),
    shirtExpiryDays: v.number(),
    drawDelayMinutes: v.number(),
    streakBonus: v.object({
      days: v.number(),
      credits: v.number(),
    }),
    referralBonus: v.object({
      referrer: v.number(),
      referee: v.number(),
    }),
    prizeLoadWarnPct: v.array(v.number()),
    // Default Printify blueprint/provider for new shirts that don't set
    // their own (docs/09-fulfillment-printify.md: Bella+Canvas 3001).
    printifyDefaults: v.optional(
      v.object({
        blueprintId: v.number(),
        printProviderId: v.number(),
      })
    ),
  }),
});
