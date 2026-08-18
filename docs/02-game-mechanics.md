# 02 — Game Mechanics, Economics, and Legal Guardrails

This is the core specification. Every rule here is load-bearing — several exist specifically to keep the product a legal **sweepstakes** rather than gambling or a penny auction. Do not "simplify" any rule marked ⚖️ without flagging it.

## 1. Credits

- The in-app currency. 1 credit = one swipe-right bid. Sold in Stripe packs (see [07-payments-credits.md](07-payments-credits.md)); default pricing ~$0.10/credit with pack discounts.
- ⚖️ **Credits are never consumed by bidding.** A credit spent on a bid converts to **store credit** at identical face value, redeemable toward any retail purchase, forever (no expiry in v1). A user who buys $10 of credits and bids 100 times still holds $10 of purchasing power. This is what removes the *consideration* prong of the gambling test — entries come free with a fair-value purchase (the gift-with-purchase / McDonald's-Monopoly structure).
- Credit states (tracked via the append-only ledger, [04-data-model.md](04-data-model.md)):
  - **available** — spendable on bids or purchases.
  - **staked** — bid on an active shirt; counts as an entry there; still fully counts toward the user's redeemable balance for purchases (redeeming staked credit withdraws the corresponding entries — see §4).
  - **redeemed** — applied to a purchase; gone.
- ⚖️ **Free credits (AMOE):** every user can claim **5 free swipes per day** (config). Free-swipe bids are identical entries with identical odds. This is the alternative means of entry required for sweepstakes compliance. Free-swipe credits are entry-only (not redeemable as store credit) and are consumed by use — track them as a separate ledger kind.

## 2. Shirts and thresholds

- Every shirt has a **visible** `bidThreshold` (default **600**, per-shirt config) and a live `bidCount`. ⚖️ Never hide or fuzz the threshold or count — opaque odds re-create the chance-for-consideration problem and destroy trust.
- Shirt states: `draft → active → drawing → won | expired | archived`.
- **Early-bird multiplier** (config, default ON): the first 100 bids on a shirt count as **2 entries each** (still 1 credit, still +1 toward `bidCount`). Disclosed on the card ("2× entries for the next 37 bids!"). Deterministic and equal for everyone — legally fine, and it answers "why bid on a 5/600 shirt": those are the best-odds bids the shirt will ever have.
- **Per-user entry cap** (config, default **10% of threshold**, i.e. 60 entries on a 600 shirt): once reached, further right-swipes on that shirt are blocked with a friendly explanation. Prevents one whale from owning a draw and keeps every draw feel winnable. Disclosed in rules.
- **Expiry:** if a shirt doesn't reach threshold within `expiryDays` (config, default 30), it moves to `expired` and **all staked credits on it return to available** (free-swipe entries just vanish). ⚖️ This assurance-contract guarantee makes early bidding on unproven shirts riskless. Notify entrants.

## 3. The draw

- Trigger: the mutation that records the threshold-crossing bid transitions the shirt to `drawing` and schedules the draw action (delay: 0–60 min, config — a short window builds anticipation and lets pushes go out: "This shirt draws in 30 minutes").
- Selection: server-side action picks **one entry uniformly at random from all entries** on the shirt (entries, not users — a user with 12 entries has 12 tickets). Use a CSPRNG. Persist a `draws` record with: total entries, winning entry id, winner id, timestamp, and the random seed/value used — an audit trail you can show if ever challenged.
- ⚖️ Odds are per-entry and identical regardless of when the bid was placed (after the early-bird window). Bid #5 and bid #600 have the same odds. This is the property that fixes the "nobody bids early" problem — there is no sniping and no dead zone.
- Outcome: shirt → `won`, winner recorded, order pipeline kicks off ([09-fulfillment-printify.md](09-fulfillment-printify.md)), winner + all entrants notified. Non-winners' staked credits on this shirt return to **available** (they were never lost; unstaking just frees them for restaking elsewhere).
- The winner receives the shirt **free including standard shipping** (don't tax the win moment; shipping is in the ~$15 prize cost).

## 4. Buy It Now (the store)

- Every `active` shirt can be **bought at retail** (default $34.99, per-shirt config) at any time, paid with available + staked credit first, Stripe for the remainder.
- Redeeming staked credit toward a purchase withdraws the corresponding entries from that shirt's draws (decrement `bidCount` accordingly). UI must state this clearly at checkout.
- Buying the shirt you're bidding on applies your staked credits on it automatically — "you're already $2.40 of the way there."
- Purchases fulfill through the same Printify pipeline as prizes.

## 5. Retention mechanics (all within the swipe vocabulary)

- **Daily free swipes** (5/day, claim by opening the app; no hoarding beyond 1 day).
- **Streaks:** 7 consecutive days of swiping → bonus entries/credits (config). Keep modest.
- **Draw-imminent notifications:** push/email to entrants when a shirt they entered passes 90% of threshold and when it enters `drawing`.
- **Winner share cards:** the win screen generates a shareable image ("I won this shirt on OneShirt"). Include referral code; referred signups grant both sides bonus credits (config).

## 6. Economics model (keep this invariant)

Per credit sold at price `p` (~$0.10):

- **Prize load** = prizeCost / threshold. Target **15–25%**. At $15 prize: threshold 600 → 2.5¢/credit (25%). Never configure a shirt above ~30% without admin override warning.
- **Redemption load** = redemptionRate × (COGS/retail) × p ≈ 0.7 × 0.43 × p ≈ 3¢/credit.
- Gross margin per credit ≈ p − prize load − redemption load ≈ 4–5¢ (~45%), before breakage upside.

Admin catalog tooling must display computed prize load for any threshold/prize-cost combination and warn outside 15–25% ([11-admin.md](11-admin.md)). `gameConfig` stores: default threshold, credit pack pricing, retail default, free swipes/day, early-bird window & multiplier, entry cap %, expiryDays, draw delay, streak/referral bonuses.

## 7. ⚖️ Legal guardrails checklist (encode in product, verify before launch)

1. Bids never destroy value — full conversion to store credit (removes consideration).
2. Free daily entries with equal odds (AMOE), discoverable without payment.
3. Threshold, count, entry counts, and odds structure fully disclosed. Official rules page linked from every bid surface.
4. Retail prices are genuine market prices (~$35 POD tee), not inflated to make credit illusory.
5. No fabricated activity of any kind (no fake bids, no fake "recent winners").
6. Draws are uniformly random, logged, and auditable.
7. Terms of service, sweepstakes rules, eligibility (18+, US-only v1), and state exclusions drafted **with a lawyer before real money flows**. Some states (e.g. NY/FL) have registration/bonding rules above prize-value thresholds — a $35 shirt is far below them, but confirm.
8. Winner pays nothing (no shipping charge on prizes).
