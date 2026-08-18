import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

const DEFAULT_CONFIG = {
  defaultThreshold: 600,
  defaultRetailCents: 3499,
  creditPacks: [
    { credits: 100, priceCents: 499, stripePriceId: "" },
    { credits: 500, priceCents: 1999, stripePriceId: "" },
    { credits: 1200, priceCents: 3999, stripePriceId: "" },
  ],
  welcomeCredits: 20,
  freeSwipesPerDay: 5,
  earlyBirdWindow: 100,
  earlyBirdWeight: 2,
  perUserEntryCapPct: 10,
  shirtExpiryDays: 30,
  drawDelayMinutes: 30,
  streakBonus: { days: 7, credits: 10 },
  referralBonus: { referrer: 20, referee: 20 },
  prizeLoadWarnPct: [15, 25],
  // Bella+Canvas 3001 (blueprint 12); print provider is shop-specific and
  // must be set via admin.updateConfig once chosen in the Printify
  // dashboard — 0 is a safe "unset" sentinel that printify.ts rejects.
  printifyDefaults: { blueprintId: 12, printProviderId: 0 },
};

/**
 * Return the singleton gameConfig row, inserting defaults if missing.
 * Only usable from a mutation when the row doesn't exist yet (it will
 * insert it); when called from a query context and the row is missing,
 * the in-memory defaults are returned without persisting them.
 */
export async function getConfig(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"gameConfig">> {
  const existing = await ctx.db.query("gameConfig").first();
  if (existing) {
    return existing;
  }

  if ("insert" in ctx.db) {
    const id = await (ctx as MutationCtx).db
      .insert("gameConfig", DEFAULT_CONFIG);
    const inserted = await ctx.db.get(id);
    if (!inserted) {
      throw new Error("Failed to insert default gameConfig");
    }
    return inserted;
  }

  // Query context with no row yet: return defaults without persisting.
  return { ...DEFAULT_CONFIG, _id: undefined, _creationTime: Date.now() } as unknown as Doc<"gameConfig">;
}
