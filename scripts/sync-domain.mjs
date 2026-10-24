// Copies the pure domain files the Edge Function needs into supabase/functions/_shared/domain.
// Supabase bundles only the functions folder, so the function cannot import ../../src directly.
// These files import nothing outside src/domain and no npm packages, so they run in Deno as-is.
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "src", "domain");
const to = join(root, "supabase", "functions", "_shared", "domain");

const FILES = [
  "dates.ts",
  "errors.ts",
  "SleepSpan.ts",
  "Mood.ts",
  "DailyEntry.ts",
  "Settings.ts",
  "StreakCalculator.ts",
  "SummaryBuilder.ts",
];

mkdirSync(to, { recursive: true });
for (const file of FILES) {
  const source = readFileSync(join(from, file), "utf8");
  // Guard: a domain file used by the device must stay dependency-free.
  const bad = [...source.matchAll(/from\s+"([^"]+)"/g)]
    .map((m) => m[1])
    .filter((spec) => !spec.startsWith("./"));
  if (bad.length)
    throw new Error(`${file} imports ${bad.join(", ")}; the Edge Function cannot use that`);
  copyFileSync(join(from, file), join(to, file));
}
console.log(`Copied ${FILES.length} domain files to ${to}`);
