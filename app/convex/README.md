# Convex backend

Full schema, queries, mutations, and actions are wired for the OneShirt
rebuild (game mechanics, payments, image generation, fulfillment).

To start the Convex dev deployment:

```
npx convex dev
```

This generates `convex/_generated/` and prompts for project setup.

`auth.config.ts` in this folder wires Clerk as the JWT identity provider per
`docs/06-auth.md`.

## Environment variables

Set these in the Convex dashboard (**Settings → Environment Variables**) or
via `npx convex env set NAME value`. They are server-side only — never
exposed to the client bundle.

| Variable | Used by | Notes |
|---|---|---|
| `CLERK_JWT_ISSUER_DOMAIN` | `auth.config.ts` | Clerk JWT issuer for identity verification |
| `CLERK_WEBHOOK_SECRET` | `http.ts` (`/clerk-webhook`) | svix signing secret from the Clerk webhook dashboard |
| `STRIPE_SECRET_KEY` | `stripe.ts`, `http.ts` (`/stripe-webhook`) | Stripe secret API key |
| `STRIPE_WEBHOOK_SECRET` | `http.ts` (`/stripe-webhook`) | Stripe webhook signing secret (`whsec_...`) |
| `SITE_URL` | `stripe.ts` | Base URL for Checkout success/cancel redirects, e.g. `https://oneshirt.app` |
| `FAL_KEY` | `generation.ts` | fal.ai API key for AI design generation |
| `PRINTIFY_API_TOKEN` | `printify.ts` | Printify Personal Access Token |
| `PRINTIFY_SHOP_ID` | `printify.ts` | Printify shop id |
| `PRINTIFY_WEBHOOK_SECRET` | `http.ts` (`/printify-webhook`) | Optional — HMAC-SHA256 shared secret; if unset, webhook signature verification is skipped (dev only) |

Functions that need one of these and find it missing throw
`ConvexError("NOT_CONFIGURED: ...")` with the specific variable name rather
than crashing ambiguously — this surfaces as a clear toast in the client
(e.g. "Payments aren't set up yet").

Client-side env vars (`VITE_CONVEX_URL`, `VITE_CLERK_PUBLISHABLE_KEY`) live in
the repo root `.env.local` — see `.env.local.example`.

## HTTP endpoints (`http.ts`)

- `POST /clerk-webhook` — user created/updated/deleted sync (svix-verified).
- `POST /stripe-webhook` — `checkout.session.completed` fulfills credit
  packs or finalizes Buy-It-Now order remainders (Stripe-signature verified
  via `stripe.webhooks.constructEventAsync`).
- `POST /printify-webhook` — `order:updated` / `order:sent-to-production`
  maps Printify status to ours, saves tracking, notifies the user.

## Node-runtime modules

`stripe.ts`, `generation.ts`, and `printify.ts` are marked `"use node"`
because they depend on the `stripe` and `@fal-ai/client` npm packages
(Node-only). Their internal query/mutation helpers live in sibling
`*_helpers.ts` files (`stripe_helpers.ts`, `generation_helpers.ts`,
`printify_helpers.ts`) since Node-runtime action files cannot define
queries/mutations directly. `http.ts` itself runs in the default (V8)
runtime and uses Stripe's `constructEventAsync` (Web Crypto-based) for
webhook verification without needing Node.

## Known deviations

- **Print master validation** (`admin.activateShirt`): docs/08 calls for
  PNG + ≥1800px short side + transparency checks. Convex mutations can't
  fetch/decode image bytes, so only the PNG content-type check (via
  storage metadata) is enforced today. Full dimension/transparency
  validation would need to run in an action (e.g. during
  `generation.generateDesign`, which already fetches the bytes) — flagged
  for a follow-up.
- **Web image rendition** (`generation.ts`): docs/08 step 3c calls for a
  downscaled/composited webp web image distinct from the print master.
  V1 stores the same transparent PNG for both `printMasterId` and
  `webImageId` (per the doc's own "accept PNG at reduced size for v1
  simplicity" fallback) — no wasm image-processing lib is wired in yet.
