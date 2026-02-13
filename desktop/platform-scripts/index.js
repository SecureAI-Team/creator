/**
 * Platform automation scripts framework.
 *
 * Provides helpers to execute OpenClaw browser CLI commands
 * and dispatch to platform-specific publish/data-collection scripts.
 *
 * OpenClaw browser CLI commands (verified):
 *   browser open <url>        — open URL (launches browser if needed)
 *   browser navigate <url>    — navigate current page to URL
 *   browser snapshot           — get page accessibility snapshot
 *   browser click <selector>  — click an element
 *   browser type <selector> <text> — type text into element
 *   browser fill <selector> <text> — fill/replace text
 *   browser upload <selector> <file> — upload a file
 *   browser cookies           — get all cookies (add --json for JSON)
 *   browser screenshot        — take a screenshot
 *   --browser-profile <name>  — use named browser profile
 */

const { execSync } = require("child_process");

// ---- Helpers ----

/**
 * Execute an OpenClaw browser CLI command.
 * @param {string} systemNode - Path to system Node.js executable
 * @param {string} openclawPath - Path to openclaw.mjs
 * @param {string} command - Browser sub-command (e.g. "open https://example.com")
 * @param {object} opts - Options: { timeout, profile }
 * @returns {string} Command stdout
 */
function execBrowser(systemNode, openclawPath, command, opts = {}) {
  const { timeout = 30000, profile = "openclaw" } = opts;
  // Build command - don't double-quote the command part, let it pass through
  const fullCmd = `"${systemNode}" "${openclawPath}" browser ${command} --browser-profile ${profile}`;
  try {
    return execSync(fullCmd, {
      timeout,
      stdio: "pipe",
      windowsHide: true,
      encoding: "utf-8",
    }).trim();
  } catch (err) {
    // Extract meaningful error from stderr/stdout
    const stderr = err.stderr ? err.stderr.toString().trim() : "";
    const stdout = err.stdout ? err.stdout.toString().trim() : "";
    throw new Error(`CLI error: ${stderr || stdout || err.message}`);
  }
}

/**
 * Sleep for the given number of milliseconds.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Escape a string for safe inclusion in CLI arguments.
 * Wraps in double quotes and escapes internal quotes/backslashes.
 */
function escapeArg(str) {
  if (!str) return '""';
  return '"' + str.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

/**
 * Create a bound helper object with systemNode/openclawPath pre-filled.
 */
function createHelpers(ctx) {
  const exec = (command, opts) => execBrowser(ctx.systemNode, ctx.openclawPath, command, opts);
  return {
    /** Navigate to a URL in the managed browser */
    navigate: (url, opts) => exec(`navigate ${escapeArg(url)}`, { timeout: 30000, ...opts }),
    /** Open a URL (launches browser if not running) */
    open: (url, opts) => exec(`open ${escapeArg(url)}`, { timeout: 30000, ...opts }),
    /** Get the page snapshot (accessibility tree) */
    snapshot: (opts) => exec("snapshot", { timeout: 15000, ...opts }),
    /** Get interactive-only snapshot */
    snapshotInteractive: (opts) => exec("snapshot --interactive", { timeout: 15000, ...opts }),
    /** Click an element by selector */
    click: (selector, opts) => exec(`click ${escapeArg(selector)}`, { timeout: 15000, ...opts }),
    /** Type text into an element */
    type: (selector, text, opts) => exec(`type ${escapeArg(selector)} ${escapeArg(text)}`, { timeout: 15000, ...opts }),
    /** Fill/replace text in an element */
    fill: (selector, text, opts) => exec(`fill ${escapeArg(selector)} ${escapeArg(text)}`, { timeout: 15000, ...opts }),
    /** Upload a file */
    upload: (selector, filePath, opts) => exec(`upload ${escapeArg(selector)} ${escapeArg(filePath)}`, { timeout: 60000, ...opts }),
    /** Get all cookies as JSON */
    cookies: (opts) => {
      const raw = exec("cookies --json", { timeout: 15000, ...opts });
      try { return JSON.parse(raw); } catch { return []; }
    },
    /** Take a screenshot */
    screenshot: (opts) => exec("screenshot", { timeout: 15000, ...opts }),
    /** Raw exec for custom commands */
    exec,
    sleep,
    escapeArg,
  };
}

// ---- Platform publish scripts ----

const publishScripts = {};
try { publishScripts.bilibili = require("./bilibili").publish; } catch {}
try { publishScripts.douyin = require("./douyin").publish; } catch {}
try { publishScripts.xiaohongshu = require("./xiaohongshu").publish; } catch {}

/**
 * Publish content to a specific platform.
 */
async function publishToPlatform(platform, content, ctx) {
  const script = publishScripts[platform];
  if (!script) {
    return { success: false, error: `暂不支持自动发布到 ${platform}，请手动发布` };
  }
  const helpers = createHelpers(ctx);
  try {
    return await script(content, helpers);
  } catch (err) {
    return { success: false, error: `发布到 ${platform} 失败: ${err.message}` };
  }
}

// ---- Platform data collection scripts ----

const dataCollectors = {};
try { dataCollectors.bilibili = require("./bilibili-data").collect; } catch {}
try { dataCollectors["weixin-mp"] = require("./weixin-mp-data").collect; } catch {}

/**
 * Collect analytics data from one or more platforms.
 *
 * @param {string} platform - "all" or specific platform key
 * @param {object} ctx - { systemNode, openclawPath }
 * @returns {Promise<{ success: boolean, platforms: Record<string, object> }>}
 */
async function collectPlatformData(platform, ctx) {
  const helpers = createHelpers(ctx);

  const targets = platform === "all"
    ? Object.keys(dataCollectors)
    : [platform];

  const results = {};

  for (const p of targets) {
    const collector = dataCollectors[p];
    if (!collector) {
      results[p] = { success: false, error: `暂不支持采集 ${p} 数据` };
      continue;
    }
    try {
      const data = await collector(helpers);
      results[p] = { success: true, ...data };
    } catch (err) {
      results[p] = { success: false, error: err.message };
    }
  }

  return { success: true, platforms: results };
}

module.exports = {
  execBrowser,
  sleep,
  escapeArg,
  createHelpers,
  publishToPlatform,
  collectPlatformData,
};
