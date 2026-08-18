# 04 — Convex Data Model

Convex schema (`convex/schema.ts`). Types shown informally; implement with `defineSchema`/`defineTable` and `v` validators. All money in **integer cents**; all credits in **integer credit units**.

## users
Synced from Clerk via webhook (user.created/updated) + first-touch upsert.
```
users: {
  clerkId: string,            // index: by_clerkId (unique)
  email: string,
  name: string,
  avatarUrl?: string,
  role: "player" | "admin",  // ONLY changed via admin mutation; never client-writable
  shirtSize?: "S"|"M"|"L"|"XL"|"2XL"|"3XL",
  // cached balances — derived from creditLedger, updated in the same mutation as ledger writes
  availableCredits: number,
  stakedCredits: number,
  freeSwipesRemaining: number,
  lastFreeSwipeClaimDay?: string,   // "YYYY-MM-DD" user-local; simple daily gate
  streakDays: number,
  referralCode: string,             // index: by_referralCode
  referredBy?: Id<"users">,
  createdAt: number,
}
```

## addresses
Structured, per-user (Printify needs real fields; legacy free-text address was unusable).
```
addresses: {
  userId: Id<"users">,        // index: by_userId
  firstName, lastName, address1, address2?, city, region, zip: string,
  country: string,            // "US" only in v1
  phone?: string,
  isDefault: boolean,
}
```

## shirts
```
shirts: {
  name: string,
  description?: string,
  designer?: string,                 // attribution string; FK-able in v2
  printMasterId: Id<"_storage">,     // 2K+ PNG, bg-removed — the Printify print file
  webImageId: Id<"_storage">,        // compressed webp for cards
  status: "draft"|"active"|"drawing"|"won"|"expired"|"archived",  // index: by_status
  bidThreshold: number,              // visible to users, default from gameConfig
  bidCount: number,                  // denormalized; only placeBid/withdraw mutations touch it
  entryCount: number,                // ≥ bidCount when early-bird multiplier active
  retailPriceCents: number,          // default 3499
  prizeCostCents: number,            // estimated landed cost, for prize-load display
  earlyBirdRemaining: number,        // bids left in the 2x-entry window
  perUserEntryCap: number,           // computed at activation from config %
  activatedAt?: number,
  expiresAt?: number,                // index: by_status_expiresAt (expiry sweep)
  winnerId?: Id<"users">,
  drawId?: Id<"draws">,
  likeCount: number,
  printify?: { blueprintId: number, printProviderId: number, productId?: string },
  createdBy: Id<"users">,
  createdAt: number,
}
```

## entries
One row per bid (the raffle tickets). Never updated, only inserted or marked withdrawn.
```
entries: {
  shirtId: Id<"shirts">,      // index: by_shirtId, by_shirtId_userId
  userId: Id<"users">,        // index: by_userId
  weight: 1 | 2,              // 2 during early-bird window
  source: "paid" | "free",   // free = AMOE daily swipe
  ledgerId?: Id<"creditLedger">,  // the staking ledger row (paid only)
  status: "active" | "withdrawn" | "refunded" | "won" | "lost",
  createdAt: number,
}
```

## creditLedger — append-only source of truth for all credit movement
```
creditLedger: {
  userId: Id<"users">,        // index: by_userId
  delta: number,              // +/- credit units (available-balance effect)
  kind: "purchase" | "welcome" | "referral" | "streak" |
        "stake" | "unstake" | "expiry_refund" |
        "redeem" | "admin_adjust",
  shirtId?: Id<"shirts">,
  orderId?: Id<"orders">,
  stripePaymentIntentId?: string,   // index: by_stripePaymentIntentId (idempotency)
  note?: string,
  createdAt: number,
}
```
Invariant: `users.availableCredits === sum(delta)` and staked = sum of active stake rows; enforce by updating caches in the same mutation as every ledger insert. Free swipes are NOT in this ledger (they have no monetary value); they live on the user row.

## draws — audit trail
```
draws: {
  shirtId: Id<"shirts">,      // index: by_shirtId
  totalEntries: number,       // sum of weights at draw time
  totalBidders: number,
  winningEntryId: Id<"entries">,
  winnerId: Id<"users">,
  randomValue: string,        // the CSPRNG output used, for auditability
  executedAt: number,
}
```

## orders — both prize fulfillments and retail purchases
```
orders: {
  userId: Id<"users">,        // index: by_userId
  shirtId: Id<"shirts">,
  type: "prize" | "purchase",
  size: string,
  addressSnapshot: {...address fields...},   // frozen at order time
  creditsCentsApplied: number,
  stripeCentsCharged: number,                // 0 for prizes
  status: "pending_info" | "submitting" | "in_production"
        | "shipped" | "delivered" | "canceled" | "failed",  // index: by_status
  printifyOrderId?: string,   // index: by_printifyOrderId (webhook lookup)
  trackingNumber?: string, trackingUrl?: string, carrier?: string,
  createdAt: number, updatedAt: number,
}
```

## likes
```
likes: { userId: Id<"users">, shirtId: Id<"shirts">, createdAt: number }
// index: by_userId_shirtId (unique-ish, checked in mutation); shirts.likeCount denormalized
```

## notifications
```
notifications: {
  userId: Id<"users">,        // index: by_userId_read
  kind: "draw_imminent" | "draw_result_win" | "draw_result_lose"
      | "expiry_refund" | "order_update" | "credits",
  title: string, body: string, shirtId?: Id<"shirts">, orderId?: Id<"orders">,
  read: boolean, emailed: boolean, createdAt: number,
}
```

## gameConfig — singleton
```
gameConfig: {
  defaultThreshold: 600,
  defaultRetailCents: 3499,
  creditPacks: [{credits: number, priceCents: number, stripePriceId: string}],
  welcomeCredits: 20,
  freeSwipesPerDay: 5,
  earlyBirdWindow: 100, earlyBirdWeight: 2,
  perUserEntryCapPct: 10,
  shirtExpiryDays: 30,
  drawDelayMinutes: 30,
  streakBonus: {days: 7, credits: 10},
  referralBonus: {referrer: 20, referee: 20},
  prizeLoadWarnPct: [15, 25],
}
```
