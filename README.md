# OneShirt.app - Gamified T-Shirt Bidding

**Swipe. Bid. Win. Wear.**

A Tinder-style mobile app for bidding on AI-generated t-shirt designs. Users swipe through unique designs and place 1-credit bids. The 250th bidder wins the physical shirt!

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run migrations
npm run migrate

# Start dev server
npm run dev
```

Visit http://localhost:3000

---

## 📚 Documentation

**Full project documentation is in [`/memory-bank`](./memory-bank):**

- **[Project Brief](./memory-bank/projectbrief.md)** - Vision, goals, and strategy
- **[Product Context](./memory-bank/productContext.md)** - UX philosophy and user journeys
- **[Active Context](./memory-bank/activeContext.md)** - Recent changes and current focus
- **[System Patterns](./memory-bank/systemPatterns.md)** - Architecture and design patterns
- **[Tech Context](./memory-bank/techContext.md)** - Stack, setup, and configuration
- **[Progress](./memory-bank/progress.md)** - Features completed and roadmap

👉 **Start here:** [Memory Bank README](./memory-bank/MEMORY_BANK_README.md)

---

## 🎮 Core Features

### For Players (Mobile)
- 🎴 Swipe through AI-generated t-shirt designs
- 💰 Bid with credits (1 credit = 1 bid)
- 🎯 Win shirts (250th bidder wins!)
- 🎉 Celebration animations
- 📊 Real-time bid updates

### For Admins (Desktop)
- 📊 Dashboard with live statistics
- 👕 Shirt inventory management (CRUD)
- 🎨 AI design generation (Nano Banana)
- 👥 User management with credit editing
- 📦 Winners & order tracking

**Access Admin:** Press `Shift + A`

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Realtime)
- **AI:** fal.ai Nano Banana (image generation)
- **Animations:** Framer Motion
- **Testing:** Playwright MCP

---

## 📦 Project Structure

```
app/
├── memory-bank/           # 📚 Project documentation
├── components/            # React components
│   ├── admin/            # Admin dashboard pages
│   ├── AdminDashboard.tsx
│   ├── ImageGenerator.tsx
│   ├── LoginModal.tsx
│   └── WinnerModal.tsx
├── services/             # Service layer
│   ├── supabaseClient.ts
│   ├── databaseService.ts
│   └── imageGenerationService.ts
├── supabase/             # Database migrations
├── App.tsx               # Main container
├── types.ts              # TypeScript types
└── vite.config.ts        # Build config
```

---

## 🔑 Environment Variables

Required in `.env.local`:

```bash
# fal.ai for AI image generation
FAL_KEY=your_fal_api_key_here

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

---

## 🎯 Status

**Current Version:** 0.1.0 (MVP Complete ✅)

**What's Working:**
- ✅ User authentication (magic links)
- ✅ Swipe interface with bidding
- ✅ Real-time updates
- ✅ Winner detection
- ✅ Admin dashboard (5 pages)
- ✅ AI design generation
- ✅ Database persistence

**Next Steps:**
- Payment integration (Stripe)
- Email notifications
- Shipping workflow
- Mobile apps (iOS/Android)

See [`progress.md`](./memory-bank/progress.md) for detailed status.

---

## 🧪 Testing

```bash
# Type checking
npx tsc --noEmit

# Build
npm run build

# Visual testing with Playwright
# (via Claude Code orchestrator)
```

---

## 🤝 Contributing

This project uses a structured memory bank system for documentation.

**Before making changes:**
1. Read [`activeContext.md`](./memory-bank/activeContext.md) - Current focus
2. Check [`progress.md`](./memory-bank/progress.md) - What's done/todo
3. Review [`systemPatterns.md`](./memory-bank/systemPatterns.md) - How to build

**After making changes:**
1. Update [`activeContext.md`](./memory-bank/activeContext.md)
2. Update [`progress.md`](./memory-bank/progress.md)

---

## 📝 License

[Your License Here]

---

## 🔗 Links

- **Project Brief:** [memory-bank/projectbrief.md](./memory-bank/projectbrief.md)
- **Documentation:** [memory-bank/](./memory-bank/)
- **Supabase:** https://supabase.com/docs
- **fal.ai:** https://fal.ai/docs

---

**Built with ❤️ using React, TypeScript, and Claude Code**
