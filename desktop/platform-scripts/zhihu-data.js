/**
 * Zhihu (知乎) creator dashboard data collector.
 *
 * Navigates to https://www.zhihu.com/creator and extracts metrics
 * from the creator center dashboard.
 *
 * Key metrics:
 *   - 关注者 / 粉丝           → followers
 *   - 阅读量 / 总阅读          → totalViews
 *   - 赞同数 / 获赞 / 点赞     → totalLikes
 *   - 评论数                   → totalComments
 *   - 分享数 / 转发            → totalShares
 *   - 内容数 / 回答数 / 文章数  → contentCount
 */

const { findMetric } = require("./bilibili-data");

/**
 * Collect data from Zhihu creator center.
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

  // ---- Step 1: Navigate to Zhihu creator center ----
  try {
    helpers.navigate("https://www.zhihu.com/creator");
  } catch {
    helpers.open("https://www.zhihu.com/creator");
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

    result.followers = findMetric(homeText, ["关注者", "粉丝数", "粉丝", "总关注"]);
    result.totalViews = findMetric(homeText, ["阅读量", "总阅读", "浏览量", "展示次数", "总阅读量"]);
    result.totalLikes = findMetric(homeText, ["赞同数", "获赞", "赞同", "点赞数", "点赞"]);
    result.totalComments = findMetric(homeText, ["评论数", "评论量", "评论"]);
    result.totalShares = findMetric(homeText, ["分享数", "转发数", "收藏数", "收藏"]);
    result.contentCount = findMetric(homeText, ["内容数", "回答数", "文章数", "创作数", "已发布"]);
  }

  // ---- Step 3: Try analytics page for more detailed metrics ----
  try {
    helpers.navigate("https://www.zhihu.com/creator/analytics/content");
    await helpers.sleep(5000);
    const dataText = helpers.snapshot();
    if (dataText) {
      result.rawData.analyticsSnapshot = dataText.substring(0, 5000);

      if (result.followers === 0) {
        result.followers = findMetric(dataText, ["关注者", "粉丝", "总关注"]);
      }
      if (result.totalViews === 0) {
        result.totalViews = findMetric(dataText, ["阅读量", "总阅读", "浏览"]);
      }
      if (result.totalLikes === 0) {
        result.totalLikes = findMetric(dataText, ["赞同", "获赞", "点赞"]);
      }
      if (result.totalComments === 0) {
        result.totalComments = findMetric(dataText, ["评论数", "评论"]);
      }
      if (result.contentCount === 0) {
        result.contentCount = findMetric(dataText, ["内容数", "回答数", "文章数"]);
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
