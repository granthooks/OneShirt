import { internalMutation } from "./_generated/server";
import { getConfig } from "./lib/config";

/**
 * Demo data seed: 6-8 active shirts with realistic names/designers in the
 * spirit of the design mock. No fake bids or entries — bidCount starts at
 * 0 for every shirt per docs/02-game-mechanics.md ⚖️ rule 5 ("no
 * fabricated activity of any kind"). Guarded: no-op if any shirts already
 * exist.
 *
 * Note: these shirts are inserted without printMasterId/webImageId
 * (schema.ts makes both optional to support draft/seed shirts without
 * generated art yet). Cards render as gradient placeholders until art is
 * attached — for local dev run `node scripts/seed-art.mjs` afterwards, or
 * generate real art via the admin Generate page.
 */
export const seedDemo = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("shirts").first();
    if (existing) {
      return { skipped: true, reason: "shirts already exist" };
    }

    // Seed data needs a createdBy user; use the first admin/user found, or
    // create a lightweight system placeholder if none exists yet.
    let systemUser = await ctx.db.query("users").first();
    if (!systemUser) {
      const systemUserId = await ctx.db.insert("users", {
        clerkId: "seed-system",
        email: "seed-system@oneshirt.local",
        name: "OneShirt Seed",
        role: "admin",
        availableCredits: 0,
        stakedCredits: 0,
        freeSwipesRemaining: 0,
        streakDays: 0,
        referralCode: "SEEDSYS01",
        createdAt: Date.now(),
      });
      systemUser = await ctx.db.get(systemUserId);
      if (!systemUser) {
        throw new Error("Failed to create seed system user");
      }
    }

    const config = await getConfig(ctx);
    const now = Date.now();
    const expiresAt = now + config.shirtExpiryDays * 24 * 60 * 60 * 1000;

    const seedShirts: Array<{
      name: string;
      designer: string;
      description: string;
      bidThreshold: number;
      likeCount: number;
    }> = [
      {
        name: "Santa Paws",
        designer: "Riko Tanaka",
        description: "A corgi in a Santa hat riding a sleigh of presents.",
        bidThreshold: 600,
        likeCount: 42,
      },
      {
        name: "Spaceman Jack",
        designer: "MewMew Studio",
        description: "A jack-o'-lantern astronaut adrift in the stars.",
        bidThreshold: 600,
        likeCount: 58,
      },
      {
        name: "Choose Wisely",
        designer: "P. Alvarez",
        description: "Three iconic time machines and one impossible decision.",
        bidThreshold: 450,
        likeCount: 31,
      },
      {
        name: "Super Ramen World",
        designer: "Anonymous",
        description: "8-bit ramen with power-up toppings. 1 player game.",
        bidThreshold: 600,
        likeCount: 19,
      },
      {
        name: "Peace Stack",
        designer: "Net Nostalgia",
        description: "A retro peace sign echoing in faded 70s colors.",
        bidThreshold: 500,
        likeCount: 27,
      },
      {
        name: "Rock Element",
        designer: "V. Okafor",
        description: "Einstein in face paint spelling R-O-C-K in elements.",
        bidThreshold: 600,
        likeCount: 36,
      },
      {
        name: "Tax the Rich",
        designer: "Studio Vermillion",
        description: "Hand-lettered typography with a sharp point of view.",
        bidThreshold: 600,
        likeCount: 64,
      },
    ];

    const insertedIds = [];
    for (const seedShirt of seedShirts) {
      const perUserEntryCap = Math.max(
        1,
        Math.round((seedShirt.bidThreshold * config.perUserEntryCapPct) / 100)
      );
      const id = await ctx.db.insert("shirts", {
        name: seedShirt.name,
        designer: seedShirt.designer,
        description: seedShirt.description,
        // No printMasterId/webImageId — art not generated yet for seed data.
        status: "active",
        bidThreshold: seedShirt.bidThreshold,
        bidCount: 0,
        entryCount: 0,
        retailPriceCents: config.defaultRetailCents,
        prizeCostCents: 1500,
        earlyBirdRemaining: config.earlyBirdWindow,
        perUserEntryCap,
        activatedAt: now,
        expiresAt,
        likeCount: seedShirt.likeCount,
        createdBy: systemUser._id,
        createdAt: now,
      });
      insertedIds.push(id);
    }

    return { skipped: false, insertedCount: insertedIds.length };
  },
});
