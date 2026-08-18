# OneShirt

Swipe. Win. Wear. — a mobile-first web app where players swipe through AI-generated t-shirt designs. Swiping right places a 1-credit bid that doubles as an entry in that shirt's prize draw; when a shirt's visible bid threshold fills, one entry is drawn at random and that player wins the physical shirt free (fulfilled via Printify). Credits are never lost — every credit spent bidding remains full-value store credit.

> **Status:** live at **[https://oneshirt.app](https://oneshirt.app)** (deployed 2026-08-18 via Coolify; pushes to `main` auto-deploy). Auth, bidding, draws, wallet, Stripe checkout, and the admin console all work end-to-end — currently against a Convex **dev** deployment with Clerk/Stripe in **test mode**; Printify fulfillment is not yet configured. See [app/README.md](app/README.md#current-status-2026-08-18) for the full status table and production checklist.

## Repository layout

| Path | What it is |
|---|---|
| [app/](app/) | **The app.** React 19 + TypeScript + Vite + Tailwind, Convex backend, Clerk auth, Stripe / Fal.ai / Printify integrations. Start here — see [app/README.md](app/README.md) for setup and quickstart. |
| [docs/](docs/) | The full product & implementation specification ([docs/README.md](docs/README.md) is the index). Source of truth for game mechanics, data model, backend contracts, security rules. |
| [app/DESIGN.md](app/DESIGN.md) | Authoritative visual design spec (colors, typography, component anatomy, motion). |
| [images/](images/) | Logo, splash-screen, and shirt-design assets. |
| [docs/legacy/](docs/legacy/) | Docs of the old Supabase-based app — historical context only. |

## Quickstart

```bash
cd app
npm install
npx convex dev        # local anonymous deployment; no login needed
npm run dev           # http://localhost:5173 — guest preview works with no keys
npx convex run seed:seedDemo   # seed demo shirts (guarded, idempotent)
```

Full configuration (Clerk, Stripe, Fal.ai, Printify) is documented in [app/README.md](app/README.md).

## History

The original prototype (Supabase + client-trusted state) was removed from the working tree in August 2026 after the ground-up rebuild shipped; it is preserved in git history. The rebuild is server-authoritative throughout — see [docs/12-security.md](docs/12-security.md) for why.
