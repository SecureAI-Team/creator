#!/usr/bin/env node
// =============================================================================
// check-structure.mjs — CI helper: verify project structural integrity
// =============================================================================
// Cross-references tools.yaml, platforms.yaml, openclaw.json, and skills/
// to ensure consistency. Uses simple regex-based YAML parsing (no deps).
//
// Checks:
//   1. Every `skill` in tools.yaml has a matching directory under skills/
//   2. Every `publish_skill` / `data_skill` in platforms.yaml has a matching
//      directory under skills/
//   3. Every browser `profile` referenced in tools.yaml / platforms.yaml
//      exists in openclaw.json browser.profiles
//   4. Every skill directory contains a SKILL.md file
// =============================================================================

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readFile(relPath) {
  return readFileSync(resolve(ROOT, relPath), "utf-8");
}

/**
 * Minimal YAML field extractor.
 * Extracts top-level mapping keys and specific scalar fields from our
 * well-structured YAML files. Returns an array of objects with the
 * extracted fields.
 */
function extractYamlEntries(content, fields) {
  const entries = [];
  let current = null;
  const indent = "    "; // 4-space indent for field lines

  for (const line of content.split("\n")) {
    // Top-level entry under a root mapping (2-space indent, like "  chatgpt:")
    const entryMatch = line.match(/^  (\S[^:]*?):\s*$/);
    if (entryMatch) {
      if (current) entries.push(current);
      current = { _key: entryMatch[1] };
      continue;
    }

    // Field line (4-space indent)
    if (current) {
      for (const field of fields) {
        const re = new RegExp(`^${indent}${field}:\\s*"?([^"\\n]+)"?\\s*$`);
        const m = line.match(re);
        if (m) {
          current[field] = m[1].trim();
        }
      }
    }
  }
  if (current) entries.push(current);
  return entries;
}

// ---------------------------------------------------------------------------
// Load data
// ---------------------------------------------------------------------------

const openclawJson = JSON.parse(readFile("openclaw.json"));
const browserProfiles = Object.keys(openclawJson.browser?.profiles || {});

const toolsYaml = readFile("workspace/config/tools.yaml");
const platformsYaml = readFile("workspace/config/platforms.yaml");

const tools = extractYamlEntries(toolsYaml, ["skill", "profile"]);
const platforms = extractYamlEntries(platformsYaml, [
  "publish_skill",
  "data_skill",
  "profile",
]);

// Get skill directories
const skillsDir = resolve(ROOT, "skills");
const skillDirs = existsSync(skillsDir)
  ? readdirSync(skillsDir).filter((d) =>
      statSync(join(skillsDir, d)).isDirectory()
    )
  : [];

// ---------------------------------------------------------------------------
// Run checks
// ---------------------------------------------------------------------------

const errors = [];

// Check 1: Every tool skill exists as a skills/ directory
for (const tool of tools) {
  if (tool.skill && !skillDirs.includes(tool.skill)) {
    errors.push(
      `[tools.yaml] Tool "${tool._key}" references skill "${tool.skill}" but skills/${tool.skill}/ does not exist`
    );
  }
}

// Check 2: Every platform skill exists as a skills/ directory
for (const platform of platforms) {
  if (platform.publish_skill && !skillDirs.includes(platform.publish_skill)) {
    errors.push(
      `[platforms.yaml] Platform "${platform._key}" references publish_skill "${platform.publish_skill}" but skills/${platform.publish_skill}/ does not exist`
    );
  }
  if (platform.data_skill && !skillDirs.includes(platform.data_skill)) {
    errors.push(
      `[platforms.yaml] Platform "${platform._key}" references data_skill "${platform.data_skill}" but skills/${platform.data_skill}/ does not exist`
    );
  }
}

// Check 3: Every browser profile reference exists in openclaw.json
for (const tool of tools) {
  if (tool.profile && !browserProfiles.includes(tool.profile)) {
    errors.push(
      `[tools.yaml] Tool "${tool._key}" references browser profile "${tool.profile}" not found in openclaw.json`
    );
  }
}
for (const platform of platforms) {
  if (platform.profile && !browserProfiles.includes(platform.profile)) {
    errors.push(
      `[platforms.yaml] Platform "${platform._key}" references browser profile "${platform.profile}" not found in openclaw.json`
    );
  }
}

// Check 4: Every skill directory contains SKILL.md
for (const dir of skillDirs) {
  const skillMd = join(skillsDir, dir, "SKILL.md");
  if (!existsSync(skillMd)) {
    errors.push(
      `[skills/] Directory "skills/${dir}/" is missing SKILL.md`
    );
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log("=== Project Structure Check ===\n");
console.log(`Tools found:      ${tools.length}`);
console.log(`Platforms found:   ${platforms.length}`);
console.log(`Skill dirs found:  ${skillDirs.length}`);
console.log(`Browser profiles:  ${browserProfiles.length}\n`);

if (errors.length === 0) {
  console.log("✓ All structural checks passed.");
  process.exit(0);
} else {
  console.error(`✗ Found ${errors.length} error(s):\n`);
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}
