import { Link, Routes, Route } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { ToastProvider } from "../components/Toast";
import { AdminLayout } from "./components/AdminLayout";
import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
import GeneratePage from "./pages/GeneratePage";
import UsersPage from "./pages/UsersPage";
import OrdersPage from "./pages/OrdersPage";
import DrawsPage from "./pages/DrawsPage";
import ConfigPage from "./pages/ConfigPage";
import { useAuthConfigured } from "../lib/authConfig";
import { useEnsureUser } from "../hooks/useEnsureUser";

/**
 * `/admin/*` entry point. Cosmetic client-side gate — every admin.ts query
 * and mutation also calls `requireAdmin` server-side, so this is UI-only.
 *
 * `useConvexAuth` requires a `ConvexProviderWithAuth` ancestor (provided by
 * `ConvexProviderWithClerk`) and throws under a plain `ConvexProvider`, so
 * in guest mode (no Clerk mounted) we never call it — a separate branch
 * renders the gate with auth trivially treated as "loaded" and signed out,
 * which always shows the Admins Only screen.
 */
export default function AdminApp() {
  const authConfigured = useAuthConfigured();
  return authConfigured ? <AdminGateClerk /> : <AdminGateGuest />;
}

function AdminGateClerk() {
  const { isLoading } = useConvexAuth();
  useEnsureUser();
  return <AdminGate isLoading={isLoading} />;
}

function AdminGateGuest() {
  return <AdminGate isLoading={false} />;
}

function AdminGate({ isLoading }: { isLoading: boolean }) {
  const { isSignedIn, isAdmin, user } = useCurrentUser();

  if (isLoading || (isSignedIn && user === undefined)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a12]">
        <p className="font-mono text-xs uppercase tracking-[3px] text-faint">
          Loading…
        </p>
      </div>
    );
  }

  if (!isSignedIn || !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0a0a12] px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-pink text-2xl text-pink">
          ✕
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl uppercase text-pink">
          Admins Only
        </h1>
        <p className="max-w-xs text-sm text-muted">
          This area is restricted to OneShirt admins.
        </p>
        <Link
          to="/"
          className="rounded-full border border-lime px-5 py-2.5 text-xs font-bold uppercase tracking-[1px] text-lime transition-transform duration-[120ms] active:scale-90"
        >
          Back to the deck
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <ToastProvider>
        <AdminLayout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/generate" element={<GeneratePage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/draws" element={<DrawsPage />} />
            <Route path="/config" element={<ConfigPage />} />
          </Routes>
        </AdminLayout>
      </ToastProvider>
    </div>
  );
}
