#!/usr/bin/env node
/**
 * Local test script for platform data collectors.
 *
 * Usage:
 *   node desktop/test-collect.js douyin
 *   node desktop/test-collect.js bilibili
 *   node desktop/test-collect.js weixin-mp
 *   node desktop/test-collect.js weixin-channels
 *   node desktop/test-collect.js xiaohongshu
 *   node desktop/test-collect.js all
 *
 * Requires OpenClaw to be running (browser started).
 * Uses the default "openclaw" browser profile.
 */

const path = require("path");
const { collectPlatformData } = require("./platform-scripts");

// Auto-detect paths
const systemNode = process.execPath; // current node
// Try common workspace locations
const candidates = [
  path.join(__dirname, "..", "workspace", "node_modules", "openclaw", "openclaw.mjs"),
  path.join(process.env.APPDATA || "", "creator-desktop", "workspace", "node_modules", "openclaw", "openclaw.mjs"),
];
let openclawPath = candidates.find((p) => require("fs").existsSync(p));

if (!openclawPath) {
  console.error("❌ openclaw.mjs not found. Tried:");
  candidates.forEach((p) => console.error("   ", p));
  console.error("\nSet OPENCLAW_PATH env var or ensure workspace is set up.");
  process.exit(1);
}

const workspaceDir = path.resolve(openclawPath, "..", "..", "..");

async function main() {
  const platform = process.argv[2] || "all";
  console.log(`\n🔍 Testing data collection: ${platform}`);
  console.log(`   Node: ${systemNode}`);
  console.log(`   OpenClaw: ${openclawPath}`);
  console.log(`   Workspace: ${workspaceDir}\n`);

  const start = Date.now();
  try {
    const result = await collectPlatformData(platform, {
      systemNode,
      openclawPath,
      workspaceDir,
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n✅ Done in ${elapsed}s\n`);
    // Pretty-print without rawData (too noisy)
    const cleaned = JSON.parse(JSON.stringify(result, (key, val) => {
      if (key === "rawData") return undefined;
      return val;
    }));
    console.log(JSON.stringify(cleaned, null, 2));
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.error(`\n❌ Failed after ${elapsed}s:`, err.message);
    process.exit(1);
  }
}

main();
