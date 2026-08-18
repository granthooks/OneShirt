# 07 — Payments & the Credit Ledger (Stripe)

## Credit packs

Defined in `gameConfig.creditPacks`, mirrored as Stripe Prices. Launch defaults (tune freely):

| Pack | Credits | Price | Effective $/credit |
|---|---|---|---|
| Starter | 50 | $4.99 | 10.0¢ |
| Popular | 120 | $9.99 | 8.3¢ |
| Big | 300 | $21.99 | 7.3¢ |

Keep ~$0.10 as the anchor; pack discounts reward prepayment (float + commitment). Prize-load math in [02-game-mechanics.md](02-game-mechanics.md) assumes ~8–10¢ effective.

## Purchase flow (credit packs)

1. Client: `stripe.createCheckoutSession({packIndex})` action → Stripe Checkout (hosted) with `client_reference_id = userId`, `metadata: {kind: "credits", packIndex}`.
2. Redirect back to `/wallet?status=success|canceled` (UI state only — never grant on redirect).
3. Webhook `checkout.session.completed` → verify signature → internal mutation: **idempotent on `stripePaymentIntentId`** → ledger `purchase` (+credits), update cached balance, notification.

## Retail purchase flow (Buy It Now)

Handled by `orders.startPurchase` ([05-backend-functions.md](05-backend-functions.md)): credit applied first (available, then staked with entry withdrawal — clearly disclosed), Stripe Checkout for the cash remainder (`metadata: {kind: "order", orderId}`). Order finalizes (→ Printify) only on webhook confirmation; a `pending_info`/`pending` order older than 24h with no payment is auto-canceled and credits restored by the daily cron.

## Ledger discipline (the accounting core)

- **Append-only.** No row is ever updated or deleted. Corrections are new `admin_adjust` rows with notes.
- Every mutation that moves credits writes the ledger row(s) **and** updates the `users` cached balances in the same transaction.
- `stake`/`unstake` pairs move value between available and staked; they sum to zero across a bid's lifetime unless redeemed.
- `redeem` rows carry `orderId`; a redeemed credit's cent value at redemption = face value (1 credit = the pack anchor 10¢ for accounting display; the product surfaces credits, not cents, everywhere user-facing).
- Reporting queries (admin): credits sold (cash in), credits redeemed (COGS-bearing), credits outstanding (liability), breakage estimate (outstanding × aging curve), prize spend. These four numbers are the business dashboard.

## Refunds & disputes

- Stripe refund (admin-initiated) → webhook `charge.refunded` → ledger `admin_adjust` negative with note; if balance would go negative, allow negative balance and block bidding until repaid (simplest; rare case).
- Chargebacks: freeze account (`role` stays but a `frozen` flag blocks mutations — add boolean to users) pending review.

## Compliance notes

- Sell **credits/store credit**, not "chances." All Stripe product copy says "store credit"; the sweepstakes entries are a free promotional bonus per the official rules. This matters for both card-network rules and the legal structure.
- No credit expiry in v1 (several states restrict gift-card expiry; simplest to have none).
- Sales tax: credits are not taxed at sale; tax applies at redemption/purchase (Stripe Tax on checkout, and include tax handling on credit-covered orders per state rules — flag for accountant review; v1 US-only).
