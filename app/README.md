# OneShirt (rebuild)

A from-scratch rebuild of OneShirt — a swipe-to-enter shirt giveaway app —
on Convex + Clerk + Vite/React, per the spec in [`../docs`](../docs)
(start with [`../docs/README.md`](../docs/README.md) and
[`01-product-overview.md`](../docs/01-product-overview.md)).

## Current status (2026-08-18)

**Live at [https://oneshirt.app](https://oneshirt.app)** — deployed via
self-hosted Coolify (see [Deployment](#deployment) below); pushes to
`main` auto-deploy.

Working end-to-end (all verified against the cloud dev deployment):

- **Player**: guest deck browsing, Clerk email-code signup/login with 18+
  attestation (welcome credits + 5 daily free swipes on first touch),
  swipe deck with drag physics, single & **multi-bid** (×1/×5/×10/×25
  picker; atomic batch with free-swipes-first, entry-cap and
  threshold-stop rules), likes, early-bird 2× entries, wallet
  (balance/staked breakdown, daily claim + streak, ledger), buy-credits
  via **live Stripe Checkout** (test mode) with idempotent webhook
  fulfillment, My Bids, Orders, Buy It Now flow (size/address/credit
  application), notifications center, profile page + modal, rules page,
  shirt share pages, win/draw-imminent overlays.
- **Admin** (`/admin`): dashboard stats + activity, inventory
  (create/activate with prize-load warning/archive/edit), Generate
  (fal.ai wired), users (credit grants, role toggle), orders, draw audit
  log, config editor.
- **Draws/crons**: threshold → scheduled CSPRNG draw with audit row,
  unstaking, notifications, prize-order creation; hourly expiry sweep and
  draw watchdog; daily Printify reconciliation.

**Not yet production-grade** (works, but in dev/test mode):

| Area | Current | For production |
|---|---|---|
| Convex | **dev** deployment `impartial-jellyfish-878` | `npx convex deploy` to a prod deployment; update `VITE_CONVEX_URL` build var + webhook URLs |
| Clerk | dev instance `tolerant-possum-63` (`pk_test`) | Production Clerk instance (needs DNS records on oneshirt.app) |
| Stripe | test mode keys/webhook | Live keys + live-mode webhook endpoint |
| Printify | not configured | Set `PRINTIFY_API_TOKEN` / `PRINTIFY_SHOP_ID` |
| Data | test user + demo/test shirts and bids | Wipe via Convex dashboard before launch |

Spec deltas implemented beyond `../docs/05-backend-functions.md`:
`bids.placeBid` accepts optional `count` (1–25, all-or-nothing funding,
batch stops at threshold, returns `placedCount`); `admin.internalSetRole`
(CLI-only ops mutation); `notifications.list/unreadCount` are
guest-tolerant (return empty rather than throw).

Players swipe through a deck of active shirt designs, stake credits to
enter each shirt's draw, and winners get their shirt printed and shipped
via Printify. Credits are purchased with Stripe. Designs are generated
with fal.ai and reviewed by admins before going live.

## Stack

| Layer            | Technology                                   |
| ----------------- | --------------------------------------------- |
| Frontend           | React 19 + Vite 7 + TypeScript + Tailwind v4  |
| Routing            | react-router-dom v7                            |
| Backend            | Convex (functions, DB, file storage, crons)   |
| Auth               | Clerk (email-code sign-in)                     |
| Payments           | Stripe Checkout                                |
| Image generation   | fal.ai                                          |
| Print fulfillment  | Printify                                        |
| Animation          | Framer Motion                                   |

## Quickstart (guest preview — no keys needed beyond Convex)

```bash
npm install
npx convex dev     # starts a local Convex deployment, leave running
npm run dev         # starts Vite, leave running
```

Open the URL Vite prints (typically `http://localhost:5173`). With only
`VITE_CONVEX_URL` set (see below), the app runs in **guest-preview mode**:
the deck loads and is fully browsable, but attempting to log in shows a
notice instead of a real auth flow (Clerk isn't configured). This is the
fastest way to see the UI without setting up Clerk/Stripe/fal/Printify.

`npx convex dev` on first run creates an anonymous local deployment and
writes `CONVEX_DEPLOYMENT` + `VITE_CONVEX_URL` into `.env.local` for you
(gitignored). Seed demo data into it with:

```bash
npx convex run seed:seedDemo
```

This is a guarded no-op if shirts already exist, so it's safe to re-run.

## Full setup (real auth + payments + generation + fulfillment)

> **Status for `impartial-jellyfish-878` (dev deployment):** Clerk (JWT
> template, `CLERK_JWT_ISSUER_DOMAIN`, `/clerk-webhook` + secret), Stripe
> (keys, `/stripe-webhook` + secret), `SITE_URL`, and `FAL_KEY` are all
> DONE and verified end-to-end (see per-section notes below). Only
> Printify is not configured.

### 1. Clerk

1. Create a Clerk application. **DONE** — `tolerant-possum-63`.
2. Add a **JWT template** named exactly `convex` (Clerk dashboard → JWT
   Templates → New template → Convex preset). Convex validates the
   `aud`/issuer against this template — the name must be `convex`
   (see `convex/auth.config.ts`). **DONE** — already existed on this instance.
3. Copy the app's **Publishable key** into `VITE_CLERK_PUBLISHABLE_KEY`
   (client-side, `.env.local`). **DONE**.
4. Copy the **Issuer domain** (Clerk dashboard → JWT Templates → convex →
   Issuer, or API Keys page) into the Convex-side env var
   `CLERK_JWT_ISSUER_DOMAIN` (see env var table below for how to set
   Convex-side vars). **DONE**.
5. Add a webhook endpoint pointing at
   `<your-convex-site-url>/clerk-webhook` (get the site URL from
   `npx convex dashboard` or `VITE_CONVEX_SITE_URL` in `.env.local`)
   subscribed to `user.created` and `user.updated`. Copy its **Signing
   secret** into `CLERK_WEBHOOK_SECRET`. **DONE** — endpoint created
   manually in the Clerk dashboard (Clerk's Backend API has no
   endpoint-creation route) at
   `https://impartial-jellyfish-878.convex.site/clerk-webhook`, secret set
   via `npx convex env set CLERK_WEBHOOK_SECRET`. Verified 2026-08-15:
   unsigned requests are rejected (400), and a `user.updated` fired from
   the Clerk API propagated to the Convex `users` row within seconds.
   (Even without this, `users.ensureUser` does first-touch user creation
   on sign-in.)

With both `VITE_CONVEX_URL` and `VITE_CLERK_PUBLISHABLE_KEY` set, the app
runs its normal authenticated flow (email-code login via `LoginModal`).

### 2. Stripe

1. Create Stripe credit-pack prices and set them via `admin.updateConfig`
   (`creditPacks`, each with a `stripePriceId`) — see the Config page in
   the admin UI once you have an admin user (below). **SKIPPED** — not
   needed: `convex/stripe.ts` builds Checkout Sessions with inline
   `price_data` (name/amount from `gameConfig.creditPacks`), it never
   reads `stripePriceId`. That field is unused dead config for now.
2. Set `STRIPE_SECRET_KEY` (Convex-side). **DONE**.
3. Add a webhook endpoint at `<site-url>/stripe-webhook` listening for
   `checkout.session.completed`. Copy its signing secret into
   `STRIPE_WEBHOOK_SECRET`. **DONE** — endpoint id `we_1U4dPTPFPQ5OmRjGKqtMmwz3`,
   created via Stripe API, secret set as `STRIPE_WEBHOOK_SECRET`.
4. Set `SITE_URL` (Convex-side) to your deployed app origin — used to
   build Stripe Checkout success/cancel redirect URLs. **DONE** —
   `https://oneshirt.app` (since the 2026-08-18 deployment).

### 3. fal.ai (design generation)

Set `FAL_KEY` (Convex-side) with a fal.ai API key. Used by
`convex/generation.ts` for the admin "Generate Designs" flow. **DONE**.

### 4. Printify (fulfillment)

Set `PRINTIFY_API_TOKEN` and `PRINTIFY_SHOP_ID` (Convex-side). Optionally
set `PRINTIFY_WEBHOOK_SECRET` and add a webhook at
`<site-url>/printify-webhook` for order-status updates (shipped/delivered
notifications) — signature verification is skipped if this is unset.

## Deployment

The frontend is a static SPA served by nginx, built by the multi-stage
[`Dockerfile`](Dockerfile) (Node 22 build → nginx:alpine with
[`nginx.conf`](nginx.conf) providing the SPA fallback and asset caching).
The Convex backend is not part of the container — the bundle talks to the
Convex cloud deployment baked in at build time.

Production hosting is a **self-hosted Coolify** instance:

- Application `OneShirt.app` (uuid `rcksgckkosgsc8g4gskk8gs4`, project
  "Agentic Services Apps"), domain `https://oneshirt.app` with automatic
  Let's Encrypt TLS via Traefik.
- Source: the public GitHub repo `granthooks/OneShirt`, branch `main`,
  via GitHub App — **pushes to `main` auto-deploy**.
- Build pack `dockerfile`, base directory `/app`, exposed port `80`.
- Build-time env vars (Coolify → app → Environment Variables, marked
  build-time; baked into the JS bundle): `VITE_CONVEX_URL`,
  `VITE_CLERK_PUBLISHABLE_KEY`. Changing either requires a redeploy.
- Gotcha fixed 2026-08-18: the app's stored Traefik labels pointed at
  port 3000 from its pre-rebuild config, causing 502s — if routing ever
  breaks after a config change, check the custom labels' `loadbalancer.server.port`.

## Environment variables

**Client-side** (`.env.local` at the repo root, `VITE_`-prefixed, bundled
into the browser build — never put secrets here):

| Variable                        | Required | Purpose                                                |
| -------------------------------- | -------- | ------------------------------------------------------- |
| `VITE_CONVEX_URL`                 | Yes      | Convex deployment URL. Without it, the app shows a "SETUP NEEDED" screen. |
| `VITE_CLERK_PUBLISHABLE_KEY`      | No       | Clerk publishable key. Without it, the app runs in guest-preview mode (no login). |
| `VITE_CONVEX_SITE_URL`            | No       | Convex HTTP Actions origin (for constructing webhook URLs in docs/setup only — not read by app code). |

**Convex-side** (set via `npx convex env set NAME value` or the Convex
dashboard → Settings → Environment Variables — never in `.env.local`):

| Variable                    | Used by                                    | Purpose                                    |
| ---------------------------- | -------------------------------------------- | -------------------------------------------- |
| `CLERK_JWT_ISSUER_DOMAIN`    | `convex/auth.config.ts`                       | Validates Clerk-issued session JWTs.        |
| `CLERK_WEBHOOK_SECRET`       | `convex/http.ts` (`/clerk-webhook`)           | Verifies Clerk webhook signatures (svix).   |
| `STRIPE_SECRET_KEY`          | `convex/stripe.ts`, `convex/http.ts`          | Creates Checkout sessions; verifies webhook. |
| `STRIPE_WEBHOOK_SECRET`      | `convex/http.ts` (`/stripe-webhook`)          | Verifies Stripe webhook signatures.         |
| `FAL_KEY`                    | `convex/generation.ts`                        | fal.ai design generation.                    |
| `PRINTIFY_API_TOKEN`         | `convex/printify.ts`                          | Printify API auth.                           |
| `PRINTIFY_SHOP_ID`           | `convex/printify.ts`                          | Target Printify shop for order submission.   |
| `PRINTIFY_WEBHOOK_SECRET`    | `convex/http.ts` (`/printify-webhook`)        | Optional HMAC verification for order updates.|
| `SITE_URL`                   | `convex/stripe.ts`                            | Base URL for Stripe redirect URLs.           |

## Seeding

`npx convex run seed:seedDemo` inserts ~6-8 demo shirts (no fake bids or
entries, per game-mechanics rule against fabricated activity). It's an
`internalMutation`, callable via the CLI in local dev; guarded to no-op
if any shirt already exists, so it's idempotent.

## Admin promotion

Admin-only mutations/queries (`convex/admin.ts`) require an existing
admin (`requireAdmin`), and `admin.setRole` itself requires the caller to
already be an admin — so a fresh deployment has no way to create its
*first* admin through the normal app. Two ways to bootstrap one:

**Preferred:** log in as the user you want to promote, then run:

```bash
npx convex run admin:bootstrapFirstAdmin
```

This is a guarded mutation that promotes the *authenticated caller*
(resolved via their current Convex auth session — so it must be run in a
context with credentials, e.g. via the Convex dashboard's function runner
while logged in, or adapted into a temporary authenticated script) and
only succeeds while zero admins exist in the `users` table; once any
admin exists it always throws `ADMIN_ALREADY_EXISTS`.

**CLI ops route (works anytime):** `admin.internalSetRole` is an
`internalMutation` (unreachable from clients) that patches a user's role
by email:

```bash
npx convex run admin:internalSetRole '{"email":"you@example.com","role":"admin"}'
```

Equivalently, edit the `role` field directly in the Convex dashboard
(`npx convex dashboard` → Data → `users`).

## Scripts

| Command                                        | Purpose                                    |
| ------------------------------------------------ | -------------------------------------------- |
| `npm install`                                     | Install dependencies.                        |
| `npx convex dev`                                  | Run/watch the local Convex backend (also provisions a deployment + `.env.local` on first run). |
| `npm run dev`                                     | Run the Vite dev server.                     |
| `npm run build`                                   | Typecheck (`tsc -b`) + production build.     |
| `npm run preview`                                 | Preview the production build locally.        |
| `npx convex run seed:seedDemo`                    | Seed demo shirt data (idempotent).           |
| `npx convex dev --once --typecheck=enable`        | One-shot push + typecheck of Convex functions (useful in CI). |

## Architecture map

```
convex/
  schema.ts            Table definitions (users, shirts, bids, entries, orders, ...)
  auth.config.ts        Clerk JWT provider config
  http.ts                HTTP Actions: /clerk-webhook, /stripe-webhook, /printify-webhook
  users.ts               User creation/lookup, ensureUser, wallet-adjacent user fields
  shirts.ts              Deck queries, shirt detail (guest-safe reads)
  bids.ts                 Staking credits / entering a shirt's draw
  draws.ts                Draw resolution logic
  likes.ts                Swipe-like tracking
  wallet.ts               Credit balance + ledger-facing queries
  orders.ts               Order lifecycle (created -> paid -> submitted -> shipped)
  notifications.ts        In-app notifications (win results, order updates, etc.)
  addresses.ts            Shipping address CRUD
  generation.ts            fal.ai design generation (admin)
  generation_helpers.ts    Internal helpers for generation.ts
  printify.ts              Printify API client (submit order, etc.)
  printify_helpers.ts      Internal helpers for printify.ts
  printify_webhook.ts      Applies Printify webhook status updates
  stripe.ts                Stripe Checkout session creation
  stripe_helpers.ts        Internal helpers for stripe.ts (pack fulfillment)
  admin.ts                 Admin dashboard stats, moderation, config, role management
  crons.ts                 Scheduled jobs (e.g. draw resolution, shirt expiry)
  seed.ts                   Demo data seeding
  lib/
    auth.ts                requireUser / requireAdmin / getUserOrNull
    config.ts               Runtime app config (credit packs, thresholds, etc.)
    ledger.ts                Credit ledger posting helper

src/
  main.tsx                Entry point: SETUP NEEDED screen, guest-vs-Clerk provider branch
  App.tsx                  Top-level route table (player routes + /admin/*)
  lib/
    authConfig.tsx          `authConfigured` context — guest vs Clerk mode flag
    shirtArt.ts              Shirt art/placeholder helpers
  hooks/
    useCurrentUser.ts        Wraps Clerk auth state + users.me query (guest-aware)
  components/               Shared player-facing UI (header, swipe deck, modals, toasts)
  pages/                    Player routes: deck, wallet, bids, orders, profile, etc.
  admin/
    AdminApp.tsx             /admin/* entry point, client-side admin gate
    components/               Admin layout/nav
    pages/                     Dashboard, Inventory, Generate, Users, Orders, Draws, Config
```

## Guest-preview mode implementation notes

`src/lib/authConfig.tsx` exposes an `authConfigured` boolean via React
context, set once in `main.tsx` based on whether
`VITE_CLERK_PUBLISHABLE_KEY` is present. Components that call Clerk hooks
(`useAuth`, `useClerk`, `useSignIn`, `useSignUp`) branch into separate
Clerk/guest child components based on this flag — Clerk hooks throw when
called outside a `ClerkProvider`, so the guest branch never calls them at
all rather than skipping their result:

- `useCurrentUser` — Clerk-backed vs a static signed-out guest result.
- `AppHeader` — the logout menu item (`useClerk().signOut`) is isolated
  into its own component, only rendered when `authConfigured`.
- `LoginModal` — routes to the real Clerk email-code flow, or a guest
  notice ("Auth not configured — add VITE_CLERK_PUBLISHABLE_KEY").

`shirts.getDeck` is guest-safe server-side (omits per-user fields for
unauthenticated callers), so deck browsing works fully in guest mode.
