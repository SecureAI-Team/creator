/**
 * Xiaohongshu (小红书) creator dashboard data collector.
 *
 * Navigates to https://creator.xiaohongshu.com and extracts metrics
 * from the creator center dashboard.
 *
 * Key metrics:
 *   - 粉丝数 / 粉丝          → followers
 *   - 观看量 / 阅读量 / 曝光量  → totalViews
 *   - 点赞数 / 赞藏量          → totalLikes
 *   - 评论数                   → totalComments
 *   - 分享数 / 转发数           → totalShares
 *   - 笔记数 / 作品数           → contentCount
 */

const { findMetric } = require("./bilibili-data");

/**
 * Collect data from Xiaohongshu creator center.
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

  // ---- Step 1: Navigate to Xiaohongshu creator center ----
  try {
    helpers.navigate("https://creator.xiaohongshu.com");
  } catch {
    helpers.open("https://creator.xiaohongshu.com");
  }
  await helpers.sleep(5000);

  // ---- Step 2: Get home page snapshot ----
  let homeText = "";
  try {
    homeText = helpers.snapshot();
  } catch {
    await helpers.sleep(3000);
    try { homeText = helpers.snapshot(); } catch {}
  }

  if (homeText) {
    result.rawData.homeSnapshot = homeText.substring(0, 5000);

    result.followers = findMetric(homeText, ["粉丝数", "粉丝", "关注者"]);
    result.totalViews = findMetric(homeText, ["观看量", "阅读量", "曝光量", "浏览量", "展现量"]);
    result.totalLikes = findMetric(homeText, ["点赞数", "赞藏量", "获赞与收藏", "点赞", "赞"]);
    result.totalComments = findMetric(homeText, ["评论数", "评论量", "评论"]);
    result.totalShares = findMetric(homeText, ["分享数", "转发数", "分享"]);
    result.contentCount = findMetric(homeText, ["笔记数", "作品数", "笔记", "已发布"]);
  }

  // ---- Step 3: Try data page for more metrics ----
  try {
    helpers.navigate("https://creator.xiaohongshu.com/creator/data");
    await helpers.sleep(5000);
    const dataText = helpers.snapshot();
    if (dataText) {
      result.rawData.dataSnapshot = dataText.substring(0, 5000);

      if (result.followers === 0) {
        result.followers = findMetric(dataText, ["粉丝数", "粉丝", "关注"]);
      }
      if (result.totalViews === 0) {
        result.totalViews = findMetric(dataText, ["观看量", "阅读量", "曝光", "浏览"]);
      }
      if (result.totalLikes === 0) {
        result.totalLikes = findMetric(dataText, ["点赞数", "赞藏", "获赞", "点赞"]);
      }
      if (result.totalComments === 0) {
        result.totalComments = findMetric(dataText, ["评论数", "评论"]);
      }
      if (result.totalShares === 0) {
        result.totalShares = findMetric(dataText, ["分享数", "转发", "分享"]);
      }
      if (result.contentCount === 0) {
        result.contentCount = findMetric(dataText, ["笔记数", "作品数", "笔记"]);
      }
    }
  } catch {
    // Non-critical
  }

  // ---- Step 4: Screenshot for debugging ----
  try {
    helpers.screenshot();
  } catch {}

  return result;
}

module.exports = { collect };
