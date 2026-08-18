import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Attaches local demo artwork to seeded shirts so the swipe deck renders
 * real cards instead of gradient placeholders during local development.
 *
 * ⚠️ DEV/DEMO ONLY. The bundled files under images/shirt_designs are
 * third-party product photos (not AI-generated print masters) and must NOT
 * be used in production — see docs/01-product-overview.md ("Threadless
 * scraping/import dropped permanently — copyright liability"). Real
 * catalog art comes from the Fal pipeline in docs/08-image-generation.md.
 *
 * These are also shirt *mockups*, not transparent print masters, so they
 * are attached as webImageId only. printMasterId is deliberately left
 * unset: admin.activateShirt validates print masters, and pointing it at a
 * mockup would defeat that check.
 *
 * Run via scripts/seed-art.mjs (reads the files and passes them here).
 */

/** Attach an already-stored image to a shirt by name. */
export const attachArt = internalMutation({
  args: {
    shirtName: v.string(),
    webImageId: v.id("_storage"),
  },
  handler: async (ctx, { shirtName, webImageId }) => {
    const shirt = await ctx.db
      .query("shirts")
      .filter((q) => q.eq(q.field("name"), shirtName))
      .first();
    if (!shirt) {
      return { attached: false, reason: `no shirt named "${shirtName}"` };
    }
    // Replacing existing art: clean up the old blob so repeated runs don't
    // leak storage.
    if (shirt.webImageId && shirt.webImageId !== webImageId) {
      await ctx.storage.delete(shirt.webImageId);
    }
    await ctx.db.patch(shirt._id, { webImageId });
    return { attached: true, shirtId: shirt._id };
  },
});

/**
 * Store one base64-encoded image and attach it to the named shirt.
 * Base64 is used only as the transport for a dev-time CLI arg — nothing is
 * persisted as a data URL (docs/08-image-generation.md guardrail).
 */
export const seedShirtArt = internalAction({
  args: {
    shirtName: v.string(),
    contentType: v.string(),
    base64: v.string(),
  },
  handler: async (
    ctx,
    { shirtName, contentType, base64 }
  ): Promise<{ attached: boolean; reason?: string; shirtId?: Id<"shirts"> }> => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    if (bytes.length === 0) {
      throw new ConvexError(`Empty image payload for "${shirtName}"`);
    }
    const webImageId = await ctx.storage.store(
      new Blob([bytes], { type: contentType })
    );
    const result = await ctx.runMutation(internal.seed_art.attachArt, {
      shirtName,
      webImageId,
    });
    // Shirt missing (e.g. seed not run) — don't leave an orphan blob behind.
    if (!result.attached) {
      await ctx.storage.delete(webImageId);
    }
    return result;
  },
});
