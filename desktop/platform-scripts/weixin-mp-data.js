/**
 * WeChat Official Account (微信公众号) creator dashboard data collector.
 *
 * Navigates to https://mp.weixin.qq.com (公众号后台首页) and extracts
 * metrics from the home page accessibility snapshot.
 *
 * The home page shows:
 *   - 原创内容 "9"          → contentCount
 *   - 总用户数 "4"          → followers
 *   - 昨日阅读(人) "2"     → totalViews
 *   - 昨日分享(人) "0"     → totalShares
 *   - 昨日新增关注(人) "0"
 *
 * No navigation clicks needed — all key data is on the home page.
 */

const { findMetric, flattenSnapshot, waitForContent } = require("./bilibili-data");

/**
 * Collect data from WeChat Official Account dashboard.
 * @param {object} helpers - { navigate, open, snapshot, click, screenshot, sleep, ... }
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

  // ---- Step 1: Navigate to WeChat MP home ----
  try {
    helpers.navigate("https://mp.weixin.qq.com");
  } catch {
    try {
      helpers.open("https://mp.weixin.qq.com");
    } catch {
      // Timeout OK — browser should be open
    }
  }

  // ---- Step 2: Wait for content and get snapshot ----
  let homeText = await waitForContent(
    helpers,
    ["公众号", "总用户", "原创", "阅读", "关注"],
    20000,
    3000
  );

  if (homeText) {
    result.rawData.homeSnapshot = homeText.substring(0, 5000);
    result.rawData.homeFlatText = flattenSnapshot(homeText).substring(0, 3000);

    // Extract metrics from home page accessibility tree
    result.followers = findMetric(homeText, ["总用户数", "累计关注", "总关注"]);
    result.totalViews = findMetric(homeText, ["昨日阅读", "阅读量", "总阅读"]);
    result.totalShares = findMetric(homeText, ["昨日分享", "分享次数"]);
    result.contentCount = findMetric(homeText, ["原创内容", "已发表", "文章数"]);
    result.totalLikes = findMetric(homeText, ["点赞", "在看"]);
    result.totalComments = findMetric(homeText, ["评论", "留言"]);

    const newFollowers = findMetric(homeText, ["昨日新增关注", "新增关注"]);
    if (newFollowers > 0) {
      result.rawData.newFollowers = newFollowers;
    }
  }

  // ---- Step 3: Screenshot for debugging ----
  try {
    helpers.screenshot();
  } catch {}

  return result;
}

module.exports = { collect };
