const STEPS = [1, 5, 10, 25] as const;

/**
 * Compact bid-quantity pill next to the ✓ bid button. Tapping cycles
 * through ×1 / ×5 / ×10 / ×25 — a single, one-handed control rather than a
 * separate +/- stepper, per DESIGN.md's dark-pill/mono-lime language.
 */
export function BidQuantityPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  function cycle() {
    const currentIndex = STEPS.indexOf(value as (typeof STEPS)[number]);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % STEPS.length;
    onChange(STEPS[nextIndex]);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className="flex h-11 min-w-11 items-center justify-center rounded-full border border-border2 bg-panel px-3.5 font-mono text-[15px] font-bold uppercase tracking-[1px] text-lime transition-transform duration-[120ms] active:scale-90"
      aria-label="Bid quantity"
    >
      &times;{value}
    </button>
  );
}
