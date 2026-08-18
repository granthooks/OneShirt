import type { ReactNode } from "react";
import { ToastProvider } from "./Toast";

/**
 * Mobile-first app frame: full-bleed on mobile, ~430px centered column on
 * desktop, dark radial gradient background per DESIGN.md.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen justify-center overflow-hidden bg-[#111118]">
      <div
        className="relative flex h-full w-full max-w-[430px] min-h-0 flex-col overflow-hidden"
        style={{
          background:
            "radial-gradient(130% 70% at 50% 0%, #1a1a34 0%, #0a0a12 62%)",
        }}
      >
        <ToastProvider>{children}</ToastProvider>
      </div>
    </div>
  );
}
