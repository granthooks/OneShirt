# Admin Dashboard Documentation

## Overview

The Admin Dashboard is a comprehensive desktop-optimized interface for managing the OneShirt.app platform. It provides a professional sidebar navigation system with multiple admin pages for different management tasks.

## Access

### Keyboard Shortcut
- Press **Shift + A** to toggle between Swipe View and Admin Dashboard
- Works from anywhere in the application
- Toggle again to return to Swipe View

## Architecture

### Components Structure

```
components/
├── AdminDashboard.tsx          # Main container with sidebar + content area
└── admin/
    ├── DashboardPage.tsx       # Stats overview (placeholder)
    ├── InventoryPage.tsx       # Shirt management (placeholder)
    ├── GeneratePage.tsx        # AI design generation (active)
    ├── UsersPage.tsx           # User management (placeholder)
    └── OrdersPage.tsx          # Winners & orders (placeholder)
```

### Types
```typescript
// types.ts
export enum AdminPage {
  DASHBOARD,   // Stats overview
  INVENTORY,   // Shirt management
  GENERATE,    // AI design generation
  USERS,       // User management
  ORDERS,      // Winners & orders
}
```

## Features

### Sidebar Navigation (Left - 240px)
- **OneShirt Logo** - Branding at top
- **Navigation Links** (5 pages):
  1. Dashboard - Stats and analytics overview
  2. Shirt Inventory - Manage all shirt designs
  3. Generate Designs - Create new designs with AI
  4. User Management - Manage users and permissions
  5. Winners & Orders - Track winners and shipping

- **Bottom Actions**:
  - Back to Swipe - Return to main swipe interface
  - Logout - Sign out of the application

### Main Content Area (Right - Flex-grow)
- **Header Bar**:
  - Current page title
  - Page description
  - User info (name, avatar, credits)

- **Content Area**:
  - Renders the active admin page
  - Smooth transitions between pages
  - Scrollable content

### Active State
- Current page highlighted in blue (bg-blue-600)
- Inactive pages in gray with hover effects
- Professional hover and tap animations

## Pages

### 1. Dashboard (PLACEHOLDER)
**Status:** Placeholder - Coming Soon

**Planned Features:**
- Total shirts count
- Active users count
- Total bids placed
- Revenue analytics
- Activity charts
- Recent activity feed

**Current State:**
- Shows 3 stat cards with placeholder "--" values
- "Coming soon" message for full dashboard

### 2. Shirt Inventory (PLACEHOLDER)
**Status:** Placeholder - Coming Soon

**Planned Features:**
- View all shirts (active and won)
- Edit shirt details
- Delete shirts
- Search and filter
- Bulk operations
- Image management

**Current State:**
- "Add New Shirt" button (placeholder)
- "Coming soon" message

### 3. Generate Designs (ACTIVE)
**Status:** Fully Functional

**Features:**
- Integrated ImageGenerator component
- AI-powered design creation with Gemini
- Text prompt input
- Shirt name input
- Image preview
- Add to inventory

**How to Use:**
1. Navigate to "Generate Designs"
2. Enter design prompt (e.g., "a cool sunset over mountains")
3. Enter shirt name (e.g., "Mountain Sunset")
4. Click "Generate Design"
5. Preview generated image
6. Click "Add to Inventory" to add to database

### 4. User Management (PLACEHOLDER)
**Status:** Placeholder - Coming Soon

**Planned Features:**
- View all users
- Edit user profiles
- Manage credits
- Ban/suspend users
- User statistics
- Role management

**Current State:**
- "Add User" button (placeholder)
- "Coming soon" message

### 5. Winners & Orders (PLACEHOLDER)
**Status:** Placeholder - Coming Soon

**Planned Features:**
- View all winners
- Order status tracking
- Shipping management
- Winner notifications
- Export order data
- Fulfillment integration

**Current State:**
- "Export Orders" button (placeholder)
- "Coming soon" message

## Design System

### Layout
- **Desktop-first design** (optimized for min-width: 1024px)
- **Sidebar:** 240px fixed width, full height
- **Content:** Flex-grow, scrollable
- **Header:** Fixed at top of content area

### Color Palette
- **Background:** bg-gray-900 (main)
- **Sidebar:** bg-gray-900 with border-gray-800
- **Content:** bg-gray-900
- **Cards:** bg-gray-800 with border-gray-700
- **Active Nav:** bg-blue-600 (bright blue)
- **Hover Nav:** bg-gray-800
- **Text:** text-white (primary), text-gray-400 (secondary)
- **Logout:** text-red-400 with hover bg-red-900/20

### Typography
- **Page Title:** text-3xl font-bold
- **Section Headers:** text-2xl font-bold
- **Nav Items:** text-sm font-medium
- **Descriptions:** text-sm text-gray-400

### Animations
- **Page Entry:** Opacity + Y translate (duration: 0.3s)
- **Sidebar Entry:** X translate from -240px (duration: 0.3s)
- **Header Entry:** Y translate (duration: 0.3s, delay: 0.1s)
- **Content Entry:** Opacity (duration: 0.3s, delay: 0.2s)
- **Button Hover:** scale: 1.02
- **Button Tap:** scale: 0.98

## Navigation Flow

```
User presses Shift+A
    ↓
AdminDashboard renders in fullscreen
    ↓
User clicks navigation item
    ↓
setActivePage(selectedPage)
    ↓
renderActivePage() switches page component
    ↓
Page animates in with opacity + Y translate
```

## Props Interface

```typescript
interface AdminDashboardProps {
  user: User | null;           // Current user (for header display)
  onAddShirt: (shirt: Shirt) => void;  // Callback to add shirt to database
  onLogout?: () => void;       // Optional logout handler
  onBackToSwipe: () => void;   // Return to swipe view
}
```

## Integration with App.tsx

### View Switching
```typescript
// If admin view, render fullscreen AdminDashboard
if (view === AppView.ADMIN) {
  return (
    <>
      <AdminDashboard
        user={user}
        onAddShirt={addGeneratedShirt}
        onLogout={async () => {
          await supabase.auth.signOut();
          setView(AppView.SWIPE);
        }}
        onBackToSwipe={() => setView(AppView.SWIPE)}
      />
      {/* Modals */}
    </>
  );
}

// Otherwise render swipe view with header
return (
  <div className="...">
    <Header ... />
    <SwipeView ... />
    {/* Modals */}
  </div>
);
```

### Keyboard Shortcut Handler
```typescript
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.shiftKey && e.key === 'A') {
      e.preventDefault();
      setView(prevView =>
        prevView === AppView.ADMIN ? AppView.SWIPE : AppView.ADMIN
      );
    }
  };

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

## Future Enhancements

### Phase 1: Dashboard Stats
- [ ] Implement real stats from database
- [ ] Add charts with Chart.js or Recharts
- [ ] Real-time activity feed
- [ ] Performance metrics

### Phase 2: Inventory Management
- [ ] Full CRUD operations for shirts
- [ ] Image upload and management
- [ ] Bulk edit/delete
- [ ] Advanced search and filters
- [ ] Shirt analytics per design

### Phase 3: User Management
- [ ] User list with pagination
- [ ] Credit management (add/remove)
- [ ] User ban/suspend
- [ ] Role-based access control (RBAC)
- [ ] User activity logs

### Phase 4: Orders & Fulfillment
- [ ] Winner notification system
- [ ] Shipping address collection
- [ ] Order status tracking
- [ ] Integration with printing API (Printful)
- [ ] Automated email notifications
- [ ] Export to CSV/PDF

### Phase 5: Advanced Features
- [ ] Multi-user admin roles
- [ ] Audit logs
- [ ] Backup/restore
- [ ] System settings
- [ ] Email templates
- [ ] Analytics dashboard

## Testing Checklist

- [x] AdminDashboard component renders
- [x] Sidebar navigation displays correctly
- [x] All 5 nav items present
- [x] Active state highlighting works
- [x] Page switching works
- [x] Generate Designs page functional (ImageGenerator)
- [x] Placeholder pages render
- [x] Back to Swipe button works
- [x] Keyboard shortcut (Shift+A) toggles view
- [x] User info displays in header
- [x] Logout button works (if authenticated)
- [x] Responsive layout (desktop)
- [x] Dark theme consistent
- [x] Animations smooth

## Known Limitations

1. **Desktop Only** - Not optimized for mobile/tablet (main swipe view is mobile-optimized)
2. **Placeholder Pages** - Only Generate Designs is fully functional
3. **No RBAC** - No role-based access control yet (anyone can access admin)
4. **No Auth Gate** - Admin accessible via keyboard shortcut without permission check
5. **Stats Hardcoded** - Dashboard stats show "--" placeholders

## Security Considerations

**Important:** Before production deployment:

1. **Add Authentication Gate**
   - Check if user has admin role before allowing admin access
   - Disable Shift+A shortcut for non-admins
   - Add proper RBAC system

2. **Database Permissions**
   - Restrict admin operations to authorized users only
   - Add RLS policies for admin-only tables
   - Validate permissions server-side

3. **Audit Logging**
   - Log all admin actions
   - Track who did what and when
   - Store IP addresses and timestamps

## File Locations

| File | Location | Purpose |
|------|----------|---------|
| **Main Container** | `components/AdminDashboard.tsx` | Sidebar + content layout |
| **Dashboard Page** | `components/admin/DashboardPage.tsx` | Stats overview |
| **Inventory Page** | `components/admin/InventoryPage.tsx` | Shirt management |
| **Generate Page** | `components/admin/GeneratePage.tsx` | AI design creation |
| **Users Page** | `components/admin/UsersPage.tsx` | User management |
| **Orders Page** | `components/admin/OrdersPage.tsx` | Winners & shipping |
| **Types** | `types.ts` | AdminPage enum |
| **Main App** | `App.tsx` | View switching logic |

## Summary

The Admin Dashboard provides a professional, desktop-optimized interface for managing OneShirt.app. It features:

- **Professional Design** - Clean, modern admin UI with sidebar navigation
- **Dark Theme** - Consistent with main app design
- **Page Management** - 5 distinct admin pages (1 active, 4 placeholders)
- **Easy Access** - Shift+A keyboard shortcut
- **Extensible** - Ready for future feature implementation
- **Responsive** - Smooth animations and transitions

**Next Steps:**
1. Implement real Dashboard stats from database
2. Build out Inventory management page
3. Add User management functionality
4. Create Orders tracking system
5. Add role-based access control
6. Implement audit logging

---

**Last Updated:** 2025-11-04
**Version:** 1.0.0
**Status:** Core structure complete, ready for feature implementation
