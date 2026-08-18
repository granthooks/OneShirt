import { motion } from "framer-motion";
import { Button } from "./Button";
import { Confetti } from "./Confetti";
import { shirtGradient } from "../lib/shirtArt";

export function WinOverlay({
  shirtName,
  shirtImageUrl,
  shirtId,
  onConfirmDetails,
  onDismiss,
}: {
  shirtName: string;
  shirtImageUrl: string | null;
  shirtId: string;
  onConfirmDetails: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[60] flex flex-col items-center justify-center gap-5 bg-[rgba(5,5,15,.94)] px-8 text-center"
    >
      <Confetti />
      <motion.h1
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: [0.3, 1.08, 1], opacity: 1 }}
        transition={{ duration: 0.55 }}
        className="font-[family-name:var(--font-display)] text-[44px] uppercase text-lime"
        style={{ textShadow: "0 0 32px rgba(198,255,77,.6)" }}
      >
        Jackpot!
      </motion.h1>

      <div
        className="h-[180px] w-[150px] rounded-[16px]"
        style={{
          background: shirtImageUrl
            ? `center / cover no-repeat url(${shirtImageUrl})`
            : shirtGradient(shirtId),
        }}
      />

      <p className="font-[family-name:var(--font-display)] text-lg uppercase text-white">
        {shirtName}
      </p>
      <p className="max-w-[280px] text-xs text-muted">
        It&apos;s yours &mdash; free. Confirm your size and shipping address
        so we can send it your way.
      </p>

      <div className="flex flex-col gap-3">
        <Button variant="lime" glow onClick={onConfirmDetails}>
          Confirm size &amp; address
        </Button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full bg-pink px-5 py-3 text-xs font-bold uppercase tracking-[1px] text-white shadow-[0_6px_20px_rgba(255,45,120,.45)] transition-transform duration-[120ms] active:scale-90"
        >
          Back to the deck
        </button>
      </div>
    </motion.div>
  );
}
