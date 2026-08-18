import { Routes, Route } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import { AppShell } from "./components/AppShell";
import { LoadingScreen } from "./components/LoadingScreen";
import DeckPage from "./pages/DeckPage";
import WalletPage from "./pages/WalletPage";
import BidsPage from "./pages/BidsPage";
import OrdersPage from "./pages/OrdersPage";
import RulesPage from "./pages/RulesPage";
import TermsPage from "./pages/TermsPage";
import ShirtSharePage from "./pages/ShirtSharePage";
import NotificationsPage from "./pages/NotificationsPage";
import ProfilePage from "./pages/ProfilePage";
import AdminApp from "./admin/AdminApp";
import { useAuthConfigured } from "./lib/authConfig";
import { useEnsureUser } from "./hooks/useEnsureUser";

export default function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminApp />} />
      <Route path="/*" element={<PlayerRoutes />} />
    </Routes>
  );
}

/**
 * Player route tree, gated on the Convex auth loading state. `useConvexAuth`
 * requires a `ConvexProviderWithAuth` ancestor (which `ConvexProviderWithClerk`
 * provides) — it throws under a plain `ConvexProvider`. So in guest mode
 * (no Clerk mounted) we skip calling it entirely and treat auth as
 * already loaded.
 */
function PlayerRoutes() {
  const authConfigured = useAuthConfigured();
  return authConfigured ? <PlayerRoutesClerk /> : <PlayerRoutesGuest />;
}

function PlayerRoutesClerk() {
  const { isLoading } = useConvexAuth();
  useEnsureUser();
  return (
    <AppShell>
      {isLoading ? <LoadingScreen /> : <PlayerRouteTable />}
    </AppShell>
  );
}

function PlayerRoutesGuest() {
  return (
    <AppShell>
      <PlayerRouteTable />
    </AppShell>
  );
}

function PlayerRouteTable() {
  return (
    <Routes>
      <Route path="/" element={<DeckPage />} />
      <Route path="/wallet" element={<WalletPage />} />
      <Route path="/bids" element={<BidsPage />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/rules" element={<RulesPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/s/:id" element={<ShirtSharePage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/profile" element={<ProfilePage />} />
    </Routes>
  );
}
