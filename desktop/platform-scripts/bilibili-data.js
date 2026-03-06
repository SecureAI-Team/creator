/**
 * Bilibili creator dashboard data collector.
 *
 * Strategy:
 *   1. Navigate to /platform/home for followers + content count.
 *   2. Navigate to /platform/data/overview for engagement metrics.
 *   3. Poll with waitForContent until data appears.
 *
 * Also exports shared utilities: parseChineseNumber, flattenSnapshot,
 * findMetric, waitForContent — used by all other platform collectors.
 */

/**
 * Extract a numeric value. Handles "12.5万" (= 125000), "1,234", "1234".
 */
function parseChineseNumber(text) {
  if (!text) return 0;
  text = String(text).replace(/,/g, "").trim();
  const wanMatch = text.match(/([\d.]+)\s*万/);
  if (wanMatch) return Math.round(parseFloat(wanMatch[1]) * 10000);
  const yiMatch = text.match(/([\d.]+)\s*亿/);
  if (yiMatch) return Math.round(parseFloat(yiMatch[1]) * 100000000);
  const num = parseFloat(text);
  return isNaN(num) ? 0 : Math.round(num);
}

/**
 * Flatten an accessibility tree snapshot into plain text tokens.
 */
function flattenSnapshot(snapshot) {
  if (!snapshot) return "";
  const tokens = [];
  const lines = snapshot.split("\n");
  for (const line of lines) {
    const trimmed = line.replace(/^\s*-\s*/, "").trim();
    if (!trimmed) continue;

    const quotedNums = trimmed.match(/"(\d[\d,.]*[万亿]?)"/g);
    if (quotedNums) {
      for (const q of quotedNums) {
        tokens.push(q.replace(/"/g, ""));
      }
    }

    const colonMatch = trimmed.match(/(?:text|generic|heading|paragraph|emphasis|button|listitem)(?:\s+\[.*?\])*(?:\s+"[^"]*")?(?:\s+\[.*?\])*:\s*(.+)/);
    if (colonMatch) {
      let content = colonMatch[1].trim();
      content = content.replace(/\[.*?\]/g, "").trim();
      if (content && !content.startsWith("-") && !content.startsWith("/url:") && !content.startsWith("img")) {
        content = content.replace(/^"(.*)"$/, "$1");
        if (content) tokens.push(content);
      }
    }

    const linkMatch = trimmed.match(/^link\s+"([^"]+)"/);
    if (linkMatch) {
      tokens.push(linkMatch[1]);
    }
  }
  return tokens.join(" ");
}

/**
 * Try to find a numeric value near a given label in the snapshot text.
 * Returns the FIRST match (not max), which is usually the primary display value.
 *
 * @param {string} snapshot - accessibility tree text
 * @param {string[]} labels - ordered list of labels to try (most specific first)
 * @param {object} [logOrOpts] - logger or options object
 *   If options: { log?, excludePrefixes?: string[], contextStart?: string, contextEnd?: string }
 *   - excludePrefixes: skip matches where the label is preceded by one of these (e.g. ["昨日", "新增", "今日"])
 *   - contextStart/contextEnd: restrict search to text between these markers
 */
function findMetric(snapshot, labels, logOrOpts) {
  if (!snapshot) return 0;

  let log = null;
  let excludePrefixes = [];
  let contextStart = null;
  let contextEnd = null;

  if (logOrOpts && typeof logOrOpts === "object") {
    if (typeof logOrOpts.debug === "function") {
      log = logOrOpts;
    } else {
      log = logOrOpts.log || null;
      excludePrefixes = logOrOpts.excludePrefixes || [];
      contextStart = logOrOpts.contextStart || null;
      contextEnd = logOrOpts.contextEnd || null;
    }
  }

  let flat = flattenSnapshot(snapshot);
  if (!flat) return 0;

  // Restrict to context region if specified
  if (contextStart) {
    const startIdx = flat.indexOf(contextStart);
    if (startIdx >= 0) {
      flat = flat.substring(startIdx);
      if (contextEnd) {
        const endIdx = flat.indexOf(contextEnd, contextStart.length);
        if (endIdx > 0) flat = flat.substring(0, endIdx);
      }
    }
  }

  for (const label of labels) {
    // Forward pattern: label followed by number
    const forwardRegex = new RegExp("([\\u4e00-\\u9fff]{0,4})" + label + "\\s*[：:]?\\s*([\\d,.]+[万亿]?)", "g");
    let match;
    while ((match = forwardRegex.exec(flat)) !== null) {
      const prefix = match[1] || "";
      if (excludePrefixes.length > 0 && excludePrefixes.some(ep => prefix.endsWith(ep))) {
        if (log) log.debug(`findMetric "${label}" skipped (prefix "${prefix}" excluded)`);
        continue;
      }
      const val = parseChineseNumber(match[2]);
      if (log) log.debug(`findMetric "${label}" → "${match[0]}" = ${val}`);
      return val;
    }

    // Token pattern: label then whitespace then number
    const tokenRegex = new RegExp("([\\u4e00-\\u9fff]{0,4})" + label + "\\s+(\\d[\\d,.]*[万亿]?)", "g");
    let tmatch;
    while ((tmatch = tokenRegex.exec(flat)) !== null) {
      const prefix = tmatch[1] || "";
      if (excludePrefixes.length > 0 && excludePrefixes.some(ep => prefix.endsWith(ep))) {
        if (log) log.debug(`findMetric "${label}" (token) skipped (prefix "${prefix}" excluded)`);
        continue;
      }
      const val = parseChineseNumber(tmatch[2]);
      if (log) log.debug(`findMetric "${label}" (token) → "${tmatch[0]}" = ${val}`);
      return val;
    }
  }

  // Reverse pattern: number BEFORE label (last resort)
  for (const label of labels) {
    const reverseRegex = new RegExp("(\\d[\\d,.]*[万亿]?)\\s+" + label, "g");
    const match = reverseRegex.exec(flat);
    if (match) {
      const val = parseChineseNumber(match[1]);
      if (val > 0) {
        if (log) log.debug(`findMetric "${label}" (reverse) → "${match[0]}" = ${val}`);
        return val;
      }
    }
  }

  return 0;
}

/**
 * Poll the page snapshot until one of the keywords appears, or timeout.
 */
async function waitForContent(helpers, keywords, maxWaitMs = 15000, intervalMs = 2000) {
  const log = helpers.log;
  const start = Date.now();
  let lastSnapshot = "";
  let polls = 0;
  while (Date.now() - start < maxWaitMs) {
    polls++;
    try {
      lastSnapshot = helpers.snapshot();
      const flat = flattenSnapshot(lastSnapshot);
      const matched = keywords.find((kw) => flat.includes(kw));
      if (matched) {
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        if (log) log.info(`waitForContent matched "${matched}" after ${elapsed}s (${polls} polls, flat=${flat.length} chars)`);
        return lastSnapshot;
      }
    } catch (e) {
      if (log) log.debug(`waitForContent poll ${polls} snapshot error: ${e.message}`);
    }
    await helpers.sleep(intervalMs);
  }
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const flatLen = flattenSnapshot(lastSnapshot).length;
  if (log) log.warn(`waitForContent timeout after ${elapsed}s (${polls} polls, flat=${flatLen} chars, keywords=[${keywords.join(",")}])`);
  return lastSnapshot;
}

/**
 * Check if snapshot text indicates a login page.
 */
function isLoginSnapshot(snapshot) {
  if (!snapshot) return false;
  const flat = flattenSnapshot(snapshot).toLowerCase();
  return flat.includes("扫码登录") || flat.includes("请使用微信扫描") ||
         flat.includes("密码登录") || flat.includes("短信登录") ||
         flat.includes("sign in") || flat.includes("log in") ||
         flat.includes("请先登录") || flat.includes("登录/注册");
}

/**
 * Collect data from bilibili creator dashboard.
 */
async function collect(helpers) {
  const log = helpers.log;
  const result = {
    followers: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    contentCount: 0,
  };

  // ---- Step 1: Home page (followers + content count) ----
  log.info("bilibili: Step 1 — navigate to home");
  try {
    helpers.navigate("https://member.bilibili.com/platform/home");
  } catch (e) { log.warn("bilibili: nav timeout (ok):", e.message); }

  await helpers.sleep(5000);

  const homeText = await waitForContent(
    helpers,
    ["粉丝", "投稿", "播放量", "创作中心"],
    60000,
    3000
  );

  if (homeText) {
    if (isLoginSnapshot(homeText)) {
      log.warn("bilibili: login page detected");
      return result;
    }
    const flat = flattenSnapshot(homeText);
    log.info(`bilibili: home flat (${flat.length} chars): ${flat.substring(0, 1000)}`);
    result.followers = findMetric(homeText, ["粉丝数", "粉丝", "关注数"], log);
    result.contentCount = findMetric(homeText, ["投稿数", "稿件数", "投稿", "视频数"], log);
    result.totalViews = findMetric(homeText, ["总播放量", "播放量", "总播放"], log);
    result.totalLikes = findMetric(homeText, ["获赞数", "点赞数", "获赞", "点赞"], log);
  }

  // ---- Step 2: Data overview for engagement ----
  log.info("bilibili: Step 2 — navigate to data overview");
  try {
    helpers.navigate("https://member.bilibili.com/platform/data/overview");
  } catch (e) { log.warn("bilibili: nav timeout (ok):", e.message); }

  await helpers.sleep(3000);

  let dataText = await waitForContent(
    helpers,
    ["播放量", "点赞", "互动", "涨粉", "数据概览", "数据中心"],
    60000,
    3000
  );

  if (dataText) {
    const flat = flattenSnapshot(dataText);
    log.info(`bilibili: data flat (${flat.length} chars): ${flat.substring(0, 1000)}`);
    const views = findMetric(dataText, ["总播放量", "播放量", "总播放", "播放数"], log);
    if (views > result.totalViews) result.totalViews = views;
    const likes = findMetric(dataText, ["获赞数", "点赞数", "获赞", "点赞"], log);
    if (likes > result.totalLikes) result.totalLikes = likes;
    if (result.totalComments === 0) result.totalComments = findMetric(dataText, ["评论数", "评论", "弹幕数"], log);
    if (result.totalShares === 0) result.totalShares = findMetric(dataText, ["分享数", "分享", "转发数"], log);
    if (result.followers === 0) result.followers = findMetric(dataText, ["粉丝总数", "粉丝数", "粉丝"], log);
    if (result.contentCount === 0) result.contentCount = findMetric(dataText, ["投稿数", "稿件数", "视频数"], log);
  }

  log.info(`bilibili: result = ${JSON.stringify(result)}`);
  return result;
}

module.exports = {
  collect,
  findMetric,
  flattenSnapshot,
  parseChineseNumber,
  waitForContent,
  isLoginSnapshot,
};
