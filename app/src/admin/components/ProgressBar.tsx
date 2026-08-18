/** Mini lime→mint progress bar, per DESIGN.md admin inventory/dashboard rows. */
export function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[.14]">
      <div
        className="h-full rounded-full transition-[width] duration-[400ms]"
        style={{
          width: `${clamped}%`,
          background: "linear-gradient(90deg,#c6ff4d,#00ffa3)",
        }}
      />
    </div>
  );
}
