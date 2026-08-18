import type { ReactNode } from "react";
import { motion } from "framer-motion";

/**
 * Centered modal overlay per DESIGN.md: `position:absolute; inset:0`
 * within the app frame, dark scrim, fadeUp card entrance.
 */
export function Modal({
  children,
  onClose,
  zIndex = 80,
}: {
  children: ReactNode;
  onClose?: () => void;
  zIndex?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="absolute inset-0 flex items-center justify-center bg-black/70 p-4"
      style={{ zIndex }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.22 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88%] w-full max-w-[380px] overflow-y-auto rounded-[20px] border border-border bg-panel p-6 shadow-[0_24px_64px_rgba(0,0,0,.5)]"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/** Bottom sheet variant per DESIGN.md buy-credits sheet spec. */
export function Sheet({
  children,
  onClose,
  zIndex = 75,
}: {
  children: ReactNode;
  onClose?: () => void;
  zIndex?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="absolute inset-0 flex items-end justify-center bg-black/70"
      style={{ zIndex }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85%] w-full max-w-[430px] overflow-y-auto rounded-t-[26px] border-t-2 border-lime bg-panel p-6 pb-8"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
