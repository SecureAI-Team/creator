/**
 * Platform automation scripts framework.
 *
 * Provides helpers to execute OpenClaw browser CLI commands
 * and dispatch to platform-specific publish/data-collection scripts.
 *
 * OpenClaw browser CLI commands (ref-based, from official docs):
 *   browser open <url>              — open URL (launches browser if needed)
 *   browser navigate <url>          — navigate current page to URL
 *   browser snapshot                — accessibility tree (with [ref=e12] IDs)
 *   browser snapshot --interactive  — flat list of interactive elements with refs
 *   browser click <ref>             — click element by ref (e.g. "e12", "23")
 *   browser type <ref> "text"       — type text into element by ref
 *   browser fill --fields '<json>'  — fill fields: [{"ref":"1","type":"text","value":"v"}]
 *   browser press <key>             — press keyboard key (Enter, Tab, etc.)
 *   browser upload <path>           — arm file upload (run before clicking upload trigger)
 *   browser cookies [--json]        — get all cookies
 *   browser screenshot              — take screenshot
 *   browser wait --text "Done"      — wait for text to appear
 *   --browser-profile <name>        — use named browser profile
 *
 * IMPORTANT: click/type/fill/press require a `ref` from snapshot output.
 *            CSS selectors are NOT supported for actions.
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
// Navigation/open in exe can be slower; OpenClaw CLI default is 20s and often too short.
const OPENCLAW_NAVIGATION_TIMEOUT_MS = 90000;

function execBrowser(systemNode, openclawPath, command, opts = {}) {
  const { timeout = 30000, profile = "openclaw", workspaceDir, openclawTimeout } = opts;
  // Build command - don't double-quote the command part, let it pass through
  let fullCmd = `"${systemNode}" "${openclawPath}" browser ${command} --browser-profile ${profile}`;
  if (openclawTimeout != null) {
    fullCmd += ` --timeout ${openclawTimeout}`;
  }

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
 * Search snapshot lines for multiple text alternatives and return
 * all matching refs (most specific matches first).
 * @param {string} snapshot
 * @param {string[]} textAlternatives - ordered list of texts to try
 * @returns {{ ref: string|null, clickableRef: string|null }}
 */
function findRefByTexts(snapshot, textAlternatives) {
  for (const text of textAlternatives) {
    const result = findRefByText(snapshot, text);
    if (result.ref || result.clickableRef) return result;
  }
  return { ref: null, clickableRef: null };
}

/**
 * Create a bound helper object with systemNode/openclawPath pre-filled.
 *
 * All action helpers (click, type, fill, press) use OpenClaw's ref-based
 * API. Refs come from `snapshot --interactive` output (e.g. "e12", "23").
 *
 * @param {object} ctx - { systemNode, openclawPath, workspaceDir, profile?, log? }
 */
function createHelpers(ctx) {
  const defaultProfile = ctx.profile || "openclaw";
  const exec = (command, opts) => execBrowser(ctx.systemNode, ctx.openclawPath, command, {
    workspaceDir: ctx.workspaceDir,
    profile: defaultProfile,
    ...opts,
  });
  const log = ctx.log || {
    info: (...a) => console.error("[collector]", ...a),
    debug: (...a) => console.error("[collector]", ...a),
    warn: (...a) => console.error("[collector]", ...a),
    error: (...a) => console.error("[collector]", ...a),
  };
  return {
    log,

    // ---- Navigation (unchanged — these don't use refs) ----
    navigate: (url, opts) => exec(`navigate ${escapeArg(url)}`, { timeout: 100000, openclawTimeout: OPENCLAW_NAVIGATION_TIMEOUT_MS, ...opts }),
    open: (url, opts) => exec(`open ${escapeArg(url)}`, { timeout: 100000, openclawTimeout: OPENCLAW_NAVIGATION_TIMEOUT_MS, ...opts }),

    // ---- Snapshot ----
    /** Full accessibility tree snapshot */
    snapshot: (opts) => exec("snapshot", { timeout: 15000, ...opts }),
    /** Interactive elements only — flat list with refs, best for driving actions */
    snapshotInteractive: (opts) => exec("snapshot --interactive", { timeout: 15000, ...opts }),

    // ---- Ref-based actions ----
    /** Click element by ref from snapshot (e.g. "e12", "23") */
    click: (ref, opts) => exec(`click ${escapeArg(ref)}`, { timeout: 15000, ...opts }),
    /** Type text into element by ref */
    type: (ref, text, opts) => exec(`type ${escapeArg(ref)} ${escapeArg(text)}`, { timeout: 15000, ...opts }),
    /** Type text then submit (presses Enter after typing) */
    typeSubmit: (ref, text, opts) => exec(`type ${escapeArg(ref)} ${escapeArg(text)} --submit`, { timeout: 15000, ...opts }),
    /**
     * Fill one or more fields by ref. Uses OpenClaw's --fields JSON API.
     * @param {Array<{ref: string, value: string, type?: string}>} fields
     */
    fill: (fields, opts) => {
      const payload = fields.map(f => ({ ref: f.ref, type: f.type || "text", value: f.value }));
      return exec(`fill --fields ${escapeArg(JSON.stringify(payload))}`, { timeout: 15000, ...opts });
    },
    /** Press a keyboard key (e.g. "Enter", "Tab", "Escape") */
    press: (key, opts) => exec(`press ${key}`, { timeout: 10000, ...opts }),

    // ---- File upload ----
    /**
     * Arm a file upload. Call this BEFORE clicking the upload trigger button.
     * OpenClaw will intercept the next file chooser dialog.
     * @param {string} filePath - local file path to upload
     */
    upload: (filePath, opts) => exec(`upload ${escapeArg(filePath)}`, { timeout: 60000, ...opts }),

    // ---- State ----
    cookies: (opts) => {
      const raw = exec("cookies --json", { timeout: 15000, ...opts });
      try { return JSON.parse(raw); } catch { return []; }
    },
    screenshot: (opts) => exec("screenshot", { timeout: 15000, ...opts }),

    // ---- Wait ----
    /** Wait for text to appear on page (max timeout via OpenClaw wait command) */
    waitForText: (text, opts) => {
      try {
        return exec(`wait --text ${escapeArg(text)}`, { timeout: 30000, ...opts });
      } catch { return null; }
    },

    // ---- Smart helpers (snapshot + find ref + act) ----

    /**
     * Take an interactive snapshot, find element by text, and click it.
     * Tries each text alternative in order.
     * @param {string[]} textAlternatives - e.g. ["发布", "提交", "submit"]
     * @returns {boolean} true if clicked successfully
     */
    findAndClick: (textAlternatives, opts) => {
      const snap = exec("snapshot --interactive", { timeout: 15000 });
      const { ref, clickableRef } = findRefByTexts(snap, textAlternatives);
      const target = clickableRef || ref;
      if (!target) {
        log.warn(`findAndClick: no ref found for [${textAlternatives.join(", ")}]`);
        return false;
      }
      try {
        exec(`click ${escapeArg(target)}`, { timeout: 10000, ...opts });
        return true;
      } catch (e) {
        if (ref && ref !== target) {
          try {
            exec(`click ${escapeArg(ref)}`, { timeout: 10000, ...opts });
            return true;
          } catch { /* give up */ }
        }
        log.warn(`findAndClick: click failed for ref=${target}: ${e.message}`);
        return false;
      }
    },

    /**
     * Take an interactive snapshot, find an input/textarea near the given label
     * text, and type into it.
     * @param {string[]} labelTexts - e.g. ["标题", "Title"]
     * @param {string} text - text to type
     * @returns {boolean} true if typed successfully
     */
    findAndType: (labelTexts, text, opts) => {
      const snap = exec("snapshot --interactive", { timeout: 15000 });
      const { ref } = findRefByTexts(snap, labelTexts);
      if (!ref) {
        log.warn(`findAndType: no ref for [${labelTexts.join(", ")}]`);
        return false;
      }
      try {
        exec(`type ${escapeArg(ref)} ${escapeArg(text)}`, { timeout: 15000, ...opts });
        return true;
      } catch (e) {
        log.warn(`findAndType: type failed for ref=${ref}: ${e.message}`);
        return false;
      }
    },

    /**
     * Take an interactive snapshot, find an input/textarea near the given label,
     * and fill it using the --fields JSON API.
     * @param {string[]} labelTexts
     * @param {string} value
     * @returns {boolean}
     */
    findAndFill: (labelTexts, value, opts) => {
      const snap = exec("snapshot --interactive", { timeout: 15000 });
      const { ref } = findRefByTexts(snap, labelTexts);
      if (!ref) {
        log.warn(`findAndFill: no ref for [${labelTexts.join(", ")}]`);
        return false;
      }
      try {
        const payload = JSON.stringify([{ ref, type: "text", value }]);
        exec(`fill --fields ${escapeArg(payload)}`, { timeout: 15000, ...opts });
        return true;
      } catch (e) {
        log.warn(`findAndFill: fill failed for ref=${ref}: ${e.message}`);
        return false;
      }
    },

    /**
     * Find element ref by visible text in a pre-existing snapshot, then click it.
     * @param {string} snapshot - already-captured snapshot text
     * @param {string} text - text to find and click
     * @returns {boolean}
     */
    clickByText: (snapshot, text, opts) => {
      const { ref, clickableRef } = findRefByText(snapshot, text);
      const targetRef = clickableRef || ref;
      if (!targetRef) return false;
      try {
        exec(`click ${escapeArg(targetRef)}`, { timeout: 10000, ...opts });
        return true;
      } catch {
        if (ref && ref !== targetRef) {
          try {
            exec(`click ${escapeArg(ref)}`, { timeout: 10000, ...opts });
            return true;
          } catch { /* give up */ }
        }
        return false;
      }
    },

    /**
     * Check if current page looks like a login page.
     * @returns {boolean}
     */
    isLoginPage: () => {
      try {
        const snap = exec("snapshot", { timeout: 10000 });
        const flat = snap.toLowerCase();
        return flat.includes("扫码登录") || flat.includes("请使用微信扫描") ||
               flat.includes("密码登录") || flat.includes("短信登录") ||
               flat.includes("sign in") || flat.includes("log in");
      } catch { return false; }
    },

    /** Raw exec for custom commands */
    exec,
    sleep,
    escapeArg,
    findRefByText,
    findRefByTexts,
  };
}

// ---- Platform publish scripts ----

const publishScripts = {};
try { publishScripts.bilibili = require("./bilibili").publish; } catch {}
try { publishScripts.douyin = require("./douyin").publish; } catch {}
try { publishScripts.xiaohongshu = require("./xiaohongshu").publish; } catch {}
try { publishScripts["weixin-mp"] = require("./weixin-mp").publish; } catch {}
try { publishScripts["weixin-channels"] = require("./weixin-channels").publish; } catch {}
try { publishScripts.kuaishou = require("./kuaishou").publish; } catch {}
try { publishScripts.zhihu = require("./zhihu").publish; } catch {}
try { publishScripts.weibo = require("./weibo").publish; } catch {}
try { publishScripts.toutiao = require("./toutiao").publish; } catch {}
try { publishScripts.youtube = require("./youtube").publish; } catch {}

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
try { dataCollectors["weixin-channels"] = require("./weixin-channels-data").collect; } catch {}
try { dataCollectors.weibo = require("./weibo-data").collect; } catch {}
try { dataCollectors.toutiao = require("./toutiao-data").collect; } catch {}
try { dataCollectors.youtube = require("./youtube-data").collect; } catch {}

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
 * Validate collected metrics. Returns an array of warnings.
 * If any metric has a clearly invalid value, it's flagged.
 */
function validateCollectorResult(platform, data) {
  const warnings = [];
  const METRIC_UPPER_BOUNDS = {
    followers: 500_000_000,
    totalViews: 50_000_000_000,
    totalLikes: 10_000_000_000,
    totalComments: 1_000_000_000,
    totalShares: 1_000_000_000,
    contentCount: 1_000_000,
  };

  for (const [key, maxVal] of Object.entries(METRIC_UPPER_BOUNDS)) {
    const val = data[key];
    if (typeof val === "number" && val < 0) {
      warnings.push(`${key} is negative (${val})`);
      data[key] = 0;
    }
    if (typeof val === "number" && val > maxVal) {
      warnings.push(`${key} exceeds sanity bound (${val} > ${maxVal})`);
    }
  }

  const allZero = ["followers", "totalViews", "totalLikes", "totalComments", "totalShares"]
    .every((k) => (data[k] ?? 0) === 0);
  if (allZero) {
    warnings.push("all metrics are zero — possible page load failure or login required");
  }

  return warnings;
}

const MAX_COLLECTOR_RETRIES = 2;

/**
 * Collect analytics data from a single platform+account.
 *
 * Uses the correct browser profile for the given accountId so that
 * each account's cookies are isolated. Includes retry logic and
 * metric validation.
 *
 * @param {string} platform - specific platform key (e.g. "bilibili")
 * @param {object} ctx - { systemNode, openclawPath, workspaceDir }
 * @param {string} [accountId="default"] - account identifier
 * @returns {Promise<{ success: boolean, platforms: Record<string, object> }>}
 */
async function collectPlatformData(platform, ctx, accountId = "default") {
  const profile = getProfileName(platform, accountId);
  const helpers = createHelpers({ ...ctx, profile });
  const log = helpers.log;

  const targets = platform === "all"
    ? Object.keys(dataCollectors)
    : [platform];

  let allCookies = [];
  try {
    allCookies = helpers.cookies();
  } catch {
    // If cookies fail, proceed anyway
  }

  const results = {};

  for (const p of targets) {
    const collector = dataCollectors[p];
    if (!collector) {
      results[p] = { success: false, error: `暂不支持采集 ${p} 数据` };
      continue;
    }

    if (allCookies.length > 0 && !isPlatformLoggedIn(allCookies, p)) {
      results[p] = { success: false, error: `未登录 ${p}，请先在平台页面中登录` };
      continue;
    }

    let lastError = null;
    let bestData = null;

    for (let attempt = 0; attempt <= MAX_COLLECTOR_RETRIES; attempt++) {
      if (attempt > 0) {
        log.info(`${p}: retry ${attempt}/${MAX_COLLECTOR_RETRIES}...`);
        await sleep(3000 * attempt);
      }

      try {
        const data = await collector(helpers);
        const warnings = validateCollectorResult(p, data);

        if (warnings.length > 0) {
          log.warn(`${p} validation warnings (attempt ${attempt}): ${warnings.join("; ")}`);
        }

        const hasData = ["followers", "totalViews", "totalLikes"]
          .some((k) => (data[k] ?? 0) > 0);

        if (hasData) {
          bestData = data;
          break;
        }

        if (!bestData) bestData = data;
        lastError = warnings.join("; ") || "all metrics zero";
      } catch (err) {
        lastError = err.message;
        log.warn(`${p}: attempt ${attempt} error: ${err.message}`);
      }
    }

    if (bestData) {
      results[p] = { success: true, accountId, ...bestData };
    } else {
      results[p] = { success: false, error: lastError || "采集失败" };
    }
  }

  return { success: true, platforms: results };
}

// ---- Comment and Trending modules ----

let commentModule = null;
try { commentModule = require("./comments"); } catch {}

let trendingModule = null;
try { trendingModule = require("./trending"); } catch {}

/**
 * Collect comments from a platform.
 * @param {string} platform
 * @param {object} ctx - { systemNode, openclawPath, workspaceDir, log }
 * @param {string} [accountId="default"]
 * @returns {Promise<{ success: boolean, comments: Array, error?: string }>}
 */
async function collectComments(platform, ctx, accountId = "default") {
  if (!commentModule) {
    return { success: false, comments: [], error: "评论模块未加载" };
  }
  const profile = getProfileName(platform, accountId);
  const helpers = createHelpers({ ...ctx, profile });
  return commentModule.collectComments(platform, helpers);
}

/**
 * Reply to a comment on a platform.
 * @param {string} platform
 * @param {string} externalId
 * @param {string} replyBody
 * @param {object} ctx
 * @param {string} [accountId="default"]
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function replyToComment(platform, externalId, replyBody, ctx, accountId = "default") {
  if (!commentModule) {
    return { success: false, error: "评论模块未加载" };
  }
  const profile = getProfileName(platform, accountId);
  const helpers = createHelpers({ ...ctx, profile });
  return commentModule.replyToComment(platform, externalId, replyBody, helpers);
}

/**
 * Collect trending topics.
 * @param {object} ctx
 * @param {string[]} [platforms] - optional subset
 * @returns {Promise<{ success: boolean, results: Record<string, object> }>}
 */
async function collectTrending(ctx, platforms) {
  if (!trendingModule) {
    return { success: false, results: {}, error: "热点模块未加载" };
  }
  const helpers = createHelpers(ctx);
  return trendingModule.collectAllTrending(helpers, platforms);
}

module.exports = {
  execBrowser,
  sleep,
  escapeArg,
  findRefByText,
  findRefByTexts,
  getProfileName,
  createHelpers,
  publishToPlatform,
  collectPlatformData,
  collectComments,
  replyToComment,
  collectTrending,
};
