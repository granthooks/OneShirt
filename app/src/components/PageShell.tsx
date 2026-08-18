import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

/** Shared header + back-nav wrapper for secondary pages (mobile column). */
export function PageShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <div className="flex items-center gap-3 px-4 py-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border2 text-white transition-transform duration-[120ms] active:scale-90"
          aria-label="Back"
        >
          &larr;
        </button>
        <h1 className="font-[family-name:var(--font-display)] text-lg uppercase text-white">
          {title}
        </h1>
      </div>
      <div className="flex-1 px-4 pb-8">{children}</div>
    </div>
  );
}
