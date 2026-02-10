// =============================================================================
// Cross-platform extension packaging script
// Usage: node scripts/pack-extension.mjs
// =============================================================================

import { createWriteStream, readdirSync, statSync, readFileSync } from "fs";
import { join, relative } from "path";
import { execSync } from "child_process";
import { mkdirSync, existsSync } from "fs";

const EXTENSION_DIR = join(process.cwd(), "extension");
const OUTPUT_DIR = join(process.cwd(), "dist");
const OUTPUT_FILE = join(OUTPUT_DIR, "creator-extension.zip");

// Ensure output directory exists
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Validate extension directory
if (!existsSync(EXTENSION_DIR)) {
  console.error("✗ extension/ directory not found");
  process.exit(1);
}

// Validate manifest.json exists
const manifestPath = join(EXTENSION_DIR, "manifest.json");
if (!existsSync(manifestPath)) {
  console.error("✗ extension/manifest.json not found");
  process.exit(1);
}

// Read and validate manifest
const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
console.log(`Packing extension: ${manifest.name} v${manifest.version}`);

// Collect all files (excluding hidden files and unnecessary items)
function collectFiles(dir, baseDir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".") || entry === "node_modules") continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...collectFiles(fullPath, baseDir));
    } else {
      files.push(relative(baseDir, fullPath));
    }
  }
  return files;
}

const files = collectFiles(EXTENSION_DIR, EXTENSION_DIR);
console.log(`Found ${files.length} files to package`);

// Try using system zip command (available on macOS/Linux and Git Bash on Windows)
try {
  // Change to extension dir and create zip
  const fileList = files.join("\n");
  const isWindows = process.platform === "win32";

  if (isWindows) {
    // Use PowerShell Compress-Archive on Windows
    const filesArg = files
      .map((f) => `"${join(EXTENSION_DIR, f)}"`)
      .join(",");
    execSync(
      `powershell -Command "Compress-Archive -Path ${filesArg} -DestinationPath '${OUTPUT_FILE}' -Force"`,
      { stdio: "inherit" }
    );
  } else {
    execSync(`cd "${EXTENSION_DIR}" && zip -r "${OUTPUT_FILE}" . -x '.*' -x '*.DS_Store'`, {
      stdio: "inherit",
    });
  }

  console.log(`✓ Extension packed: ${OUTPUT_FILE}`);
  console.log(`  Files: ${files.length}`);
} catch (err) {
  console.error("✗ Failed to create zip:", err.message);
  process.exit(1);
}
