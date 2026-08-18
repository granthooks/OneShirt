# 12 — Security & Authorization

The legacy app's audit found: fully open RLS (any client could grant itself credits/admin), client-side-only admin gating, a paid API key compiled into the browser bundle, an SSRF-able open image proxy, and client-writable game state. The rebuild's security model exists to make that entire class of bug structurally impossible.

## Principles

1. **Single write path.** Clients can only call Convex functions. Every public mutation begins with `requireUser`/`requireAdmin`; identity comes from the Clerk JWT (`ctx.auth`), never from arguments. There is no direct table access from the client and no "anon key" equivalent to abuse.
2. **Authoritative state is server-computed.** Credits, entries, bid counts, draw outcomes, roles, order status: computed and written only inside mutations/actions. The client sends intents (`placeBid(shirtId)`), never values (`newBalance`). Reject any PR that accepts a balance, count, or role from the client.
3. **Money = ledger.** Append-only `creditLedger`; cached balances updated transactionally with ledger writes; idempotency keys on every external-money event (Stripe payment intent id, Printify order external_id, draw execution status check).
4. **Secrets server-side only.** `FAL_KEY`, `PRINTIFY_API_TOKEN`, `STRIPE_SECRET_KEY`, webhook secrets: Convex env vars. Browser gets only publishable keys. CI check: grep the built bundle for `sk_`, `FAL`, `PRINTIFY` patterns.
5. **Webhooks verified.** Stripe signature, Clerk (Svix) signature, Printify shared secret — reject unverified; log rejects.
6. **No server-side fetching of user-supplied URLs.** The legacy image proxy and scraper are gone. Images enter the system only from Fal responses and Convex storage. If a URL-import feature ever returns, it needs a strict host allowlist, redirect re-validation, and private-IP blocking.

## Abuse & fraud controls (v1 scope)

- **Rate limits** (per user, enforced in mutations with a simple sliding-window table or convex rate-limiter component): bids ≤ 1/sec and ≤ 500/day; generation ≤ 30/day (admin); auth-adjacent mutations modest.
- **Per-shirt entry cap** (game rule, but also the main anti-whale/anti-sybil economic control).
- **Free-swipe abuse**: free swipes require an account; Clerk bot protection + email verification are the sybil gate. Monitor: accounts with only-free entries winning draws at anomalous rates → admin report.
- **Frozen accounts**: `frozen` flag blocks all mutations except reading own data; set on chargeback or admin action.
- **Draw integrity**: CSPRNG, persisted random value, draws executed only by scheduler-invoked internal action (not callable by clients), watchdog re-schedules rather than allowing manual re-rolls. Admins cannot influence a draw outcome through any exposed function.

## Privacy & data

- PII: email, name, addresses. Addresses snapshot into orders (needed for fulfillment history) — include in any future deletion flow (v1: freeze + manual redaction on request).
- Don't log PII or tokens in action logs; Printify/Stripe payloads logged with address fields elided.
- 18+ attestation stored with timestamp (sweepstakes eligibility).

## Launch checklist

- [ ] First admin promoted via Convex dashboard, not code.
- [ ] Bundle grep for secrets clean.
- [ ] All webhooks reject unsigned requests (test with curl).
- [ ] `npx convex env list` in prod contains no dev keys; legacy keys (Supabase, old FAL, Bright Data) **rotated/revoked** — they were exposed during the legacy era.
- [ ] Rate limits verified with a scripted burst.
- [ ] Official rules + terms live; lawyer sign-off on sweepstakes structure (⚖️ items in [02-game-mechanics.md](02-game-mechanics.md)).
