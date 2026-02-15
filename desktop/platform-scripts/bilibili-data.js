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
 */
function findMetric(snapshot, labels) {
  if (!snapshot) return 0;
  const flat = flattenSnapshot(snapshot);
  if (!flat) return 0;

  for (const label of labels) {
    const forwardRegex = new RegExp(label + "\\s*[：:]?\\s*([\\d,.]+[万亿]?)", "g");
    let match;
    let maxVal = -1;
    let foundAny = false;
    while ((match = forwardRegex.exec(flat)) !== null) {
      foundAny = true;
      const val = parseChineseNumber(match[1]);
      if (val > maxVal) maxVal = val;
    }
    if (foundAny) return Math.max(0, maxVal);

    const tokenRegex = new RegExp(label + "\\s+(\\d[\\d,.]*[万亿]?)", "g");
    while ((match = tokenRegex.exec(flat)) !== null) {
      foundAny = true;
      const val = parseChineseNumber(match[1]);
      if (val > maxVal) maxVal = val;
    }
    if (foundAny) return Math.max(0, maxVal);
  }

  // Reverse pattern: number BEFORE label (last resort)
  for (const label of labels) {
    const reverseRegex = new RegExp("(\\d[\\d,.]*[万亿]?)\\s+" + label, "g");
    let match;
    while ((match = reverseRegex.exec(flat)) !== null) {
      const val = parseChineseNumber(match[1]);
      if (val > 0) return val;
    }
  }

  return 0;
}

/**
 * Poll the page snapshot until one of the keywords appears, or timeout.
 */
async function waitForContent(helpers, keywords, maxWaitMs = 15000, intervalMs = 2000) {
  const start = Date.now();
  let lastSnapshot = "";
  while (Date.now() - start < maxWaitMs) {
    try {
      lastSnapshot = helpers.snapshot();
      const flat = flattenSnapshot(lastSnapshot);
      if (keywords.some((kw) => flat.includes(kw))) {
        return lastSnapshot;
      }
    } catch {
      // snapshot failed, retry
    }
    await helpers.sleep(intervalMs);
  }
  return lastSnapshot;
}

/**
 * Collect data from bilibili creator dashboard.
 */
async function collect(helpers) {
  const result = {
    followers: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    contentCount: 0,
  };

  // ---- Step 1: Navigate to data overview ----
  // Don't fallback to open() — it creates a new tab and resets loading progress.
  try {
    helpers.navigate("https://member.bilibili.com/platform/data/overview");
  } catch {
    // Timeout OK — browser continues loading in background
  }

  // ---- Step 2: Wait for data content (up to 60s) ----
  let dataText = await waitForContent(
    helpers,
    ["粉丝总数", "粉丝数", "播放量", "点赞", "互动", "涨粉"],
    60000,
    3000
  );

  if (dataText) {
    result.followers = findMetric(dataText, ["粉丝总数", "粉丝数", "粉丝", "关注数"]);
    result.totalViews = findMetric(dataText, ["播放量", "总播放量", "总播放", "播放数", "阅读量"]);
    result.totalLikes = findMetric(dataText, ["点赞", "点赞数", "获赞"]);
    result.totalComments = findMetric(dataText, ["评论", "评论数", "弹幕"]);
    result.totalShares = findMetric(dataText, ["分享", "分享数", "转发数"]);
    result.contentCount = findMetric(dataText, ["投稿数", "稿件数", "视频数", "投稿"]);
  }

  // ---- Step 3: Supplement from home page if needed ----
  if (result.followers === 0) {
    try {
      helpers.navigate("https://member.bilibili.com/platform/home");
    } catch {}
    const homeText = await waitForContent(
      helpers,
      ["粉丝", "播放", "投稿"],
      30000,
      3000
    );
    if (homeText) {
      result.followers = findMetric(homeText, ["粉丝", "关注者"]);
      if (result.contentCount === 0) {
        result.contentCount = findMetric(homeText, ["投稿", "稿件", "视频"]);
      }
    }
  }

  return result;
}

module.exports = {
  collect,
  findMetric,
  flattenSnapshot,
  parseChineseNumber,
  waitForContent,
};
