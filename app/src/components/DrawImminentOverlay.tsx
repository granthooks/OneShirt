import { motion } from "framer-motion";
import { Button } from "./Button";

/** Full-screen anticipation interstitial when *my* bid crosses a threshold. */
export function DrawImminentOverlay({
  shirtName,
  onDismiss,
}: {
  shirtName: string;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[60] flex flex-col items-center justify-center gap-5 bg-[rgba(5,5,15,.94)] px-8 text-center"
    >
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: [0.3, 1.08, 1], opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-5xl"
      >
        &#9889;
      </motion.div>
      <h1
        className="font-[family-name:var(--font-display)] text-4xl uppercase text-pink"
        style={{ textShadow: "0 0 24px rgba(255,45,120,.6)" }}
      >
        Draw Imminent
      </h1>
      <p className="text-sm text-white">
        <span className="font-bold text-lime">{shirtName}</span> just hit its
        bid threshold.
      </p>
      <p className="max-w-[280px] text-xs text-muted">
        A winner will be drawn at random from every entry soon. You&apos;ll be
        notified the moment it happens.
      </p>
      <Button variant="lime" glow onClick={onDismiss}>
        Back to the deck
      </Button>
    </motion.div>
  );
}
