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
 * label-value pairs in both directions:
 *   1. Label followed by numbers: "粉丝总数 1 408" → takes max (408)
 *   2. Number followed by label: "1234 关注数"
 *
 * IMPORTANT: Many dashboards show a daily change value BEFORE the total:
 *   粉丝总数  +1   408     ← "1" is change, "408" is real total
 *   播放量    43   6,272   ← "43" is change, "6,272" is real total
 * We collect ALL consecutive numbers after the label and take the LARGEST.
 */
function findMetric(snapshotText, labels) {
  // Flatten the accessibility tree to plain text for easier parsing
  const flat = flattenSnapshot(snapshotText);

  for (const label of labels) {
    // Find the label position in the flat text
    const idx = flat.indexOf(label);
    if (idx === -1) continue;

    // Get text after the label
    const afterLabel = flat.substring(idx + label.length);

    // Split into space-separated tokens and collect consecutive numeric tokens
    // Stop at the first non-numeric token (which is likely the next label)
    const tokens = afterLabel.trim().split(/\s+/);
    const numbers = [];
    for (const token of tokens) {
      // Clean the token: remove commas, colons, parens, unit suffixes like 人/次/篇/个
      const cleaned = token.replace(/[,:：()（）人次篇个+\-]/g, "").trim();
      if (!cleaned) continue;
      // Check if it's a valid number (possibly with 万/亿 suffix)
      if (/^[\d.]+[万亿]?$/.test(cleaned)) {
        numbers.push(parseChineseNumber(cleaned));
      } else {
        // Non-numeric token reached → stop (likely next metric label)
        break;
      }
    }

    if (numbers.length > 0) {
      // Take the LARGEST number — in "change total" patterns, total > change
      const maxVal = Math.max(...numbers);
      if (maxVal > 0) return maxVal;
    }
  }

  // Reverse pattern: number BEFORE label — "1234 粉丝数"
  for (const label of labels) {
    const idx = flat.indexOf(label);
    if (idx === -1 || idx === 0) continue;

    const beforeLabel = flat.substring(0, idx).trimEnd();
    const lastToken = beforeLabel.split(/\s+/).pop();
    if (lastToken) {
      const cleaned = lastToken.replace(/[,]/g, "");
      if (/^[\d.]+[万亿]?$/.test(cleaned)) {
        const val = parseChineseNumber(cleaned);
        if (val > 0) return val;
      }
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

  // ---- Step 2: Click "数据中心" in sidebar using ref from snapshot ----
  // OpenClaw CLI expects ref values (e.g. "e58"), not Playwright selectors.
  // Take a snapshot, find the ref for "数据中心", then click it.
  let dataPageLoaded = false;
  try {
    const homeSnapshot = helpers.snapshot();
    if (homeSnapshot) {
      dataPageLoaded = helpers.clickByText(homeSnapshot, "数据中心");
      if (dataPageLoaded) {
        // Give the SPA time to route after click
        await helpers.sleep(3000);
      }
    }
  } catch {
    // snapshot or click failed
  }

  // ---- Step 3: Wait for data content to appear ----
  let dataText = "";
  if (dataPageLoaded) {
    // Poll until we see data-related keywords
    dataText = await waitForContent(
      helpers,
      ["粉丝总数", "粉丝数", "播放量", "点赞", "互动", "涨粉"],
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
        ["粉丝总数", "粉丝数", "播放量", "点赞", "互动", "涨粉"],
        12000,
        2000
      );
    } catch {
      // Already have whatever snapshot we had
    }
  }

  if (dataText) {
    result.rawData.overviewSnapshot = dataText.substring(0, 5000);
    result.rawData.overviewFlatText = flattenSnapshot(dataText).substring(0, 3000);

    // Parse metrics from the data overview page
    // Bilibili data page layout: "粉丝总数 [change] [total]" "播放量 [change] [total]"
    // findMetric takes the MAX of consecutive numbers → gets total, not change
    result.followers = findMetric(dataText, ["粉丝总数", "粉丝数", "粉丝", "关注数"]);
    result.totalViews = findMetric(dataText, ["播放量", "总播放量", "总播放", "播放数", "阅读量"]);
    result.totalLikes = findMetric(dataText, ["点赞", "点赞数", "获赞"]);
    result.totalComments = findMetric(dataText, ["评论", "评论数", "弹幕"]);
    result.totalShares = findMetric(dataText, ["分享", "分享数", "转发数"]);
    result.contentCount = findMetric(dataText, ["投稿数", "稿件数", "视频数", "投稿"]);

    // Bilibili-specific: store extra metrics in rawData
    const coins = findMetric(dataText, ["投币", "硬币"]);
    if (coins > 0) result.rawData.coins = coins;
    const favorites = findMetric(dataText, ["收藏"]);
    if (favorites > 0) result.rawData.favorites = favorites;
    const danmaku = findMetric(dataText, ["弹幕"]);
    if (danmaku > 0) result.rawData.danmaku = danmaku;
  }

  // ---- Step 4: Also grab home page data as supplement ----
  try {
    helpers.navigate("https://member.bilibili.com/platform/home");
    await helpers.sleep(3000);
    const homeText = helpers.snapshot();
    if (homeText) {
      result.rawData.homeSnapshot = homeText.substring(0, 3000);
      result.rawData.homeFlatText = flattenSnapshot(homeText).substring(0, 2000);
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

module.exports = { collect, parseChineseNumber, flattenSnapshot, findMetric, waitForContent };
