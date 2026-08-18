# 01 — Product Overview

## What OneShirt is

A gamified print-on-demand t-shirt store. The storefront is a **Tinder-style swipe deck** of shirt designs; the game layer is a **sweepstakes**: each 1-credit swipe-right is both a bid toward a shirt's visible threshold and an entry in that shirt's random prize draw. The commerce layer is a normal POD store: every design can be bought outright at retail, and all credits ever spent on bids remain redeemable at full value toward purchases.

**Tagline:** Swipe. Bid. Win. Wear.

## Why this shape (business model)

The sweepstakes is the acquisition funnel and the reason users prepay for credit; the **store is the business**. Unit economics (see [02-game-mechanics.md](02-game-mechanics.md) §Economics for the full model):

- Credits sell at ~$0.10 (in packs). A shirt's draw triggers at its threshold (default **600 bids** = $60 pool).
- Prize cost is ~$15 landed (Printify Bella+Canvas 3001 + US shipping) → **~25% prize load**, treated as a marketing line item.
- Retail price ~$34.99 against ~$15 COGS → ~57% gross margin on redemptions and direct purchases.
- Additional margin from credit **breakage** (unredeemed credit) and **float** (credits are prepaid).

Target: prize load stays within **15–25% of pool** on every shirt. This is enforced by admin tooling that computes prize load when setting thresholds ([11-admin.md](11-admin.md)).

## User types

| Type | Identified by | Capabilities |
|---|---|---|
| Guest | No Clerk session | Browse/swipe the deck visually; cannot bid, like, or buy. Prompted to sign up on first bid attempt. |
| Player | Clerk session | Swipe/bid, like, buy shirts, manage profile & addresses, view their entries/wins/orders, claim daily free swipes. |
| Admin | Player with server-side `role: "admin"` | Everything a player can, plus the admin dashboard: catalog, drops, users, orders, generation, config, economics. |

## The core loop

1. User signs up (Clerk magic link) → receives welcome credits (config, default 20) + daily free swipes.
2. Swipes through the deck. Right = 1-credit bid + 1 draw entry; left = skip; heart = like (free).
3. Card shows live progress: `437/600 bids · your entries: 12 · draws when full`.
4. Shirt hits threshold → server draws a random entry within minutes → winner notified (push/email + in-app celebration), everyone with entries notified of the result.
5. Winner's shirt auto-orders via Printify to their address (size from profile; prompt to confirm if missing).
6. Non-winners keep their credit; any shirt page offers **Buy It Now** at retail, payable with credit + Stripe top-up.
7. Daily free swipes + streak bonuses bring users back; expired (undrawn) shirts refund entries as general credit.

## What's deliberately NOT in v1

- Native mobile apps (mobile web only, installable PWA is a stretch goal).
- User-generated designs / designer marketplace (v2 candidate; schema leaves room via `shirts.designer`).
- Threadless scraping/import (**dropped permanently** — copyright liability; all designs are AI-generated or licensed).
- Auctions, bid amounts, or any strategic bidding UI. One swipe = one credit = one entry. Always.
- Secondary prizes/cash prizes (keeps sweepstakes compliance simple).

## Success metrics (build analytics hooks for these)

- Activation: % of signups placing ≥1 paid bid within 48h.
- D7 retention; daily free-swipe claim rate.
- Credit purchase conversion and average pack size.
- Prize load actual vs target per shirt; redemption rate; breakage.
- Draw participation: unique bidders per shirt (a draw with 3 whales is a design failure — see entry caps in [02-game-mechanics.md](02-game-mechanics.md)).
