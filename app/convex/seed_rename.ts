import { internalMutation } from "./_generated/server";

/**
 * One-shot dev migration: renames the original placeholder seed shirts to
 * match the demo artwork attached by scripts/seed-art.mjs.
 *
 * Renames in place rather than re-seeding because existing seed shirts may
 * already carry real bids/entries, which must never be destroyed
 * (docs/02-game-mechanics.md — staked credits are a real liability).
 * Idempotent: shirts already renamed are skipped.
 */
const RENAMES: Array<{
  from: string;
  to: string;
  designer: string;
  description: string;
}> = [
  {
    from: "Ghost in the Machine",
    to: "Santa Paws",
    designer: "Riko Tanaka",
    description: "A corgi in a Santa hat riding a sleigh of presents.",
  },
  {
    from: "Tokyo Drift Cat",
    to: "Spaceman Jack",
    designer: "MewMew Studio",
    description: "A jack-o'-lantern astronaut adrift in the stars.",
  },
  {
    from: "Sunset Overdrive",
    to: "Choose Wisely",
    designer: "P. Alvarez",
    description: "Three iconic time machines and one impossible decision.",
  },
  {
    from: "Brutalist Banana",
    to: "Super Ramen World",
    designer: "Anonymous",
    description: "8-bit ramen with power-up toppings. 1 player game.",
  },
  {
    from: "Dial-Up Dreams",
    to: "Peace Stack",
    designer: "Net Nostalgia",
    description: "A retro peace sign echoing in faded 70s colors.",
  },
  {
    from: "Acid Rain Club",
    to: "Rock Element",
    designer: "V. Okafor",
    description: "Einstein in face paint spelling R-O-C-K in elements.",
  },
];

export const renameSeedShirts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const renamed: string[] = [];
    for (const entry of RENAMES) {
      const shirt = await ctx.db
        .query("shirts")
        .filter((q) => q.eq(q.field("name"), entry.from))
        .first();
      if (!shirt) continue;
      await ctx.db.patch(shirt._id, {
        name: entry.to,
        designer: entry.designer,
        description: entry.description,
      });
      renamed.push(`${entry.from} -> ${entry.to}`);
    }
    return { renamed, count: renamed.length };
  },
});
