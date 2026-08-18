import { Button } from "./Button";

/** Full-screen error state with reload action per DESIGN.md. */
export function ErrorScreen() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="flex h-[74px] w-[74px] items-center justify-center rounded-full border-2 border-pink text-3xl text-pink">
        ✕
      </div>
      <h1 className="font-[family-name:var(--font-display)] text-xl uppercase text-white">
        Connection Lost
      </h1>
      <p className="text-sm text-muted">
        We couldn&apos;t reach the drop. Check your connection and try again.
      </p>
      <Button
        variant="lime"
        glow
        onClick={() => window.location.reload()}
      >
        Reload
      </Button>
    </div>
  );
}
