# System Patterns

**Last Updated:** 2025-01-05

---

## 🏗️ Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Client (Browser)                   │
│                                                     │
│  ┌──────────────┐            ┌─────────────────┐  │
│  │  Swipe App   │            │  Admin Dashboard│  │
│  │  (Mobile UI) │            │  (Desktop UI)   │  │
│  └──────┬───────┘            └────────┬────────┘  │
│         │                             │           │
│         └─────────────┬───────────────┘           │
│                       │                           │
│                ┌──────▼──────┐                    │
│                │   App.tsx   │                    │
│                │ (Container) │                    │
│                └──────┬──────┘                    │
│                       │                           │
│         ┌─────────────┼─────────────┐            │
│         │             │             │            │
│    ┌────▼────┐  ┌────▼────┐  ┌────▼────┐       │
│    │Services │  │Components│  │  State  │       │
│    └────┬────┘  └─────────┘  └─────────┘       │
└─────────┼──────────────────────────────────────┘
          │
     ┌────▼────────────────────────┐
     │      Supabase Backend       │
     │  ┌──────────┬────────────┐  │
     │  │PostgreSQL│  Auth      │  │
     │  │          │  (Magic    │  │
     │  │ Tables:  │   Links)   │  │
     │  │ • users  │            │  │
     │  │ • shirts │  Realtime  │  │
     │  │ • bids   │  (WebSocket)│  │
     │  └──────────┴────────────┘  │
     └─────────────────────────────┘
          │
     ┌────▼────────┐
     │   fal.ai    │
     │ Nano Banana │
     │   (AI Gen)  │
     └─────────────┘
```

---

## 🔧 Core Patterns

### 1. Container/Presentational Component Split

**Container Components:**
- `App.tsx` - Main state container
- `AdminDashboard.tsx` - Admin state container

**Presentational Components:**
- `SwipeCard` - Pure UI for shirt cards
- `Header` - Header display
- `WinnerModal` - Celebration UI
- `ProfileDropdown` - Profile menu dropdown
- `ProfileModal` - User profile editing modal
- `LoginModal` - Authentication modal
- All admin page components

**Benefits:**
- Clear separation of concerns
- Easier testing
- Better reusability

---

### 2. Service Layer Abstraction

**Services:**
- `databaseService.ts` - All Supabase operations (includes getUserWins, updateUserProfile)
- `imageGenerationService.ts` - AI image generation
- `supabaseClient.ts` - Supabase initialization and type definitions

**Pattern:**
```typescript
// Consistent return type for all database operations
interface DatabaseResponse<T> {
  data: T | null;
  error: string | null;
}

// Example usage
const { data, error } = await getUser(userId);
if (error) {
  // Handle error
} else {
  // Use data
}
```

**Benefits:**
- Consistent error handling
- Easy to mock for testing
- Database changes isolated
- Type-safe operations

---

### 3. Real-Time Subscription Pattern

**Implementation:**
```typescript
// Subscribe to updates
const subscription = subscribeToShirtUpdates((payload) => {
  if (payload.eventType === 'INSERT') {
    // Handle new shirt
  } else if (payload.eventType === 'UPDATE') {
    // Handle shirt update
  }
});

// Clean up on unmount
return () => {
  subscription.unsubscribe();
};
```

**Used For:**
- Shirt updates (new, edited, deleted)
- Bid updates (new bids placed)
- User updates (profile changes)

**Benefits:**
- Real-time multiplayer feel
- No polling needed
- Automatic UI updates
- WebSocket-based (efficient)

---

### 4. Optimistic UI Updates

**Pattern:**
```typescript
// Update local state immediately
setUser(prev => ({ ...prev, creditBalance: prev.creditBalance - 1 }));

// Then sync with database
const { data, error } = await placeBid(userId, shirtId, 1);

// Rollback if error
if (error) {
  setUser(prev => ({ ...prev, creditBalance: prev.creditBalance + 1 }));
}
```

**Benefits:**
- Instant feedback
- Better perceived performance
- Smoother user experience

---

### 5. Keyboard Shortcut System

**Pattern:**
```typescript
useEffect(() => {
  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.shiftKey && event.key === 'A') {
      toggleAdminView();
    }
  };

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

**Current Shortcuts:**
- `Shift + A` - Toggle admin dashboard

**Benefits:**
- Power user efficiency
- Hidden admin access
- Better UX for frequent actions

---

## 📦 Component Architecture

### Component Structure

```
App.tsx (Container)
├── State Management
│   ├── shirts: Shirt[]
│   ├── user: User | null
│   ├── session: Session | null
│   ├── currentIndex: number
│   ├── view: AppView (SWIPE | ADMIN)
│   └── isWinnerModalOpen: boolean
│
├── Data Loading
│   ├── useEffect (initialize)
│   ├── useEffect (realtime subscriptions)
│   └── useEffect (background simulation)
│
├── Event Handlers
│   ├── handleSwipe()
│   ├── addGeneratedShirt()
│   ├── closeWinnerModal()
│   ├── handleProfileClick()
│   ├── handleLogout()
│   └── handleProfileUpdated()
│
└── Render
    ├── Header (with ProfileDropdown)
    ├── SwipeView | AdminDashboard
    ├── WinnerModal
    ├── LoginModal
    └── ProfileModal
```

---

### Admin Dashboard Structure

```
AdminDashboard
├── State
│   ├── activePage: AdminPage
│   └── userInfo: User
│
├── Sidebar (Navigation)
│   ├── Logo
│   ├── Navigation Links
│   │   ├── Dashboard
│   │   ├── Shirt Inventory
│   │   ├── Generate Designs
│   │   ├── User Management
│   │   └── Winners & Orders
│   ├── Back to Swipe
│   └── Logout
│
└── Content Area
    ├── Header Bar
    └── Active Page
        ├── DashboardPage
        ├── InventoryPage
        ├── GeneratePage
        ├── UsersPage
        └── OrdersPage
```

---

## 🗄️ Data Flow Patterns

### 1. Authentication Flow

```
User Action
    ↓
Click "Login"
    ↓
LoginModal Opens
    ↓
Enter Email → Send Magic Link
    ↓
Click Link in Email
    ↓
Supabase Auth (auto)
    ↓
SIGNED_IN Event
    ↓
Check User Profile
    ↓
Create Profile if Needed
    ↓
Load User Data
    ↓
Update UI (show credits, profile)
```

---

### 2. Bidding Flow

```
User Swipes Right
    ↓
handleSwipe('right')
    ↓
Check: User Authenticated?
    ↓ Yes
Check: User Has Credits?
    ↓ Yes
Optimistic Update (UI)
    ↓
placeBid(userId, shirtId, 1)
    ↓
Database Transaction
 • Deduct credit
 • Insert bid record
 • Increment shirt count
 • Check if threshold reached
    ↓
Return Result
    ↓
Update Local State
    ↓
If Winner: Show Celebration
```

---

### 3. Real-Time Update Flow

```
User A Bids
    ↓
Database Updated
    ↓
Supabase Realtime Event
    ↓
All Connected Clients Notified
    ↓
User B's Subscription Callback
    ↓
Update Local State
    ↓
UI Re-renders
    ↓
User B Sees New Bid Count
```

---

## 🎨 State Management Patterns

### Single Source of Truth

**App.tsx holds all global state:**
- User data
- Shirt list
- Auth session
- Current view
- Modal states

**Why:**
- Simple for MVP
- Easy to reason about
- No redux complexity
- Clear data flow

**Future:** Consider Zustand or Redux when state grows

---

### Derived State

**Pattern:**
```typescript
// Don't store filtered results in state
const [shirts, setShirts] = useState<Shirt[]>([]);
const [searchQuery, setSearchQuery] = useState('');

// Derive filtered results
const filteredShirts = useMemo(() =>
  shirts.filter(s => s.name.includes(searchQuery)),
  [shirts, searchQuery]
);
```

**Benefits:**
- Single source of truth
- Automatic updates
- No sync issues

---

### Controlled Components

**Pattern:**
```typescript
const [email, setEmail] = useState('');

<input
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>
```

**Used Throughout:**
- All form inputs
- Search boxes
- Filters
- Modals

---

## 🔐 Security Patterns

### Row Level Security (RLS)

**Current (Development):**
- Permissive policies for rapid development
- Anyone can read/write (for testing)

**Future (Production):**
```sql
-- Only authenticated users can bid
CREATE POLICY "Users can insert own bids"
ON bids FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Only admins can manage inventory
CREATE POLICY "Admins can manage shirts"
ON shirts FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  )
);
```

---

### API Key Management

**Current:**
- Keys in `.env.local`
- Vite exposes to client via `process.env`

**Production:**
- Move sensitive operations to backend
- Use server-side functions
- Rotate keys regularly
- Use environment-specific keys

---

## 🎯 Design Patterns

### Factory Pattern (Database Converters)

```typescript
// Convert database types to app types
const dbShirtToAppShirt = (dbShirt: DbShirt): Shirt => ({
  id: dbShirt.id,
  name: dbShirt.name,
  imageUrl: dbShirt.image_url,
  currentBidCount: dbShirt.current_bid_count,
  bidThreshold: dbShirt.bid_threshold,
});
```

---

### Observer Pattern (Realtime Subscriptions)

```typescript
// Subscribe to events
const subscription = subscribeToShirtUpdates((event) => {
  // Handle update
});

// Unsubscribe when done
subscription.unsubscribe();
```

---

### Singleton Pattern (Service Clients)

```typescript
// One Supabase client instance for entire app
export const supabase = createClient(url, key);

// One fal.ai client instance
fal.config({ credentials: apiKey });
```

---

## 📱 Responsive Design Pattern

### Mobile-First Approach

**Base Styles:**
- Designed for mobile (320px+)
- Vertical layouts
- Touch-friendly buttons (min 44px)
- Full-width components

**Desktop Enhancements:**
```css
/* Mobile (default) */
.container { width: 100%; }

/* Tablet */
@media (min-width: 768px) {
  .container { max-width: 720px; }
}

/* Desktop */
@media (min-width: 1024px) {
  .admin-layout {
    display: grid;
    grid-template-columns: 240px 1fr;
  }
}
```

---

### Adaptive UI Pattern

**Swipe Interface:**
- Optimized for mobile
- Portrait orientation
- Touch gestures
- Full-screen cards

**Admin Dashboard:**
- Optimized for desktop
- Landscape orientation
- Mouse/keyboard
- Multi-column layouts

---

## 🔄 Loading States Pattern

**Three States:**
1. **Loading** - Initial data fetch
2. **Error** - Something failed
3. **Success** - Data loaded

**Implementation:**
```typescript
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
return <DataDisplay data={data} />;
```

**Used In:**
- All admin pages
- Dashboard statistics
- User lists
- Shirt inventory

---

## 🎭 Animation Patterns

### Framer Motion Conventions

**Entry Animations:**
```typescript
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.3 }}
```

**Exit Animations:**
```typescript
exit={{ opacity: 0, scale: 0.8 }}
```

**Stagger Children:**
```typescript
transition={{ staggerChildren: 0.1 }}
```

**Used For:**
- Page transitions
- Modal animations
- List item reveals
- Button hover states

---

## 🧪 Testing Patterns

### Playwright Visual Testing

**Pattern:**
1. Navigate to page
2. Perform action
3. Take screenshot
4. Verify visual output
5. Check for errors

**Benefits:**
- Catches visual regressions
- Tests real browser behavior
- Easy to understand failures

---

**This document defines the technical architecture and patterns used throughout the codebase.**
