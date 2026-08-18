# 05 — Backend Functions (Convex)

Directory layout: `convex/{schema.ts, users.ts, shirts.ts, bids.ts, draws.ts, wallet.ts, orders.ts, admin.ts, generation.ts, printify.ts, stripe.ts, notifications.ts, crons.ts, http.ts, lib/}`.

Conventions:
- Every public function resolves the caller via `ctx.auth.getUserIdentity()` → `users` row (helper `requireUser(ctx)` / `requireAdmin(ctx)`); throw `ConvexError` with user-safe messages.
- External APIs only in actions; actions commit via `internalMutation`s.
- All list queries paginate.

## Queries (public, reactive)

| Function | Args | Returns / notes |
|---|---|---|
| `shirts.getDeck` | `{cursor?}` | Active shirts the user hasn't exhausted (exclude shirts at the user's entry cap; include per-shirt: bidCount, threshold, earlyBirdRemaining, myEntries, likeCount, likedByMe, retail price, expiresAt). Guests get the same minus per-user fields. |
| `shirts.getShirt` | `{shirtId}` | Detail incl. draw status; if `won`, winner display name only. |
| `wallet.get` | — | availableCredits, stakedCredits (with per-shirt breakdown), freeSwipesRemaining, streakDays, credit packs from config. |
| `wallet.getLedger` | `{cursor?}` | User's ledger history for the wallet screen. |
| `bids.myEntries` | — | Shirts I have entries on, with live progress (drives "My Bids" tab). |
| `orders.myOrders` | — | Orders with status/tracking. |
| `notifications.list` / `unreadCount` | | |
| `draws.recentWinners` | `{limit}` | Real winners only (first name + shirt), for social proof. |

Admin queries (`requireAdmin`): `admin.stats` (users, credits sold vs redeemed, prize load actuals, draws, orders by status), `admin.listShirts`, `admin.listUsers`, `admin.listOrders`, `admin.getConfig`.

## Mutations

### `bids.placeBid({shirtId})` — the heart of the app; single ACID transaction
1. `requireUser`. Load shirt; require `status === "active"`.
2. Enforce per-user entry cap (count `entries by_shirtId_userId` active).
3. Determine source: if `freeSwipesRemaining > 0` ask client-passed preference? **No** — rule: free swipes are consumed first (simplest, disclosed). If no free swipes, require `availableCredits >= 1`; write ledger `stake` (−1 available, +1 staked) and update cached balances.
4. Weight = `earlyBirdRemaining > 0 ? earlyBirdWeight : 1`; decrement `earlyBirdRemaining` if applicable.
5. Insert `entries` row; increment `shirts.bidCount` and `entryCount`.
6. If `bidCount >= bidThreshold`: set status `drawing`, `ctx.scheduler.runAfter(drawDelayMinutes, internal.draws.execute, {shirtId})`, and schedule `draw_imminent`→result notifications.
7. Return `{bidCount, myEntries, becameDrawing, usedFreeSwipe, newBalances}`.

Failure modes are thrown errors the UI maps to friendly states: `NOT_AUTHENTICATED`, `NO_CREDITS` (→ buy-credits sheet), `ENTRY_CAP_REACHED`, `SHIRT_NOT_ACTIVE`.

### Other player mutations
- `wallet.claimDailySwipes()` — date-gated by `lastFreeSwipeClaimDay`; updates streak; grants streak bonus via ledger when earned.
- `likes.toggle({shirtId})` — insert/delete like + denorm count. Server-side, unlike legacy.
- `users.updateProfile({name?, shirtSize?})`, `addresses.upsert/remove/setDefault`.
- `orders.startPurchase({shirtId, size, addressId})` — computes `creditsToApply = min(balanceIncludingStaked, retail)`; if staked credit is used, mark corresponding entries `withdrawn` (oldest first) and decrement shirt counts; write `redeem` ledger rows; if remainder > 0 create Stripe Checkout session (via action) and return its URL, order `pending` until webhook; if fully credit-covered, finalize immediately → Printify submission.
- `notifications.markRead`.

### Admin mutations (`requireAdmin`, all audit-logged via `admin_adjust`/notes)
- `admin.createShirt` / `updateShirt` / `activateShirt` (computes `perUserEntryCap`, `expiresAt`; **warns if prize load outside configured band** — returns computed load), `archiveShirt`.
- `admin.adjustCredits({userId, delta, note})` — ledger `admin_adjust`.
- `admin.setRole({userId, role})`.
- `admin.updateConfig(partial)`.
- `admin.resubmitOrder({orderId})` for failed fulfillments.

## Actions

### `draws.execute({shirtId})` (internal, scheduled)
1. Re-check shirt `status === "drawing"` (idempotency).
2. Load all active entries; build cumulative weight array; pick winner with `crypto.getRandomValues`.
3. Commit via internal mutation: insert `draws` row, shirt → `won` + winnerId, entries → `won`/`lost`, **unstake all paid entries** (ledger `unstake`: staked→available for everyone, winner included), notifications for all entrants, create prize `orders` row (`pending_info` if winner lacks size/address, else `submitting`).
4. If `submitting`, schedule `printify.submitOrder`.

### `printify.submitOrder({orderId})` — see [09-fulfillment-printify.md](09-fulfillment-printify.md). Upload/ensure product, POST order, save `printifyOrderId`, status `in_production` on success; on failure status `failed` + admin notification (never silent).

### `generation.generateDesign({prompt, resolution})` (admin) — see [08-image-generation.md](08-image-generation.md). Returns storage ids + preview URL; a separate `admin.createShirt` call turns it into a draft shirt.

### `stripe.createCheckoutSession({packIndex | orderId})`, plus HTTP webhook handler (below).

## HTTP endpoints (`convex/http.ts`)
- `POST /stripe-webhook` — verify signature; `checkout.session.completed` → idempotent ledger `purchase` (keyed on `stripePaymentIntentId`) or order finalization → Printify submission.
- `POST /printify-webhook` — verify; `order:updated` → map status, save tracking, notify user.
- `POST /clerk-webhook` — user created/updated/deleted sync.

## Crons (`convex/crons.ts`)
- **Expiry sweep** (hourly): shirts `active` past `expiresAt` → `expired`; refund stakes (`expiry_refund`), entries → `refunded`, notify.
- **Draw watchdog** (hourly): shirts stuck in `drawing` > 2h → re-schedule `draws.execute`.
- **Order reconciliation** (daily): poll Printify for orders in `submitting`/`in_production` with stale `updatedAt` (webhook backstop).

## Invariants to test (write these as automated tests)
1. Ledger sums always equal cached balances (property test across random op sequences).
2. `placeBid` on the same 1-credit balance twice concurrently yields exactly one entry (Convex serializability should guarantee; test anyway).
3. Threshold crossing schedules exactly one draw; draw executes exactly once.
4. Withdrawing staked credit via purchase decrements shirt counts and can un-cross a threshold only if status is still `active` (if `drawing`, staked credits on it are locked — reject with clear message).
5. Free-swipe entries never create ledger rows; paid entries always do.
