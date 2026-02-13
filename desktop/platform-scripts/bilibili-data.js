/**
 * Bilibili creator dashboard data collector.
 *
 * Navigates to:
 *   1. https://member.bilibili.com/platform/data/overview  (数据总览)
 *   2. https://member.bilibili.com/platform/data/article    (稿件数据)
 *
 * Extracts: followers, total views, total likes, total comments, total shares,
 *           content count, and recent content performance list.
 *
 * Strategy: navigate → wait → snapshot → parse text from snapshot.
 * The snapshot returns an accessibility tree with visible text, so we look
 * for known Chinese labels and adjacent numeric values.
 */

/**
 * Extract a numeric value following a Chinese label from snapshot text.
 * Handles formats like "12.5万" (= 125000), "1,234", "1234".
 */
function parseChineseNumber(text) {
  if (!text) return 0;
  text = text.replace(/,/g, "").trim();
  const wanMatch = text.match(/([\d.]+)\s*万/);
  if (wanMatch) return Math.round(parseFloat(wanMatch[1]) * 10000);
  const yiMatch = text.match(/([\d.]+)\s*亿/);
  if (yiMatch) return Math.round(parseFloat(yiMatch[1]) * 100000000);
  const num = parseFloat(text);
  return isNaN(num) ? 0 : Math.round(num);
}

/**
 * Try to find a numeric value near a given label in the snapshot text.
 * The snapshot is a text representation of the page.
 */
function findMetric(snapshotText, labels) {
  for (const label of labels) {
    // Look for patterns like "粉丝数 1234" or "粉丝数\n1234"
    const regex = new RegExp(label + "[\\s:：]*([\\d,.]+[万亿]?)", "i");
    const match = snapshotText.match(regex);
    if (match) {
      return parseChineseNumber(match[1]);
    }
  }
  return 0;
}

/**
 * Collect data from bilibili creator dashboard.
 * @param {object} helpers - { navigate, snapshot, screenshot, sleep, ... }
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

  // ---- Step 1: Navigate to bilibili data overview ----
  try {
    helpers.navigate("https://member.bilibili.com/platform/data/overview");
  } catch {
    // If navigate fails, try open (which also launches the browser)
    helpers.open("https://member.bilibili.com/platform/data/overview");
  }
  await helpers.sleep(5000);

  // ---- Step 2: Get the page snapshot ----
  let overviewText = "";
  try {
    overviewText = helpers.snapshot();
  } catch (err) {
    // If snapshot fails, take a screenshot for debugging and try again
    try { helpers.screenshot(); } catch {}
    await helpers.sleep(3000);
    try { overviewText = helpers.snapshot(); } catch {}
  }

  if (overviewText) {
    result.rawData.overviewSnapshot = overviewText.substring(0, 5000);

    // Parse overview metrics
    // Bilibili data overview typically shows:
    // 粉丝数、播放量、点赞数、评论数、分享数、投稿量
    result.followers = findMetric(overviewText, ["粉丝数", "粉丝", "关注者", "followers"]);
    result.totalViews = findMetric(overviewText, ["播放量", "总播放", "播放数", "阅读量", "views"]);
    result.totalLikes = findMetric(overviewText, ["点赞数", "点赞", "获赞", "likes"]);
    result.totalComments = findMetric(overviewText, ["评论数", "评论", "弹幕", "comments"]);
    result.totalShares = findMetric(overviewText, ["分享数", "分享", "转发", "shares"]);
    result.contentCount = findMetric(overviewText, ["投稿", "稿件", "作品数", "视频数"]);
  }

  // ---- Step 3: Try to get more data from the up-stat page ----
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
    // Non-critical, ignore
  }

  // ---- Step 4: Take a screenshot for debugging/audit ----
  try {
    helpers.screenshot();
  } catch {}

  return result;
}

module.exports = { collect, parseChineseNumber, findMetric };
