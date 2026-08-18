import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

/** Gold coin + lime credit count pill; pops on change per DESIGN.md. */
export function CreditPill({ credits }: { credits: number }) {
  const [pop, setPop] = useState(false);
  const prev = useRef(credits);

  useEffect(() => {
    if (prev.current !== credits) {
      prev.current = credits;
      setPop(true);
      const t = setTimeout(() => setPop(false), 260);
      return () => clearTimeout(t);
    }
  }, [credits]);

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-lime bg-panel px-3 py-1.5 shadow-[0_0_16px_rgba(198,255,77,.35)]">
      <span
        className="h-4 w-4 rounded-full border"
        style={{
          background: "linear-gradient(135deg,#ffe14d,#c6a30e)",
          borderColor: "#8f7408",
        }}
      />
      <motion.span
        animate={pop ? { scale: [1, 1.55, 1] } : { scale: 1 }}
        transition={{ duration: 0.26 }}
        className="text-sm font-bold text-lime"
      >
        {credits}
      </motion.span>
    </div>
  );
}
