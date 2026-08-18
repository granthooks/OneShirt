import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Modal } from "./Modal";
import { Button } from "./Button";

const STEPS = [
  {
    glyph: "👉",
    title: "Swipe the deck",
    copy: "Swipe right on any shirt you'd wear. Swipe left to skip. That's the whole game.",
  },
  {
    glyph: "🎟️",
    title: "Every bid is an entry",
    copy: "You get free welcome credits plus 5 free swipes a day. Every swipe right places one entry.",
  },
  {
    glyph: "🏆",
    title: "Cross the line, win the shirt",
    copy: "Each design has a visible bid target. When it fills up, one entry is drawn at random to win — free.",
  },
  {
    glyph: "🔑",
    title: "No passwords",
    copy: "Sign in with just your email — we'll send you a one-time code. No passwords to remember.",
  },
];

const STORAGE_KEY = "oneshirt_onboarded";

export function OnboardingSplash({
  onDone,
  onGetStarted,
}: {
  onDone: () => void;
  onGetStarted: () => void;
}) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  function finish() {
    localStorage.setItem(STORAGE_KEY, "1");
    onDone();
  }

  function handleNext() {
    if (isLast) {
      finish();
      onGetStarted();
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <AnimatePresence>
      <Modal zIndex={70}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-[84px] w-[84px] items-center justify-center rounded-full border border-lime text-4xl shadow-[0_0_22px_rgba(198,255,77,.5)]">
            {current.glyph}
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-xl uppercase text-white">
            {current.title}
          </h2>
          <p className="text-sm text-muted">{current.copy}</p>

          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${
                  i === step ? "bg-lime" : "bg-border2"
                }`}
              />
            ))}
          </div>

          <Button variant="lime" glow onClick={handleNext} className="w-full">
            {isLast ? "Start Swiping" : "Next"}
          </Button>
          <button
            type="button"
            onClick={finish}
            className="text-xs text-muted underline"
          >
            skip for now
          </button>
        </div>
      </Modal>
    </AnimatePresence>
  );
}

export function hasOnboarded(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "1";
}
