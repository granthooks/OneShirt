"use node";

import { createFalClient } from "@fal-ai/client";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";

const PRINT_TEMPLATE_PREFIX =
  "T-shirt graphic design, isolated on a plain solid white background, " +
  "centered composition, bold screen-print style, no shirt, no mockup, " +
  "no watermark: ";

function getFalClient() {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    throw new ConvexError("NOT_CONFIGURED: FAL_KEY is not set");
  }
  return createFalClient({ credentials: falKey });
}

type NanoBananaOutput = {
  images: { url: string; content_type?: string }[];
  seed?: number;
};

type BirefnetOutput = {
  image: { url: string; content_type?: string };
};

/**
 * Admin-only AI design generation (docs/08-image-generation.md). Wraps the
 * prompt with the print template, generates 4 candidates via
 * fal-ai/nano-banana-2, runs background removal (fal-ai/birefnet) on each,
 * and stores the results in Convex storage as print masters. Returns
 * storage ids + preview URLs; `admin.createShirt` turns a chosen candidate
 * into a draft shirt.
 */
export const generateDesign = action({
  args: {
    prompt: v.string(),
    resolution: v.optional(
      v.union(v.literal("1K"), v.literal("2K"), v.literal("4K"))
    ),
  },
  handler: async (ctx, args) => {
    const admin = await ctx.runQuery(internal.generation_helpers.getCallerAdmin, {});
    if (!admin) {
      throw new ConvexError("NOT_ADMIN");
    }

    const fal = getFalClient();
    const resolution = args.resolution ?? "2K";
    const fullPrompt = `${PRINT_TEMPLATE_PREFIX}${args.prompt}`;

    let genResult;
    try {
      genResult = await fal.subscribe("fal-ai/nano-banana-2", {
        input: {
          prompt: fullPrompt,
          resolution,
          aspect_ratio: "1:1",
          output_format: "png",
          num_images: 4,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ConvexError(`Fal generation failed: ${message}`);
    }

    const output = genResult.data as unknown as NanoBananaOutput;
    if (!output.images || output.images.length === 0) {
      throw new ConvexError("Fal returned no candidate images");
    }

    const candidates = [];
    for (const image of output.images) {
      // Background removal — DTG print files need transparency.
      let bgRemoved;
      try {
        bgRemoved = await fal.subscribe("fal-ai/birefnet", {
          input: { image_url: image.url },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new ConvexError(`Fal background removal failed: ${message}`);
      }
      const bgOutput = bgRemoved.data as unknown as BirefnetOutput;
      const transparentUrl = bgOutput.image.url;

      // Fetch and store the transparent PNG as the print master.
      const printMasterRes = await fetch(transparentUrl);
      if (!printMasterRes.ok) {
        throw new ConvexError(
          `Failed to fetch background-removed image: ${printMasterRes.status}`
        );
      }
      const printMasterBlob = await printMasterRes.blob();
      const printMasterId = await ctx.storage.store(printMasterBlob);

      // Web rendition: for v1 simplicity, store the same transparent PNG
      // as the web image too (full downscale/webp compositing pipeline is
      // a later optimization — no base64/data-URL storage either way).
      const webImageId = printMasterId;

      const previewUrl = await ctx.storage.getUrl(printMasterId);

      candidates.push({
        printMasterId,
        webImageId,
        previewUrl,
        seed: output.seed,
      });
    }

    return { candidates, prompt: fullPrompt, model: "fal-ai/nano-banana-2" };
  },
});
