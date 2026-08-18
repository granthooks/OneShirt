import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "lime" | "pink" | "outline-lime" | "outline-pink" | "outline";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-bold uppercase transition-transform duration-[120ms] active:scale-90 disabled:opacity-40 disabled:active:scale-100";

const variants: Record<Variant, string> = {
  lime: "bg-lime text-ink hover:bg-lime-hover",
  pink: "bg-pink text-white shadow-[0_6px_20px_rgba(255,45,120,.45)]",
  "outline-lime": "border border-lime text-lime bg-transparent",
  "outline-pink": "border border-pink text-pink bg-transparent",
  outline: "border border-border2 text-white bg-transparent",
};

export function Button({
  variant = "lime",
  glow = false,
  className = "",
  children,
  ...rest
}: {
  variant?: Variant;
  glow?: boolean;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`${base} ${variants[variant]} ${glow ? "animate-[glowPulse_2.4s_infinite]" : ""} px-5 py-3 text-xs tracking-[1px] ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
