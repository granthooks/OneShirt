# Technical Context

**Last Updated:** 2025-01-04

---

## 🛠️ Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.2.0 | UI framework |
| **TypeScript** | 5.8.2 | Type safety |
| **Vite** | 6.2.0 | Build tool & dev server |
| **Tailwind CSS** | 3.4+ (CDN) | Styling |
| **Framer Motion** | 12.23.24 | Animations |

### Backend & Services

| Service | Purpose |
|---------|---------|
| **Supabase** | Database, Auth, Realtime |
| **fal.ai** | AI image generation (Nano Banana) |

### Development Tools

| Tool | Purpose |
|------|---------|
| **npm** | Package management |
| **Git** | Version control |
| **Playwright MCP** | Visual testing |
| **ESLint** | Code linting (configured in Vite) |

---

## 📦 Dependencies

### Production Dependencies

```json
{
  "react": "19.2.0",
  "react-dom": "19.2.0",
  "framer-motion": "12.23.24",
  "@fal-ai/client": "^1.0.0",
  "@supabase/supabase-js": "^2.78.0",
  "lucide-react": "^0.460.0"
}
```

### Development Dependencies

```json
{
  "@vitejs/plugin-react": "^4.3.4",
  "vite": "6.2.0",
  "typescript": "5.8.2"
}
```

---

## 🗄️ Database Schema

### Supabase PostgreSQL

**Tables:**

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  avatar_url TEXT,
  credit_balance INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shirts table
CREATE TABLE shirts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  designer TEXT,
  current_bid_count INTEGER DEFAULT 0,
  bid_threshold INTEGER DEFAULT 250,
  like_count INTEGER DEFAULT 0,
  winner_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'active', -- 'active' | 'won'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bids table
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  shirt_id UUID REFERENCES shirts(id) NOT NULL,
  credit_cost INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX bids_shirt_id_idx ON bids(shirt_id);
CREATE INDEX bids_user_id_idx ON bids(user_id);
CREATE INDEX bids_created_at_idx ON bids(created_at);
CREATE INDEX shirts_status_idx ON shirts(status);
```

**Database Functions:**

```sql
-- Place a bid (atomic transaction)
CREATE FUNCTION place_bid(
  p_user_id UUID,
  p_shirt_id UUID,
  p_credit_cost INTEGER DEFAULT 1
) RETURNS JSON AS $$
-- Implementation in migration file
$$ LANGUAGE plpgsql;

-- Get user statistics
CREATE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE(...) AS $$
-- Implementation in migration file
$$ LANGUAGE plpgsql;

-- Get shirt statistics
CREATE FUNCTION get_shirt_stats(p_shirt_id UUID)
RETURNS TABLE(...) AS $$
-- Implementation in migration file
$$ LANGUAGE plpgsql;
```

---

## ⚙️ Configuration Files

### vite.config.ts

```typescript
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.FAL_KEY': JSON.stringify(env.FAL_KEY),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "experimentalDecorators": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["*.ts", "*.tsx", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

### package.json (Scripts)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "migrate": "node scripts/apply-migration.js",
    "migrate:show": "node scripts/show-migration.js"
  }
}
```

---

## 🔐 Environment Variables

### .env.local

```bash
# fal.ai API Key for Nano Banana image generation
# Get your key from: https://fal.ai/dashboard/keys
FAL_KEY=your_fal_api_key_here

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Security Notes:**
- Never commit `.env.local` to git
- Use different keys for dev/staging/production
- Rotate keys regularly
- Use server-side functions for sensitive operations

---

## 🌐 API Integrations

### Supabase

**Authentication:**
- Magic link email authentication
- Session management
- User profile creation

**Database:**
- PostgreSQL queries
- Real-time subscriptions
- Row Level Security (RLS)

**Realtime:**
- WebSocket connections
- Table update events
- Automatic reconnection

**Endpoints:**
```
Auth: https://your-project.supabase.co/auth/v1
Database: https://your-project.supabase.co/rest/v1
Realtime: wss://your-project.supabase.co/realtime/v1
```

---

### fal.ai (Nano Banana)

**Model:** `fal-ai/nano-banana`

**API:**
```typescript
const result = await fal.subscribe("fal-ai/nano-banana", {
  input: {
    prompt: "your prompt here",
    num_images: 1,
    output_format: "png",
    aspect_ratio: "1:1",
  }
});
```

**Pricing:** ~$0.039 per image

**Limits:**
- Rate limits apply per API key
- Check fal.ai dashboard for quotas

---

## 📁 File Structure

```
app/
├── .env.local                    # Environment variables (not in git)
├── .gitignore                    # Git ignore rules
├── index.html                    # HTML entry point
├── index.tsx                     # React entry point
├── App.tsx                       # Main app component
├── types.ts                      # TypeScript type definitions
├── vite.config.ts                # Vite configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies & scripts
├── projectbrief.md               # Project vision & goals
├── productContext.md             # Product strategy
├── activeContext.md              # Current work & changes
├── systemPatterns.md             # Architecture patterns
├── techContext.md                # This file
├── progress.md                   # Implementation status
│
├── components/                   # React components
│   ├── icons.tsx                # SVG icon components
│   ├── ImageGenerator.tsx       # AI design generator UI
│   ├── WinnerModal.tsx          # Winner celebration modal
│   ├── LoginModal.tsx           # Authentication modal
│   ├── AdminDashboard.tsx       # Admin container
│   └── admin/                   # Admin page components
│       ├── DashboardPage.tsx    # Statistics overview
│       ├── InventoryPage.tsx    # Shirt management
│       ├── GeneratePage.tsx     # AI generation
│       ├── UsersPage.tsx        # User management
│       └── OrdersPage.tsx       # Order tracking
│
├── services/                    # Service layer
│   ├── supabaseClient.ts       # Supabase initialization
│   ├── databaseService.ts      # Database operations
│   └── imageGenerationService.ts # AI image generation
│
├── supabase/                    # Supabase migrations
│   └── migrations/
│       ├── 20250103_initial_schema.sql
│       └── 20250103_fix_shirts_rls.sql
│
├── scripts/                     # Utility scripts
│   ├── apply-migration.js
│   └── show-migration.js
│
└── dist/                        # Build output (generated)
```

---

## 🚀 Development Workflow

### Setup

```bash
# Clone repository
git clone <repo-url>
cd app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your keys

# Run migrations
npm run migrate

# Start dev server
npm run dev
```

### Development

```bash
# Dev server (hot reload)
npm run dev
# → http://localhost:3000

# Build for production
npm run build
# → Output to dist/

# Preview production build
npm run preview
```

### Testing

```bash
# Visual testing with Playwright
# (via Claude Code orchestrator)

# Type checking
npx tsc --noEmit
```

---

## 🔧 Build Configuration

### Vite Build Output

**Development:**
- Fast HMR (Hot Module Replacement)
- Source maps enabled
- No minification
- Port 3000

**Production:**
- Minified JavaScript
- Optimized CSS
- Tree-shaking
- Code splitting (manual chunks)
- Gzip compression

**Current Bundle Size:**
- JavaScript: ~647kb (188kb gzipped)
- CSS: ~0.22kb
- Images: Loaded separately

**Optimization Opportunities:**
- Code splitting for admin dashboard
- Lazy loading of heavy components
- Image optimization
- CDN for static assets

---

## 🌍 Browser Support

### Target Browsers

- **Chrome/Edge:** Last 2 versions
- **Firefox:** Last 2 versions
- **Safari:** Last 2 versions
- **Mobile Safari:** iOS 14+
- **Chrome Android:** Last 2 versions

### Required Features

- ES2022 support
- CSS Grid
- Flexbox
- WebSocket (for Supabase realtime)
- Local Storage
- Fetch API

---

## 📊 Performance Considerations

### Key Metrics

**Target:**
- First Contentful Paint (FCP): < 1.5s
- Time to Interactive (TTI): < 3.0s
- Largest Contentful Paint (LCP): < 2.5s

**Current:**
- Initial load: ~2-3s
- Bundle size: 647kb (could be optimized)

### Optimization Strategies

1. **Code Splitting**
   - Lazy load admin dashboard
   - Split vendor bundles
   - Dynamic imports for heavy components

2. **Image Optimization**
   - WebP format support
   - Lazy loading images
   - Responsive images
   - CDN delivery

3. **Caching**
   - Service worker
   - Cache-Control headers
   - LocalStorage for user data

4. **Database**
   - Proper indexing
   - Query optimization
   - Connection pooling (Supabase handles this)

---

## 🔒 Security Considerations

### Current Implementation

**Good:**
- Environment variables for secrets
- HTTPS only (enforced)
- Supabase RLS (basic policies)
- Input validation on forms
- TypeScript type safety

**Needs Improvement:**
- Tighten RLS policies for production
- Add rate limiting
- Implement CSRF protection
- Add audit logging for admin actions
- Server-side API calls for sensitive operations

---

## 🐛 Known Technical Limitations

### Current

1. **Client-side API keys** - FAL_KEY exposed in bundle
2. **No pagination** - All shirts/users loaded at once
3. **No caching** - Fresh queries on every load
4. **Large bundle** - Could be split better
5. **No offline support** - Requires internet connection

### Future Enhancements

1. Move sensitive operations to edge functions
2. Implement cursor-based pagination
3. Add React Query for caching
4. Implement code splitting
5. Add service worker for offline mode

---

## 📚 External Documentation

### Core Technologies

- **React 19:** https://react.dev
- **TypeScript:** https://www.typescriptlang.org/docs
- **Vite:** https://vite.dev
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Framer Motion:** https://www.framer.com/motion
- **Supabase:** https://supabase.com/docs
- **fal.ai:** https://fal.ai/docs

### APIs

- **Supabase JS Client:** https://supabase.com/docs/reference/javascript
- **fal.ai Client:** https://fal.ai/models/fal-ai/nano-banana/api
- **Nano Banana Model:** https://fal.ai/models/fal-ai/nano-banana

---

**This document provides technical context for developers working on the project.**
