# 03 — Architecture

## System diagram

```
┌────────────────────────────────────────────────────────────┐
│ Browser (React + Vite SPA, mobile-first)                    │
│  ClerkProvider → ConvexProviderWithClerk                    │
│  Player UI (swipe deck, wallet, orders)   Admin UI (/admin) │
└──────────────┬─────────────────────────────────────────────┘
               │ Convex client (reactive queries + mutations)
┌──────────────▼─────────────────────────────────────────────┐
│ Convex deployment                                           │
│  queries    — deck, shirt detail, wallet, orders, admin     │
│  mutations  — placeBid (ACID), claimFreeSwipes, like,       │
│               checkout ops, admin CRUD                      │
│  actions    — executeDraw, generateDesign (Fal), Printify   │
│               calls, Stripe session/webhook handling        │
│  scheduler  — draw delays, expiry sweeps, streak resets     │
│  storage    — design images (print masters + web renders)   │
│  http router— /stripe-webhook, /printify-webhook            │
└───────┬───────────────┬───────────────┬────────────────────┘
        ▼               ▼               ▼
     Clerk           Stripe          Printify        Fal.ai
  (identity,     (credit packs,   (POD products,   (nano-banana-2,
   JWT → Convex)  checkout,        one-off orders,  birefnet bg
                  webhooks)        webhooks)        removal)
```

## Key decisions and rationale

1. **Convex mutations are the transaction boundary.** Every mutation is a serializable ACID transaction. `placeBid` does credit-check + ledger write + entry insert + count increment + threshold detection + state transition in one mutation — the atomicity the legacy app got from the `place_bid` PL/pgSQL function, but with authorization built in (identity from Clerk JWT via `ctx.auth`). There is no path to authoritative state except through these functions.
2. **Reactive queries replace realtime plumbing.** Convex queries are live subscriptions. The deck, bid counts, wallet balance, and draw status update automatically — no channels, no reconnection logic, and no need for the legacy app's fake-bid simulator (real liveness comes free).
3. **External calls live in actions.** Fal, Printify, and Stripe are called from Convex actions (non-transactional), which then commit results via internal mutations. Actions are idempotent where re-runnable (draw execution checks the shirt is still `drawing`; Printify order creation records an idempotency key first).
4. **Webhooks over polling.** Stripe (payment completed) and Printify (order status/tracking) push into Convex HTTP endpoints, verified by signature, which run internal mutations.
5. **Two image renditions per design.** A `printMasterId` (2K+ PNG, background removed, stored at generation time — Printify needs a durable file) and a `webImageId` (compressed webp for cards). Never store base64 in documents; always Convex storage.
6. **Single SPA, two zones.** Player app at `/`, admin at `/admin` behind server-verified role (route guard is UX only; every admin function re-checks role server-side).
7. **Config in the database.** `gameConfig` singleton + per-shirt overrides; admin-editable; no redeploys to tune the game.
8. **Frontend is a thin renderer.** No business rules client-side. The client displays what queries return and calls mutations; all validation and guards re-run on the server (client-side checks are UX sugar only).

## What is deliberately absent (legacy components not ported)

- **Image proxy server** (`server/`) — SSRF-prone open proxy, only needed for scraping. Dropped.
- **Threadless scraper** (`scraper/`) — copyright liability + client-exposed proxy credentials. Dropped.
- **Supabase everything** — schema, RLS, edge function, migrations. Replaced wholesale.
- **CDN import map + Tailwind CDN** in index.html — replaced by normal Vite bundling and Tailwind as a build dependency.

## Environments & secrets

| Where | Values |
|---|---|
| Browser (public) | `VITE_CONVEX_URL`, `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY` |
| Convex env vars (secret) | `CLERK_JWT_ISSUER_DOMAIN`, `CLERK_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `FAL_KEY`, `PRINTIFY_API_TOKEN`, `PRINTIFY_SHOP_ID` |

Dev/prod are separate Convex deployments, separate Clerk instances, Stripe test mode, and a Printify sandbox-ish flow (orders created but not auto-approved in dev).
