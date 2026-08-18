import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: "◈", end: true },
  { to: "/admin/inventory", label: "Inventory", icon: "▤" },
  { to: "/admin/generate", label: "Generate", icon: "✦" },
  { to: "/admin/users", label: "Users", icon: "◍" },
  { to: "/admin/orders", label: "Orders", icon: "▣" },
  { to: "/admin/draws", label: "Draws", icon: "◎" },
  { to: "/admin/config", label: "Config", icon: "⚙" },
];

/** Desktop-oriented sidebar shell per DESIGN.md "Admin back-office". */
export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen min-w-[1280px] bg-[#0a0a12] text-white">
      <aside className="flex w-[212px] shrink-0 flex-col border-r border-border bg-[#0d0d18]">
        <div className="px-5 py-6">
          <div className="font-[family-name:var(--font-display)] text-lg uppercase tracking-wide">
            ONE<span className="text-pink">SHIRT</span>
          </div>
          <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[3px] text-pink">
            Admin Console
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#1a1a30] text-lime"
                    : "text-muted hover:bg-[#1a1a30] hover:text-white"
                }`
              }
            >
              <span className="w-4 text-center text-base">{item.icon}</span>
              <span className="font-mono text-[10.5px] uppercase tracking-[1.5px]">
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4">
          <p className="font-mono text-[9px] uppercase tracking-[2px] text-faint">
            OneShirt Admin v1.0
          </p>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <HeaderBar />
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </main>
    </div>
  );
}

function HeaderBar() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(interval);
  }, []);

  const title = useTabTitle();
  const dateLabel = now
    .toUTCString()
    .replace(" GMT", " UTC")
    .toUpperCase();

  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-5">
      <h1 className="font-[family-name:var(--font-display)] text-xl uppercase tracking-wide">
        {title}
      </h1>
      <span className="font-mono text-[10px] uppercase tracking-[2px] text-faint">
        {dateLabel}
      </span>
    </header>
  );
}

const TITLE_BY_PATH: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/inventory": "Inventory",
  "/admin/generate": "Generate Designs",
  "/admin/users": "Users",
  "/admin/orders": "Orders",
  "/admin/draws": "Draws",
  "/admin/config": "Config",
};

function useTabTitle(): string {
  const location = useLocation();
  return TITLE_BY_PATH[location.pathname] ?? "Admin";
}
