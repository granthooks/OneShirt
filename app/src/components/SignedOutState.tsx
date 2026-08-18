import { useNavigate } from "react-router-dom";

/**
 * Styled signed-out placeholder for pages that require auth (wallet, bids,
 * orders, notifications, profile). Dark themed per DESIGN.md: mono label +
 * short copy + lime LOGIN pill.
 */
export function SignedOutState({
  label,
  onLoginClick,
}: {
  label: string;
  onLoginClick?: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border2 px-6 py-10 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[3px] text-faint">
        Signed out
      </p>
      <p className="text-sm text-muted">{label}</p>
      <button
        type="button"
        onClick={() => (onLoginClick ? onLoginClick() : navigate("/"))}
        className="rounded-full border border-lime px-4 py-2 text-[11px] font-bold uppercase tracking-[1px] text-lime transition-transform duration-[120ms] active:scale-90"
      >
        Login
      </button>
    </div>
  );
}
