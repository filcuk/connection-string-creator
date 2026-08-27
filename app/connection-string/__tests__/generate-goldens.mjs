/**
 * Generate golden connection-string snapshots from current builders.
 * Run: node app/connection-string/__tests__/generate-goldens.mjs
 *
 * Overwrites goldens.json — only do this intentionally when locking
 * current behaviour or after intentional keyword fixes.
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildConnectionString } from "../index.js";
import { allCases } from "./fixtures.js";

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, "goldens.json");

/** @type {Record<string, string>} */
const goldens = {};

for (const { key, db, format, values } of allCases()) {
  goldens[key] = buildConnectionString({ db, driver: format, values });
}

const payload = {
  generatedAt: new Date().toISOString(),
  note: "Locked snapshots of buildConnectionString output. Regenerate only when intentionally updating expected strings.",
  count: Object.keys(goldens).length,
  goldens,
};

writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Wrote ${payload.count} goldens → ${outPath}`);
