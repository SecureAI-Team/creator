/**
 * Generate PNG icons from SVG for Chrome Web Store.
 * 
 * Run: node generate-icons.js
 * 
 * Requires: sharp (npm install sharp)
 * Or use any SVG-to-PNG converter to create:
 *   icons/icon-16.png  (16x16)
 *   icons/icon-48.png  (48x48)
 *   icons/icon-128.png (128x128)
 * 
 * Alternatively, create these PNGs manually in any image editor.
 */

const fs = require("fs");
const path = require("path");

const SVG_TEMPLATE = `<svg xmlns="http://www.w3.org/2000/svg" width="SIZE" height="SIZE" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#6366F1;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="24" fill="url(#bg)"/>
  <text x="64" y="82" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="white" text-anchor="middle">创</text>
</svg>`;

const sizes = [16, 48, 128];
const iconsDir = path.join(__dirname, "icons");

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

for (const size of sizes) {
  const svg = SVG_TEMPLATE.replace(/SIZE/g, String(size));
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.svg`), svg);
  console.log(`Generated icon-${size}.svg (convert to PNG for production)`);
}

console.log("\nTo convert SVG to PNG, use one of:");
console.log("  npx sharp-cli -i icons/icon-128.svg -o icons/icon-128.png resize 128 128");
console.log("  Or use https://convertio.co/svg-png/");
console.log("  Or use Inkscape: inkscape --export-type=png --export-width=128 icons/icon-128.svg");
