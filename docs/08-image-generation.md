# 08 — AI Design Generation (Fal.ai)

## Models

- **Primary:** `fal-ai/nano-banana-2` (Gemini 3.1 Flash Image via Fal). ~$0.08/image at 1K, $0.12 at 2K, $0.16 at 4K. Params: `prompt`, `resolution: "1K"|"2K"|"4K"`, `aspect_ratio`, `output_format: "png"`, `num_images` (1–4), `seed`.
- **Background removal:** `fal-ai/birefnet` — nano-banana-2 does not output transparency; DTG print files need transparent backgrounds.
- Optional quality tier: `fal-ai/nano-banana-pro` ($0.15/1K) if typography-heavy designs underperform — expose model choice in the admin generate UI.

## Pipeline (`generation.generateDesign` action, admin-only)

1. Wrap the admin's prompt with the print template:
   > "T-shirt graphic design, isolated on a plain solid white background, centered composition, bold screen-print style, no shirt, no mockup, no watermark: {prompt}"
2. Call `fal.subscribe("fal-ai/nano-banana-2", {resolution: "2K", output_format: "png", num_images: 4, ...})` — generate 4 candidates per prompt (admin picks; $0.48/batch is cheap vs a bad design in the catalog). Use `@fal-ai/client` from the Convex action with `FAL_KEY` from env.
3. Admin selects candidate(s) in the UI. For each selected:
   a. Run `fal-ai/birefnet` on the image URL → transparent PNG.
   b. Fetch result; store in Convex storage as **printMaster** (keep full 2K PNG).
   c. Produce **web rendition**: downscale to ~800px, composite onto the card background color, encode webp (do this in the action with a lightweight wasm image lib, or accept PNG at reduced size for v1 simplicity).
4. Return `{candidates: [{printMasterId, webImageId, previewUrl}]}`; admin then calls `admin.createShirt` with a chosen candidate, name, threshold, retail price.

## Requirements & guardrails

- **Never** return or store base64 data URLs in documents (legacy mistake) — storage IDs only.
- Record generation metadata on the shirt (`prompt`, `model`, `seed`) in a `generationMeta` optional field for reproducibility.
- Fal errors → surface to admin UI verbatim-ish; no retry storms (one manual retry button).
- Print master validation before a shirt can be **activated**: PNG, ≥1800px on the short side (Printify DTG wants ~150+ DPI at 12" print width), has transparency. Enforce in `admin.activateShirt`.
- Cost telemetry: log per-generation cost estimate to admin stats.

## v2 hook (documented, not built)

"Generate your own shirt" as a paid player feature (e.g. 5 credits/generation, design enters the public deck if approved). The pipeline above is deliberately reusable for this — keep the action's core generation/storage logic separate from the admin authorization wrapper.
