# 13 — Phased Build Plan

Rebuild from scratch in a fresh project structure (keep this repo's `docs/` and `images/`; nothing else needs to survive — legacy code is reference-only). Each phase ends with explicit verification; don't start the next phase until the checks pass.

**Data migration note:** there is no production user base worth migrating (legacy DB security was open; balances are untrustworthy). Start with a clean database. If any real early users exist, re-grant them welcome credits manually via `admin.adjustCredits`.

## Phase 0 — Scaffold
Vite + React + TS + Tailwind (bundled) + Convex + Clerk providers wired; deploy dev Convex; CI (typecheck, lint, bundle-secret grep).
✅ Verify: blank app authenticates a user via magic link; `users` row appears via webhook/ensureUser.

## Phase 1 — Core schema + wallet
`schema.ts` per [04-data-model.md](04-data-model.md); `requireUser/requireAdmin`; welcome credits; `wallet.get`; ledger invariant tests.
✅ Verify: new signup shows 20 credits; ledger sums equal cached balance under a randomized-ops property test.

## Phase 2 — Deck + bidding + draws (the game)
`shirts.getDeck`, `bids.placeBid` (all rules: free-swipe-first, early-bird, entry cap, threshold → drawing), `draws.execute` + scheduler, expiry cron, likes, notifications table. Seed shirts with placeholder images. Minimal functional UI (unstyled ok).
✅ Verify: scripted 600 bids across N test users triggers exactly one draw; winner recorded with audit row; non-winners' credits return to available; concurrent double-spend test passes; entry cap and early-bird weights observable in data.

## Phase 3 — Player UI (new design)
Implement the supplied visual design over [10-frontend.md](10-frontend.md) + [design/frontend-spec.md](design/frontend-spec.md): swipe deck with progress, wallet, My Bids, draw moments, rules page, notification center.
✅ Verify: Playwright flows — guest browse → signup → free swipe → paid bid → cap → out-of-credits sheet; two browsers see each other's bids live (reactivity).

## Phase 4 — Stripe credits
Packs, checkout action, webhook, idempotency ([07-payments-credits.md](07-payments-credits.md)).
✅ Verify: Stripe test-mode purchase credits exactly once despite webhook replay; canceled checkout grants nothing.

## Phase 5 — Image generation
Fal pipeline ([08-image-generation.md](08-image-generation.md)) + admin Generate page + print-master validation.
✅ Verify: prompt → 4 candidates → selected design becomes an activatable shirt with valid 2K transparent print master in Convex storage.

## Phase 6 — Printify fulfillment
ensureProduct, submitOrder, webhooks, reconciliation cron, pending_info flow ([09-fulfillment-printify.md](09-fulfillment-printify.md)); Buy It Now purchase flow end-to-end (credit application + entry withdrawal + Stripe remainder).
✅ Verify: test draw creates a real Printify order (manual-approval mode) with correct variant/address; webhook updates status+tracking; purchase with mixed credit/cash decrements entries correctly.

## Phase 7 — Admin dashboard
All pages per [11-admin.md](11-admin.md), including prize-load warnings and draw audit page.
✅ Verify: non-admin hitting admin functions gets rejected server-side (test with a forged client call, not just hidden UI).

## Phase 8 — Launch hardening
Rate limits, frozen-account flag, email delivery (win/ship/draw-imminent), referral + streaks, share cards, [12-security.md](12-security.md) checklist, legal review of rules/terms, analytics events ([01-product-overview.md](01-product-overview.md) §metrics).
✅ Verify: full checklist signed off; load test placeBid at expected launch concurrency.

## Post-launch backlog (ordered)
1. Web push notifications. 2. Scheduled drops ("10 new designs every Friday noon") with countdown teaser. 3. Player-paid generation ("make your own shirt"). 4. Designer marketplace/rev-share. 5. PWA install. 6. Additional garments (hoodies/stickers with low thresholds for cheap dopamine).
