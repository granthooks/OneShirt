/** Full-screen loading state per DESIGN.md. */
export function LoadingScreen() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
      <div
        className="h-[52px] w-[52px] rounded-full border-4 border-t-transparent"
        style={{
          borderColor: "#c6a30e transparent #c6a30e #c6a30e",
          background: "linear-gradient(135deg,#ffe14d,#c6a30e)",
          animation: "spin 0.9s linear infinite",
        }}
      />
      <div className="font-[family-name:var(--font-display)] text-[26px] uppercase">
        ONE<span className="text-pink">SHIRT</span>
      </div>
      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-[#1a1a30]">
        <div
          className="h-full w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, #c6ff4d, transparent)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.2s linear infinite",
          }}
        />
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[3px] text-faint">
        Loading the drop&hellip;
      </p>
    </div>
  );
}
