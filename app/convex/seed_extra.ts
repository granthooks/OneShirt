import { internalMutation } from "./_generated/server";
import { getConfig } from "./lib/config";

/**
 * Dev helper: inserts the 7th demo shirt ("Tax the Rich"), which postdates
 * the original seed run. seed:seedDemo is guarded (no-op once any shirt
 * exists), so it cannot backfill into a deployment that was already seeded.
 * Idempotent: no-op if the shirt already exists.
 */
export const seedTaxTheRich = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("shirts")
      .filter((q) => q.eq(q.field("name"), "Tax the Rich"))
      .first();
    if (existing) {
      return { skipped: true, reason: "already exists" };
    }

    const systemUser = await ctx.db.query("users").first();
    if (!systemUser) {
      return { skipped: true, reason: "no users — run seed:seedDemo first" };
    }

    const config = await getConfig(ctx);
    const now = Date.now();
    const bidThreshold = 600;

    const id = await ctx.db.insert("shirts", {
      name: "Tax the Rich",
      designer: "Studio Vermillion",
      description: "Hand-lettered typography with a sharp point of view.",
      status: "active",
      bidThreshold,
      bidCount: 0,
      entryCount: 0,
      retailPriceCents: config.defaultRetailCents,
      prizeCostCents: 1500,
      earlyBirdRemaining: config.earlyBirdWindow,
      perUserEntryCap: Math.max(
        1,
        Math.round((bidThreshold * config.perUserEntryCapPct) / 100)
      ),
      activatedAt: now,
      expiresAt: now + config.shirtExpiryDays * 24 * 60 * 60 * 1000,
      likeCount: 64,
      createdBy: systemUser._id,
      createdAt: now,
    });

    return { skipped: false, shirtId: id };
  },
});
