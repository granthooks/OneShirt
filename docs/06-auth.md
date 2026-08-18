# 06 — Authentication & Authorization (Clerk + Convex)

## Setup

1. Clerk application with **email magic link** (primary) and **email OTP code** (fallback) enabled. No passwords in v1. Social logins (Google/Apple) optional nice-to-have.
2. Clerk Dashboard → Integrations → **Convex**: creates the JWT template. Set `CLERK_JWT_ISSUER_DOMAIN` in Convex env; configure `convex/auth.config.ts` with the issuer + `applicationID: "convex"`.
3. Frontend providers:
```tsx
<ClerkProvider publishableKey={...}>
  <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
    <App/>
  </ConvexProviderWithClerk>
</ClerkProvider>
```
4. Clerk webhook (user.created / user.updated / user.deleted) → `POST /clerk-webhook` (Svix signature verification with `CLERK_WEBHOOK_SECRET`) → sync `users` table.

## User provisioning

- Primary path: **Clerk webhook** creates the `users` row (welcome credits ledger row, referral code generation, `role: "player"`).
- Backstop: `users.ensureUser` internal helper called by `requireUser` — if an authenticated identity has no row yet (webhook lag), create it idempotently (keyed on `clerkId`). This replaces the legacy app's fragile client-side "create profile on SIGNED_IN" logic.
- Referral: signup URL `?ref=CODE` stored client-side until first authenticated call, passed to `users.applyReferral` once; grant both sides via ledger (idempotent — only if `referredBy` unset).

## Authorization model

- `requireUser(ctx)`: `ctx.auth.getUserIdentity()` → look up by `clerkId` → throw `NOT_AUTHENTICATED` if absent.
- `requireAdmin(ctx)`: `requireUser` + `role === "admin"`. **The `role` field lives in Convex, is set only by `admin.setRole` (or manually in the dashboard for the first admin), and is never accepted from the client.**
- Guests: deck query works unauthenticated (returns public fields only). Every write requires auth.
- The `/admin` route guard in React is cosmetic; security is entirely the server-side checks.

## What this deletes from the legacy app (do not recreate)

- `autoRefreshToken: false` hack, `reinitializeSupabaseClient`, the 340-line init effect with setTimeout races, duplicate `onAuthStateChange` subscriptions — Clerk manages sessions/refresh entirely.
- Client-side user-row creation with client-chosen credit balances (`LoginModal` inserting `credit_balance: 100`) — welcome credits are granted server-side exactly once.
- `is_admin` as a client-readable/writable column gating admin UI.

## Session/UX notes

- Use Clerk's `<SignIn/>`-less headless flow inside the app's own login modal (per the design spec) — `useSignIn` with email → magic link; show "check your email" state; Clerk handles the callback route (`/sign-in/verify` or Clerk's hosted redirect — keep it in-app).
- 18+ attestation checkbox at signup (sweepstakes eligibility), stored via `users.updateProfile`.
