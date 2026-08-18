/**
 * Deterministic gradient placeholders for shirts without art yet, per
 * DESIGN.md "Shirt art placeholders" token list.
 */
const GRADIENTS = [
  ["#ff2d78", "#2d1b69"],
  ["#00ffa3", "#005f73"],
  ["#f9c80e", "#ea3546"],
  ["#7b2ff7", "#00d4ff"],
  ["#ff6b35", "#9b1d64"],
  ["#00d4ff", "#2d1b69"],
  ["#c6ff4d", "#005f73"],
] as const;

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Deterministic 135deg two-color gradient for a shirt, keyed by id. */
export function shirtGradient(id: string): string {
  const [from, to] = GRADIENTS[hashString(id) % GRADIENTS.length];
  return `linear-gradient(135deg, ${from}, ${to})`;
}
