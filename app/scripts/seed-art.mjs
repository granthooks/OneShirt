#!/usr/bin/env node
/**
 * Dev-only: uploads local demo artwork to Convex storage and attaches it to
 * the seeded shirts, so the swipe deck shows real cards instead of gradients.
 *
 * ⚠️ The bundled images are third-party product photos — local demo use
 * only, never production. See convex/seed_art.ts for the full note.
 *
 * Usage (after `npx convex run seed:seedDemo`):
 *   node scripts/seed-art.mjs
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(here, "..");
const artDir = resolve(appDir, "..", "images", "shirt_designs");
const convexCli = join(appDir, "node_modules", "convex", "bin", "main.js");

/** Seed shirt name -> artwork file. Names must match convex/seed.ts. */
const MAPPING = [
  ["Santa Paws", "shirt-1760952264-27e8aa4289b2d65842092abd4a50644a.webp"],
  ["Spaceman Jack", "shirt-1761017642-a2c254b6c463852dd924bebd626ffa8b.webp"],
  ["Choose Wisely", "shirt-1761075941-d6a8bdb2435fdbfcdef856389d4ca5dd.webp"],
  ["Super Ramen World", "shirt-1761138522-55e29a692a5271fbe30a03adcaddb26a.webp"],
  ["Peace Stack", "shirt-1761197407-c2ea7fe4c19b66b55c1e9be635070758.webp"],
  ["Rock Element", "shirt-1761315424-4e4094134151e2986cde6336e24682d4.webp"],
  ["Tax the Rich", "original-1761576585-05f41c98c6beae7fd33dcb9a5ccd7285.webp"],
];

let ok = 0;
for (const [shirtName, file] of MAPPING) {
  const base64 = readFileSync(join(artDir, file)).toString("base64");
  const args = JSON.stringify({
    shirtName,
    contentType: "image/webp",
    base64,
  });
  process.stdout.write(`${shirtName} ... `);
  try {
    // `convex run` takes args only as an argv entry, and a base64 image blows
    // past the ~8KB cmd.exe command-line limit. Invoke the CLI's JS entry
    // with node directly: no shell, so argv is passed straight through.
    const out = execFileSync(
      process.execPath,
      [convexCli, "run", "seed_art:seedShirtArt", args],
      {
        cwd: appDir,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      }
    );
    const attached = out.includes('"attached": true');
    console.log(attached ? "attached" : `skipped — ${out.trim()}`);
    if (attached) ok++;
  } catch (err) {
    console.log(`FAILED\n${err.stdout || err.message}`);
  }
}
console.log(`\n${ok}/${MAPPING.length} shirts have artwork.`);
