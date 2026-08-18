# OneShirt Rebuild — Implementation Documentation

This folder is the **complete specification for rebuilding OneShirt from scratch** on a new stack. It is written so that an AI coding agent (or human team) can implement the app without access to this repository's legacy code. Where legacy code is worth consulting, the doc says so explicitly.

> **Status (2026-08-18):** the rebuild described here has been implemented — the app lives in [../app/](../app/) and is **live at [https://oneshirt.app](https://oneshirt.app)** (Convex dev deployment, Clerk/Stripe test mode, Printify unconfigured; see the [status section of ../app/README.md](../app/README.md#current-status-2026-08-18)). These docs remain the behavioral/architectural source of truth. Implementation deltas beyond the spec so far: `bids.placeBid` accepts an optional `count` (batch/multi-bid, all-or-nothing funding, stops at threshold), `notifications.list`/`unreadCount` are guest-tolerant, and `admin.internalSetRole` exists as a CLI-only ops mutation.

## The one-paragraph brief

OneShirt is a mobile-first web app where users swipe through AI-generated t-shirt designs Tinder-style. Swiping right places a **1-credit bid** on the shirt, and every bid is an **entry in that shirt's prize draw**. When a shirt reaches its visible bid threshold (e.g. 600 bids), one bid is drawn at random and that user **wins the physical shirt free** (fulfilled via Printify print-on-demand). Credits are never lost: every credit spent bidding remains **full-value store credit** redeemable toward buying any shirt at retail. This "entries come free with a fair-value purchase" structure is what keeps the mechanic a legal **sweepstakes**, not gambling — see [02-game-mechanics.md](02-game-mechanics.md).

## Target stack (decided — do not substitute)

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite, Tailwind (bundled, NOT CDN), Framer Motion |
| Backend / DB / realtime / storage | **Convex** |
| Auth | **Clerk** (magic link / email code), first-party Convex integration |
| Payments | **Stripe** (credit packs + retail checkout top-ups) |
| AI image generation | **Fal.ai `fal-ai/nano-banana-2`** (+ `fal-ai/birefnet` background removal) |
| Fulfillment | **Printify** API (print-on-demand, one-off orders, webhooks) |

## Reading order for implementers

1. [01-product-overview.md](01-product-overview.md) — what the product is, users, business model
2. [02-game-mechanics.md](02-game-mechanics.md) — **the core spec**: bidding, draws, credits, economics, legal guardrails
3. [03-architecture.md](03-architecture.md) — system design and key decisions
4. [04-data-model.md](04-data-model.md) — Convex schema
5. [05-backend-functions.md](05-backend-functions.md) — every query/mutation/action, with invariants
6. [06-auth.md](06-auth.md) — Clerk + Convex wiring, roles
7. [07-payments-credits.md](07-payments-credits.md) — Stripe, credit ledger, redemption
8. [08-image-generation.md](08-image-generation.md) — Fal.ai pipeline → print-ready files
9. [09-fulfillment-printify.md](09-fulfillment-printify.md) — win → shirt on doorstep
10. [10-frontend.md](10-frontend.md) — player UI (with [design/frontend-spec.md](design/frontend-spec.md) as the behavior baseline, plus deltas)
11. [11-admin.md](11-admin.md) — admin dashboard
12. [12-security.md](12-security.md) — authorization rules and lessons from the legacy audit
13. [13-build-plan.md](13-build-plan.md) — phased implementation order with verification criteria

## Other documentation in this repo

- [design/frontend-spec.md](design/frontend-spec.md) — screen-by-screen behavior contract for the UI (written against the legacy mechanic; [10-frontend.md](10-frontend.md) lists the deltas).
- [legacy/](legacy/) — documentation of the **old Supabase-based app** (memory-bank, old TODOs). Historical context only; the specs in this folder supersede it wherever they conflict. The legacy code itself (root-level React app, Threadless scraper, image proxy server, Supabase edge functions) was removed from the repo in August 2026 after the rebuild shipped — it remains available in git history if ever needed.

## Ground rules for the implementing agent

1. **Server-authoritative everything.** The legacy app's fatal flaw was client-trusted state (open RLS, client-side admin). In the rebuild, credits, bids, draws, admin checks, and order creation happen only inside Convex functions that derive the caller's identity from Clerk. The client never writes authoritative state directly. See [12-security.md](12-security.md).
2. **No fake activity.** The legacy app simulated other users' bids client-side. Never reintroduce this — fabricated bidding activity in a paid sweepstakes is an FTC problem, not a growth hack.
3. **The credit ledger is append-only.** Every credit movement is a ledger row. Balances are derived/cached, never the source of truth. See [07-payments-credits.md](07-payments-credits.md).
4. **All game parameters are config, not constants.** Thresholds, credit prices, daily caps, free-swipe counts, prize-load targets live in the DB (`gameConfig` + per-shirt overrides) so they can be tuned without deploys.
5. **Secrets stay server-side.** Fal, Printify, Stripe secret, Clerk secret: Convex environment variables only. The browser bundle may contain only Clerk publishable key, Convex URL, and Stripe publishable key.
