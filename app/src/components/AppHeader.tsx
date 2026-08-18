import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { useClerk } from "@clerk/clerk-react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../../convex/_generated/api";
import { CreditPill } from "./CreditPill";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useAuthConfigured } from "../lib/authConfig";

export function AppHeader({ onLoginClick }: { onLoginClick: () => void }) {
  const authConfigured = useAuthConfigured();
  const { isSignedIn, user, isAdmin } = useCurrentUser();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const unreadCount = useQuery(
    api.notifications.unreadCount,
    isSignedIn ? {} : "skip"
  );

  return (
    <header className="relative z-30 flex shrink-0 items-center justify-between px-4 py-3">
      <div className="w-28">
        {isSignedIn && user ? (
          <CreditPill credits={user.availableCredits} />
        ) : (
          <div />
        )}
      </div>

      <div className="font-[family-name:var(--font-display)] text-[17px] uppercase tracking-wide">
        ONE<span className="text-pink">SHIRT</span>
      </div>

      <div className="flex min-w-28 items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => navigate("/notifications")}
          className="relative shrink-0 rounded-full border border-border2 p-1.5 text-white transition-transform duration-[120ms] active:scale-90"
          aria-label="Notifications"
        >
          <span className="text-sm">🔔</span>
          {Boolean(unreadCount) && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink px-1 text-[9px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="shrink-0 rounded-full bg-pink px-2 py-1.5 text-[10px] font-bold uppercase tracking-[1px] text-white shadow-[0_6px_20px_rgba(255,45,120,.45)] transition-transform duration-[120ms] active:scale-90"
          >
            Admin
          </button>
        )}

        {!isSignedIn ? (
          <button
            type="button"
            onClick={onLoginClick}
            className="rounded-full border border-lime px-3 py-1.5 text-[10px] font-bold uppercase tracking-[1px] text-lime transition-transform duration-[120ms] active:scale-90"
          >
            Login
          </button>
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="h-[38px] w-[38px] rounded-full transition-transform duration-[120ms] active:scale-90"
              style={{
                background: "linear-gradient(135deg,#ff2d78,#7b2ff7)",
              }}
              aria-label="Account menu"
            />
            <AnimatePresence>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[64]"
                    onClick={() => setMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 top-12 z-[65] w-44 overflow-hidden rounded-2xl border border-border bg-panel py-2 shadow-[0_24px_64px_rgba(0,0,0,.5)]"
                  >
                    <MenuItem
                      label="Profile"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/profile");
                      }}
                    />
                    <MenuItem
                      label="Wallet"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/wallet");
                      }}
                    />
                    <MenuItem
                      label="My Bids"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/bids");
                      }}
                    />
                    <MenuItem
                      label="Orders"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/orders");
                      }}
                    />
                    <div className="my-1 h-px bg-[#22223a]" />
                    {authConfigured && (
                      <LogoutMenuItem onClick={() => setMenuOpen(false)} />
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </header>
  );
}

/**
 * Isolated so `useClerk()` is only ever called when a ClerkProvider is
 * mounted (authConfigured). Calling it outside a ClerkProvider throws.
 */
function LogoutMenuItem({ onClick }: { onClick: () => void }) {
  const { signOut } = useClerk();
  return (
    <MenuItem
      label="Logout"
      pink
      onClick={() => {
        onClick();
        void signOut();
      }}
    />
  );
}

function MenuItem({
  label,
  onClick,
  pink = false,
}: {
  label: string;
  onClick: () => void;
  pink?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-[#1a1a30] ${
        pink ? "text-pink" : "text-white"
      }`}
    >
      {label}
    </button>
  );
}
