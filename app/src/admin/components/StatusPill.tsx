/**
 * Color-coded status pill shared across admin pages, per DESIGN.md
 * inventory/orders row spec.
 */
const SHIRT_STATUS_COLOR: Record<string, string> = {
  active: "text-lime border-lime",
  drawing: "text-yellow border-yellow",
  won: "text-pink border-pink",
  draft: "text-muted border-border2",
  expired: "text-faint border-border2",
  archived: "text-faint border-border2",
};

const ORDER_STATUS_COLOR: Record<string, string> = {
  pending_info: "text-yellow border-yellow",
  submitting: "text-cyan border-cyan",
  in_production: "text-cyan border-cyan",
  shipped: "text-lime border-lime",
  delivered: "text-lime border-lime",
  canceled: "text-faint border-border2",
  failed: "text-pink border-pink",
};

export function StatusPill({
  status,
  kind = "shirt",
}: {
  status: string;
  kind?: "shirt" | "order";
}) {
  const colorMap = kind === "shirt" ? SHIRT_STATUS_COLOR : ORDER_STATUS_COLOR;
  const color = colorMap[status] ?? "text-muted border-border2";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border px-3 py-1 font-mono text-[9.5px] uppercase tracking-[2px] ${color}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
