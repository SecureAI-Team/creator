/**
 * Bilibili creator dashboard data collector.
 *
 * Strategy:
 *   1. Navigate directly to /platform/data/overview.
 *   2. Even if navigate CLI times out (gateway 20s internal timeout),
 *      the browser continues loading. Don't fallback to open().
 *   3. Poll with waitForContent (60s) until data appears.
 *   4. Supplement from /platform/home if needed.
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
 * @param {string} snapshot - accessibility tree text
 * @param {string[]} labels - ordered list of labels to try (most specific first)
 * @param {object} [log] - optional logger ({ info, debug }); if omitted, no debug output
 */
function findMetric(snapshot, labels, log) {
  if (!snapshot) return 0;
  const flat = flattenSnapshot(snapshot);
  if (!flat) return 0;

  for (const label of labels) {
    // Pattern: label followed by number (e.g. "粉丝 993", "粉丝：993", "粉丝数 0")
    const forwardRegex = new RegExp(label + "\\s*[：:]?\\s*([\\d,.]+[万亿]?)", "g");
    const match = forwardRegex.exec(flat);
    if (match) {
      const val = parseChineseNumber(match[1]);
      if (log) log.debug(`findMetric "${label}" → ${match[0]} = ${val}`);
      return val;
    }

    // Token pattern: label then whitespace then number
    const tokenRegex = new RegExp(label + "\\s+(\\d[\\d,.]*[万亿]?)", "g");
    const tmatch = tokenRegex.exec(flat);
    if (tmatch) {
      const val = parseChineseNumber(tmatch[1]);
      if (log) log.debug(`findMetric "${label}" (token) → ${tmatch[0]} = ${val}`);
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
        if (log) log.debug(`findMetric "${label}" (reverse) → ${match[0]} = ${val}`);
        return val;
      }
    }
  }

  return 0;
}

/**
 * Poll the page snapshot until one of the keywords appears, or timeout.
 * Logs progress via helpers.log (desktop log file).
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
    } catch {
      // snapshot failed, retry
    }
    await helpers.sleep(intervalMs);
  }
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const flatLen = flattenSnapshot(lastSnapshot).length;
  if (log) log.warn(`waitForContent timeout after ${elapsed}s (${polls} polls, flat=${flatLen} chars, keywords=[${keywords.join(",")}])`);
  return lastSnapshot;
}

/**
 * Collect data from bilibili creator dashboard.
 *
 * Bilibili data overview page has engagement metrics (views, likes, etc.)
 * but NOT total followers or total content count. Those come from the home page.
 * Strategy: start with HOME page (followers + content count), then DATA page.
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

  log.info("bilibili: Step 1 — navigate to home");

  // ---- Step 1: Navigate to HOME first (for followers + content count) ----
  try {
    helpers.navigate("https://member.bilibili.com/platform/home");
  } catch {
    // Timeout OK — browser continues loading in background
  }

  await helpers.sleep(5000);

  // Home page keywords: "粉丝" count, "投稿" count, "播放" count
  const homeText = await waitForContent(
    helpers,
    ["粉丝", "投稿", "播放量", "创作中心"],
    60000,
    3000
  );

  if (homeText) {
    const flat = flattenSnapshot(homeText);
    log.info(`bilibili: home flat (${flat.length} chars): ${flat.substring(0, 500)}`);
    result.followers = findMetric(homeText, ["粉丝", "粉丝数", "关注数"], log);
    result.contentCount = findMetric(homeText, ["投稿", "稿件", "投稿数", "稿件数", "视频数"], log);
    // Also try to get engagement from home if available
    result.totalViews = findMetric(homeText, ["播放量", "总播放", "播放"], log);
    result.totalLikes = findMetric(homeText, ["点赞数", "点赞", "获赞"], log);
  }

  // ---- Step 2: Navigate to data overview for detailed engagement ----
  log.info("bilibili: Step 2 — navigate to data overview");
  try {
    helpers.navigate("https://member.bilibili.com/platform/data/overview");
  } catch {
    // Timeout OK
  }

  await helpers.sleep(3000);

  let dataText = await waitForContent(
    helpers,
    ["播放量", "点赞", "互动", "涨粉", "数据概览", "数据中心"],
    60000,
    3000
  );

  if (dataText) {
    const flat = flattenSnapshot(dataText);
    log.info(`bilibili: data flat (${flat.length} chars): ${flat.substring(0, 500)}`);
    // Override engagement metrics if data page has better values
    const views = findMetric(dataText, ["播放量", "总播放量", "总播放", "播放数", "阅读量"], log);
    if (views > result.totalViews) result.totalViews = views;
    const likes = findMetric(dataText, ["点赞", "点赞数", "获赞"], log);
    if (likes > result.totalLikes) result.totalLikes = likes;
    if (result.totalComments === 0) result.totalComments = findMetric(dataText, ["评论", "评论数", "弹幕"], log);
    if (result.totalShares === 0) result.totalShares = findMetric(dataText, ["分享", "分享数", "转发数"], log);
    // Try followers from data page if home didn't get it
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
};
