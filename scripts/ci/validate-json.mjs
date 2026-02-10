#!/usr/bin/env node
// =============================================================================
// validate-json.mjs — CI helper: validate JSON configuration files
// =============================================================================
// Parses openclaw.json and reports any syntax errors.
// Exit code 0 = all valid, 1 = error found.
// =============================================================================

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

const files = [
  "openclaw.json",
  "extension/manifest.json",
  "web/public/manifest.json",
];

let hasError = false;

for (const file of files) {
  const filePath = resolve(ROOT, file);
  try {
    const content = readFileSync(filePath, "utf-8");
    JSON.parse(content);
    console.log(`✓ ${file} — valid JSON`);
  } catch (err) {
    console.error(`✗ ${file} — invalid JSON`);
    console.error(`  ${err.message}`);
    hasError = true;
  }
}

if (hasError) {
  process.exit(1);
} else {
  console.log("\nAll JSON files are valid.");
}
