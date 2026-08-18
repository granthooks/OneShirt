const COLORS = ["#c6ff4d", "#ff2d78", "#00ffa3", "#f9c80e", "#7b2ff7"];

/** Falling confetti strips per DESIGN.md `conf` keyframe. */
export function Confetti() {
  const pieces = Array.from({ length: 24 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((i) => {
        const left = (i * 137.5) % 100;
        const color = COLORS[i % COLORS.length];
        const duration = 2.3 + (i % 5) * 0.25;
        const delay = (i % 8) * 0.15;
        return (
          <span
            key={i}
            className="absolute top-0 block h-3 w-1.5"
            style={{
              left: `${left}%`,
              background: color,
              animation: `conf ${duration}s linear ${delay}s infinite`,
            }}
          />
        );
      })}
    </div>
  );
}
