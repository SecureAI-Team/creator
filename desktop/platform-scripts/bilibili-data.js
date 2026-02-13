/**
 * Bilibili creator dashboard data collector.
 *
 * Strategy:
 *   1. Navigate to https://member.bilibili.com/platform/home (always loads)
 *   2. Click "数据中心" in sidebar to trigger client-side routing
 *   3. Wait for data content to appear (poll for keywords)
 *   4. Parse metrics from the accessibility snapshot
 *
 * The Bilibili creator center is a SPA — direct navigation to
 * /platform/data/overview often shows only the sidebar without metrics.
 * Going through the home page and clicking ensures proper SPA hydration.
 */

/**
 * Extract a numeric value following a Chinese label from snapshot text.
 * Handles formats like "12.5万" (= 125000), "1,234", "1234".
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
 *
 * The snapshot uses formats like:
 *   - text: 原创内容
 *   - generic [ref=e80]: "9"
 *   - link "Agent Skills 火了" [ref=e200]
 *   - heading "公众号" [level=1]
 *
 * We extract all visible text content and quoted values in order,
 * so "原创内容" and "9" become adjacent tokens for regex matching.
 */
function flattenSnapshot(snapshot) {
  if (!snapshot) return "";
  const tokens = [];
  const lines = snapshot.split("\n");
  for (const line of lines) {
    const trimmed = line.replace(/^\s*-\s*/, "").trim();
    if (!trimmed) continue;

    // Extract quoted numbers/values: "9", "38", "12.5万"
    const quotedNums = trimmed.match(/"(\d[\d,.]*[万亿]?)"/g);
    if (quotedNums) {
      for (const q of quotedNums) {
        tokens.push(q.replace(/"/g, ""));
      }
    }

    // Extract text after the last colon for structured elements:
    //   generic [ref=e87]: 昨日阅读(人)
    //   text: 原创内容
    //   generic [ref=e14]: 成为UP主的第579天
    const colonMatch = trimmed.match(/(?:text|generic|heading|paragraph|emphasis|button|listitem)(?:\s+\[.*?\])*(?:\s+"[^"]*")?(?:\s+\[.*?\])*:\s*(.+)/);
    if (colonMatch) {
      let content = colonMatch[1].trim();
      // Remove inline refs and attributes: [ref=e80], [cursor=pointer]
      content = content.replace(/\[.*?\]/g, "").trim();
      // Skip if it's just tree structure or URLs
      if (content && !content.startsWith("-") && !content.startsWith("/url:") && !content.startsWith("img")) {
        // Remove surrounding quotes if present
        content = content.replace(/^"(.*)"$/, "$1");
        if (content) tokens.push(content);
      }
    }

    // Also extract link text: link "数据分析" or link "2"
    const linkMatch = trimmed.match(/^link\s+"([^"]+)"/);
    if (linkMatch) {
      tokens.push(linkMatch[1]);
    }
  }
  return tokens.join(" ");
}

/**
 * Try to find a numeric value near a given label in the snapshot text.
 * First flattens the accessibility tree snapshot, then searches for
 * label-value pairs.
 */
function findMetric(snapshotText, labels) {
  // Flatten the accessibility tree to plain text for easier parsing
  const flat = flattenSnapshot(snapshotText);

  for (const label of labels) {
    // Look for patterns like "粉丝数 1234" or "总用户数 4" or "原创内容 9"
    const regex = new RegExp(label + "[\\s:：()（）人次篇个]*([\\d,.]+[万亿]?)", "i");
    const match = flat.match(regex);
    if (match) {
      const val = parseChineseNumber(match[1]);
      if (val > 0) return val;
    }
  }
  return 0;
}

/**
 * Poll the page snapshot until one of the keywords appears, or timeout.
 * @param {object} helpers
 * @param {string[]} keywords - Keywords to look for in the flattened snapshot
 * @param {number} maxWaitMs - Maximum wait time in ms
 * @param {number} intervalMs - Polling interval in ms
 * @returns {string} The snapshot text once ready, or the last snapshot
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
 * @param {object} helpers - { navigate, open, snapshot, click, screenshot, sleep, ... }
 * @returns {Promise<{ followers, totalViews, totalLikes, totalComments, totalShares, contentCount, rawData }>}
 */
async function collect(helpers) {
  const result = {
    followers: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    contentCount: 0,
    rawData: {},
  };

  // ---- Step 1: Navigate to bilibili creator home (SPA entry point) ----
  try {
    helpers.navigate("https://member.bilibili.com/platform/home");
  } catch {
    helpers.open("https://member.bilibili.com/platform/home");
  }
  await helpers.sleep(5000);

  // ---- Step 2: Click "数据中心" in sidebar to trigger SPA route ----
  let dataPageLoaded = false;
  const clickSelectors = [
    'text="数据中心"',
    'text=数据中心',
    'generic:has-text("数据中心")',
  ];
  for (const sel of clickSelectors) {
    try {
      helpers.click(sel);
      dataPageLoaded = true;
      break;
    } catch {
      // Try next selector
    }
  }

  // ---- Step 3: Wait for data content to appear ----
  let dataText = "";
  if (dataPageLoaded) {
    // Poll until we see data-related keywords
    dataText = await waitForContent(
      helpers,
      ["粉丝数", "播放量", "总播放", "点赞数", "互动数", "涨粉"],
      15000,
      2000
    );
  }

  // Fallback: try direct URL navigation if click didn't work
  if (!dataText || !flattenSnapshot(dataText).match(/粉丝|播放|点赞/)) {
    try {
      helpers.navigate("https://member.bilibili.com/platform/data/overview");
      dataText = await waitForContent(
        helpers,
        ["粉丝数", "播放量", "总播放", "点赞数", "互动数", "涨粉"],
        12000,
        2000
      );
    } catch {
      // Already have whatever snapshot we had
    }
  }

  if (dataText) {
    result.rawData.overviewSnapshot = dataText.substring(0, 5000);

    // Parse metrics from the data overview page
    result.followers = findMetric(dataText, ["粉丝数", "粉丝总数", "粉丝", "关注数", "涨粉"]);
    result.totalViews = findMetric(dataText, ["播放量", "总播放量", "总播放", "播放数", "阅读量"]);
    result.totalLikes = findMetric(dataText, ["点赞数", "点赞", "获赞"]);
    result.totalComments = findMetric(dataText, ["评论数", "评论", "弹幕数"]);
    result.totalShares = findMetric(dataText, ["分享数", "分享", "转发数"]);
    result.contentCount = findMetric(dataText, ["投稿数", "稿件数", "视频数", "投稿"]);
  }

  // ---- Step 4: Also grab home page data as supplement ----
  try {
    helpers.navigate("https://member.bilibili.com/platform/home");
    await helpers.sleep(3000);
    const homeText = helpers.snapshot();
    if (homeText) {
      result.rawData.homeSnapshot = homeText.substring(0, 3000);
      // Home page might show follower count and recent stats
      if (result.followers === 0) {
        result.followers = findMetric(homeText, ["粉丝", "关注者"]);
      }
    }
  } catch {
    // Non-critical
  }

  // ---- Step 5: Screenshot for debugging ----
  try {
    helpers.screenshot();
  } catch {}

  return result;
}

module.exports = { collect, parseChineseNumber, flattenSnapshot, findMetric };
