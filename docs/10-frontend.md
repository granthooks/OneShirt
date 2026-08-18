# 10 — Frontend (Player Experience)

**Baseline:** [design/frontend-spec.md](design/frontend-spec.md) remains the screen-by-screen behavior contract (header, swipe deck interactions, card anatomy, modals, motion language, admin layout). A new visual design is being supplied separately and takes precedence on look & feel. **This document lists the deltas** — places where the new mechanics change or extend that spec. Where the three conflict: new visual design > this doc > frontend-spec.

## Stack

React 19 + TypeScript + Vite; Tailwind as a build dependency (**no CDN script, no import map** — delete the legacy `index.html` approach entirely); Framer Motion for cards/modals; Convex React hooks for all data (`useQuery` = live by default); Clerk for auth state. Client-side routing (player `/`, wallet `/wallet`, my-bids `/bids`, orders `/orders`, shirt share pages `/s/:id`, admin `/admin/*`, rules `/rules`, terms `/terms`).

## Deltas from frontend-spec.md

### Swipe card (§3.2)
- **Add draw progress**: prominent `437/600` progress bar + "draws when full". Show **my entries** on shirts I've bid on ("You have 12 entries").
- **Early-bird badge** when active: "⚡ 2× entries — 37 left".
- **Expiry**: subtle "retires in 4 days" when < 25% of expiry window remains.
- **REMOVE the fake ambient bid ticker** (spec §3.2 "Ambient liveliness"). Bid counts update via Convex reactivity only — real activity, live for free. Do not simulate.
- Swipe right with free swipes remaining shows a "Free swipe! (3 left today)" toast instead of decrementing the credit pill.

### Bidding guards (§3.3)
- Out of credits → **buy-credits bottom sheet** (packs from config, Stripe Checkout), not an alert.
- Entry-cap reached → explainer toast ("You've maxed your entries on this one — keeps draws fair") and the card auto-skips.
- Threshold crossed by *my* bid → dramatic "Draw imminent" interstitial, not an instant winner modal (the draw is delayed & random now — see §Draw moments).

### Draw moments (replaces Winner modal spec §3.7 trigger)
- When a shirt I entered goes to `drawing`: countdown state on its card in My Bids + push/notification.
- Draw result: **win** → full-screen celebration (confetti, shirt, "It's yours — free"), then size/address confirmation if needed, then shareable win card. **Lose** → gentle notification: "The draw happened — @sam won. Your 12 credits are back in your wallet," with a Buy It Now CTA for that design.

### New screens (not in frontend-spec)
- **Wallet** (`/wallet`): balance (available + staked breakdown), daily free-swipe claim button with streak indicator, credit packs, ledger history.
- **My Bids** (`/bids`): live cards for every shirt I hold entries on, sorted by closest-to-draw; this is the retention screen.
- **Orders** (`/orders`): prize + purchase orders with status timeline and tracking links.
- **Buy It Now flow**: from any card (long-press / info button) or shirt page → size picker → address → credit-applied summary ("Your 12 staked credits cover $1.20 — withdrawing them removes your entries on this shirt") → Stripe for remainder.
- **Rules** (`/rules`): plain-English mechanics + official sweepstakes rules. Linked from every bid surface (⚖️ requirement).
- **Notifications** center (bell in header).

### Auth (§3.4)
Clerk headless magic-link flow inside the app's login modal; include 18+ attestation checkbox at signup. Guest deck browsing unchanged; first right-swipe as guest opens login with the card preserved.

## UX principles carried over

- One-handed, mobile-first; swipe is the only mandatory gesture; every action also has a button.
- Optimistic UI only for likes; bids wait for the mutation (it's fast) — never show a bid that didn't commit.
- All numbers real. If it moves on screen, it happened in the database.
- Skeletons/shimmer on load; empty-deck state per spec, plus "next drop" teaser if a drop is scheduled.

## PWA / notifications

v1: in-app notification center + email (Convex action → Resend or similar for win/ship/draw-imminent). Web push is a fast-follow; structure the notifications module so the delivery channel is pluggable.
