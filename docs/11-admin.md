# 11 — Admin Dashboard

Desktop-oriented zone at `/admin`, sidebar layout per [design/frontend-spec.md](design/frontend-spec.md) §admin. Access: `role === "admin"` verified server-side on every query/mutation; the route guard is cosmetic. Remove the legacy Shift+A shortcut gimmick or keep it as a convenience — it grants nothing by itself.

## Pages

### 1. Dashboard (business overview)
- **The four ledger numbers:** credits sold (cash in), credits redeemed, credits outstanding (liability), prize spend — plus breakage estimate.
- Activity: bids today, active users, draws executed, orders by status, prize load actual vs target (per recent draw and rolling average).
- **Free-entry share** (rolling, and per draw): `freeEntries / totalEntries`. This is the dilution metric — see §Free vs paid entries below.
- Real recent activity feed (bids, signups, draws, orders). No fabricated data.

### Free vs paid entries (dilution tracking)

⚖️ Free daily swipes are an AMOE requirement ([02-game-mechanics.md](02-game-mechanics.md) §1) and cannot be removed. They carry no monetary liability — free-swipe entries are entry-only, never redeemable, and are not in the credit ledger ([04-data-model.md](04-data-model.md)). But they are **not free to the business**: every free swipe still increments `bidCount`, so it consumes a threshold slot that a paid credit would otherwise have filled. Free entries dilute the pool that funds the prize.

The prize load in §Catalog Activate (`prizeCostCents / bidThreshold`) is the **design-time** figure and assumes every bid is paid. The number that matters after the fact is:

- **Realized prize load** = `prizeCostCents / (paidEntries × effectiveCreditPrice)`

At a $15 prize on a 600 threshold with ~9¢/credit: 0% free → 28% load; 20% free → 35%; 30% free → 40%. The 15–25% target band ([02-game-mechanics.md](02-game-mechanics.md) §6) is only achievable at a low free share, so this must be visible, not inferred.

Surface it in three places:

1. **Catalog list** — free/paid entry split per shirt, so a shirt filling mostly on free swipes is obvious before it draws.
2. **Draws audit page** — record and display `freeEntries` / `paidEntries` / realized prize load on every executed draw (the draw already persists entry totals; extend it with the split).
3. **Dashboard** — rolling free-entry share, with a warning when realized prize load crosses the ~30% override ceiling.

Tuning lever: `gameConfig.freeSwipesPerDay`. ⚖️ It may be lowered but **never set to zero** — free entry with equal odds is load-bearing for the sweepstakes structure. If realized load runs hot, prefer raising `bidThreshold` or trimming `freeSwipesPerDay`, not removing AMOE.

### 2. Catalog (replaces legacy Inventory)
- List all shirts with status, bidCount/threshold, entries, unique bidders, likes, prize-load %, **free/paid entry split**, expiry.
- Create/edit drafts; **Activate** flow shows computed prize load with warning outside the 15–25% band ([02-game-mechanics.md](02-game-mechanics.md) §6) and validates the print master ([08-image-generation.md](08-image-generation.md)).
- Archive (soft remove from deck; existing entries refund like expiry if it had bids — confirm dialog states this).
- Per-shirt overrides: threshold, retail price, early-bird window, entry cap, expiry.

### 3. Generate
- Prompt box + model picker (nano-banana-2 default / pro) + resolution; renders 4 candidates; select → background-removed preview → "Create draft shirt" prefilled form.
- Generation history with prompts/costs.

### 4. Users
- Search/list; per-user: balances, ledger view, entries, orders, streak, referrals.
- Actions: adjust credits (requires note → ledger `admin_adjust`), set role, freeze/unfreeze. **No delete in v1** (ledger integrity); freeze covers abuse.

### 5. Orders
- All orders (prize + purchase) filterable by status; stale `pending_info` and `failed` surfaced at top.
- Detail: address snapshot, Printify status/raw payload, tracking; actions: resubmit, cancel, mark-resolved.

### 6. Draws
- Audit log of every draw: shirt, total entries/bidders, **free/paid entry split, realized prize load**, winner, timestamp, random value. Read-only. This page is your evidence of fairness.

### 7. Config
- Edit `gameConfig` fields with inline explanations and guardrails (e.g. prize-load recalculation preview when changing default threshold or pack pricing). Changes take effect immediately; log who changed what.

## Non-goals
- No Threadless scraper page (feature dropped).
- No raw DB editing; everything through audited mutations.
