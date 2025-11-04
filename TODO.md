# Admin Dashboard Implementation - TODO List

## Project Overview
Building a comprehensive Admin dashboard system optimized for desktop browsers with sidebar navigation and multiple admin pages.

## Tasks

### 1. Update types.ts - Add AdminPage enum
- [ ] Add AdminPage enum with 5 values: DASHBOARD, INVENTORY, GENERATE, USERS, ORDERS
- [ ] Ensure types are exported properly

### 2. Create AdminDashboard.tsx - Main Container Component
- [ ] Create sidebar navigation (240px width, fixed left)
- [ ] Add OneShirt logo at top of sidebar
- [ ] Add 5 navigation links (Dashboard, Shirt Inventory, Generate Designs, User Management, Winners & Orders)
- [ ] Add Logout button at bottom of sidebar
- [ ] Implement active state highlighting for current page
- [ ] Create main content area (right side, flex-grow)
- [ ] Add header bar in content area with page title and user info
- [ ] Implement conditional rendering based on active admin page
- [ ] Apply desktop-optimized dark theme styling with Tailwind CSS

### 3. Create Placeholder Admin Pages (5 files)
- [ ] Create components/admin/DashboardPage.tsx (stats overview placeholder)
- [ ] Create components/admin/InventoryPage.tsx (shirt management placeholder)
- [ ] Create components/admin/GeneratePage.tsx (will integrate ImageGenerator)
- [ ] Create components/admin/UsersPage.tsx (user management placeholder)
- [ ] Create components/admin/OrdersPage.tsx (winners/shipping placeholder)
- [ ] Each should display title and "Coming soon" message

### 4. Update App.tsx - Add Admin View Routing
- [ ] Add ADMIN value to existing AppView enum
- [ ] Import and use AdminDashboard component
- [ ] Update view switching logic to render AdminDashboard when view === ADMIN
- [ ] Add keyboard shortcut (Shift+A) to toggle admin view
- [ ] Pass necessary data/callbacks to AdminDashboard
- [ ] Ensure admin view is separate from SwipeView

### 5. Testing & Documentation
- [ ] Test admin access via keyboard shortcut
- [ ] Verify sidebar navigation switches pages
- [ ] Test all placeholder pages render correctly
- [ ] Verify desktop layout works properly (sidebar + content)
- [ ] Document how to access admin dashboard
- [ ] Document navigation structure

## Success Criteria
- AdminDashboard.tsx with fully functional sidebar and content area
- 5 placeholder admin page components created
- Updated App.tsx with admin view routing
- Updated types.ts with AdminPage enum
- Keyboard shortcut (Shift+A) to access admin
- Professional desktop-optimized design with dark theme
- All navigation working properly

## Notes
- Desktop-first design (min-width: 1024px)
- Professional admin interface aesthetic
- Consistent dark theme with main app
- Sidebar fixed position with navigation
- Content area for page rendering
- Placeholder pages for future implementation
