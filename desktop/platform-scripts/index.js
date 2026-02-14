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

// ---- Profile Management ----

/**
 * Compute the OpenClaw browser profile name for a platform account.
 *
 * - Default accounts (accountId="default" or unset) all share the "openclaw"
 *   profile. Cookies from different platforms don't conflict since they're on
 *   different domains. This maintains backward compatibility.
 * - Non-default accounts (e.g. a second WeChat MP) get their own isolated
 *   profile: "openclaw-{platformKey}-{accountId}". This ensures separate
 *   cookie jars for different accounts on the same platform.
 *
 * @param {string} platformKey - e.g. "bilibili", "weixin-mp"
 * @param {string} accountId  - e.g. "default", "geo-radar"
 * @returns {string} Profile name for --browser-profile flag
 */
function getProfileName(platformKey, accountId) {
  if (!accountId || accountId === "default") {
    return "openclaw";
  }
  return `openclaw-${platformKey}-${accountId}`;
}

// ---- Helpers ----

/**
 * Execute an OpenClaw browser CLI command.
 * @param {string} systemNode - Path to system Node.js executable
 * @param {string} openclawPath - Path to openclaw.mjs
 * @param {string} command - Browser sub-command (e.g. "open https://example.com")
 * @param {object} opts - Options: { timeout, profile, workspaceDir }
 * @returns {string} Command stdout
 */
function execBrowser(systemNode, openclawPath, command, opts = {}) {
  const { timeout = 30000, profile = "openclaw", workspaceDir } = opts;
  // Build command - don't double-quote the command part, let it pass through
  const fullCmd = `"${systemNode}" "${openclawPath}" browser ${command} --browser-profile ${profile}`;

  // Derive workspace dir from openclawPath: .../workspace/node_modules/openclaw/openclaw.mjs
  const wsDir = workspaceDir || require("path").resolve(openclawPath, "..", "..", "..");
  try {
    return execSync(fullCmd, {
      timeout,
      stdio: "pipe",
      windowsHide: true,
      encoding: "utf-8",
      cwd: wsDir,
      env: { ...process.env, OPENCLAW_HOME: wsDir },
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
 * Find the ref attribute of an element containing the given text in a snapshot.
 * OpenClaw's `browser click` expects ref values (e.g. "e58"), not Playwright selectors.
 *
 * Snapshot format:
 *   generic [ref=e58] [cursor=pointer]:
 *     - generic [ref=e59]:
 *     - generic [ref=e60]: 数据中心
 *
 * For text on a line like `generic [ref=e60]: 数据中心`, returns "e60".
 * Also looks for the nearest clickable parent (with [cursor=pointer]).
 *
 * @param {string} snapshot - The accessibility tree text
 * @param {string} text - The text to search for
 * @returns {{ ref: string|null, clickableRef: string|null }}
 */
function findRefByText(snapshot, text) {
  if (!snapshot || !text) return { ref: null, clickableRef: null };
  const lines = snapshot.split("\n");
  let lastClickableRef = null;
  for (const line of lines) {
    // Track the most recent clickable ref (elements with cursor=pointer)
    if (line.includes("[cursor=pointer]")) {
      const rm = line.match(/\[ref=(e?\d+)\]/);
      if (rm) lastClickableRef = rm[1];
    }
    // Check if this line contains the target text
    if (line.includes(text)) {
      const rm = line.match(/\[ref=(e?\d+)\]/);
      const directRef = rm ? rm[1] : null;
      return { ref: directRef, clickableRef: lastClickableRef || directRef };
    }
  }
  return { ref: null, clickableRef: null };
}

/**
 * Create a bound helper object with systemNode/openclawPath pre-filled.
 * @param {object} ctx - { systemNode, openclawPath, workspaceDir, profile? }
 *   profile: OpenClaw browser profile name (default: "openclaw")
 */
function createHelpers(ctx) {
  const defaultProfile = ctx.profile || "openclaw";
  const exec = (command, opts) => execBrowser(ctx.systemNode, ctx.openclawPath, command, {
    workspaceDir: ctx.workspaceDir,
    profile: defaultProfile,
    ...opts,
  });
  return {
    /** Navigate to a URL in the managed browser */
    navigate: (url, opts) => exec(`navigate ${escapeArg(url)}`, { timeout: 30000, ...opts }),
    /** Open a URL (launches browser if not running) */
    open: (url, opts) => exec(`open ${escapeArg(url)}`, { timeout: 30000, ...opts }),
    /** Get the page snapshot (accessibility tree) */
    snapshot: (opts) => exec("snapshot", { timeout: 15000, ...opts }),
    /** Get interactive-only snapshot */
    snapshotInteractive: (opts) => exec("snapshot --interactive", { timeout: 15000, ...opts }),
    /** Click an element by ref (from snapshot, e.g. "e58") */
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
    /**
     * Find element ref by visible text in a snapshot, then click it.
     * @param {string} snapshot - Accessibility tree snapshot text
     * @param {string} text - Text to find and click
     * @returns {boolean} true if click succeeded
     */
    clickByText: (snapshot, text, opts) => {
      const { ref, clickableRef } = findRefByText(snapshot, text);
      const targetRef = clickableRef || ref;
      if (!targetRef) return false;
      try {
        exec(`click ${escapeArg(targetRef)}`, { timeout: 10000, ...opts });
        return true;
      } catch {
        // If clickable parent fails, try the direct ref
        if (ref && ref !== targetRef) {
          try {
            exec(`click ${escapeArg(ref)}`, { timeout: 10000, ...opts });
            return true;
          } catch { /* give up */ }
        }
        return false;
      }
    },
    /** Raw exec for custom commands */
    exec,
    sleep,
    escapeArg,
    findRefByText,
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
try { dataCollectors.douyin = require("./douyin-data").collect; } catch {}
try { dataCollectors.xiaohongshu = require("./xiaohongshu-data").collect; } catch {}
try { dataCollectors.kuaishou = require("./kuaishou-data").collect; } catch {}
try { dataCollectors.zhihu = require("./zhihu-data").collect; } catch {}

/**
 * Cookie markers for detecting login state per platform.
 * If any of the named cookies exist for the domain, the user is logged in.
 */
const PLATFORM_COOKIE_MARKERS = {
  bilibili: { domain: ".bilibili.com", names: ["SESSDATA", "bili_jct"] },
  douyin: { domain: ".douyin.com", names: ["sessionid", "passport_csrf_token"] },
  xiaohongshu: { domain: ".xiaohongshu.com", names: ["web_session", "a1"] },
  youtube: { domain: ".youtube.com", names: ["SID", "SSID"] },
  "weixin-mp": { domain: ".qq.com", names: ["slave_sid", "slave_user"] },
  "weixin-channels": { domain: ".qq.com", names: ["slave_sid", "slave_user"] },
  kuaishou: { domain: ".kuaishou.com", names: ["passToken", "kuaishou.server.web_st"] },
  zhihu: { domain: ".zhihu.com", names: ["z_c0"] },
  weibo: { domain: ".weibo.com", names: ["SUB", "SUBP"] },
  toutiao: { domain: ".toutiao.com", names: ["sso_uid_tt", "sessionid"] },
};

/**
 * Check if the user is logged into a platform by examining cookies.
 * @param {object} helpers - Helpers with cookies() method
 * @param {string} platform - Platform key
 * @returns {boolean} true if logged in
 */
function isPlatformLoggedIn(cookies, platform) {
  const markers = PLATFORM_COOKIE_MARKERS[platform];
  if (!markers) return true; // Unknown platform, assume ok and let collector try
  return cookies.some(
    (c) => c.domain && c.domain.includes(markers.domain) && markers.names.includes(c.name)
  );
}

/**
 * Collect analytics data from a single platform+account.
 *
 * Uses the correct browser profile for the given accountId so that
 * each account's cookies are isolated.
 *
 * @param {string} platform - specific platform key (e.g. "bilibili")
 * @param {object} ctx - { systemNode, openclawPath, workspaceDir }
 * @param {string} [accountId="default"] - account identifier
 * @returns {Promise<{ success: boolean, platforms: Record<string, object> }>}
 */
async function collectPlatformData(platform, ctx, accountId = "default") {
  // Determine the browser profile for this account
  const profile = getProfileName(platform, accountId);
  const helpers = createHelpers({ ...ctx, profile });

  const targets = platform === "all"
    ? Object.keys(dataCollectors)
    : [platform];

  // Fetch cookies for the specific profile to check login state
  let allCookies = [];
  try {
    allCookies = helpers.cookies();
  } catch {
    // If cookies fail, proceed anyway and let collectors try
  }

  const results = {};

  for (const p of targets) {
    const collector = dataCollectors[p];
    if (!collector) {
      results[p] = { success: false, error: `暂不支持采集 ${p} 数据` };
      continue;
    }

    // Skip platforms that are not logged in (saves 20-30s per platform)
    if (allCookies.length > 0 && !isPlatformLoggedIn(allCookies, p)) {
      results[p] = { success: false, error: `未登录 ${p}，请先在平台页面中登录` };
      continue;
    }

    try {
      const data = await collector(helpers);
      // Tag result with accountId so the server knows which account it belongs to
      results[p] = { success: true, accountId, ...data };
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
  findRefByText,
  getProfileName,
  createHelpers,
  publishToPlatform,
  collectPlatformData,
};
