/**
 * Douyin (抖音) creator dashboard data collector.
 *
 * Navigates to https://creator.douyin.com and extracts metrics
 * from the dashboard overview page.
 *
 * Key metrics on the creator dashboard:
 *   - 粉丝总量 / 粉丝数        → followers
 *   - 总播放量 / 播放量         → totalViews
 *   - 点赞量 / 总获赞          → totalLikes
 *   - 评论量                   → totalComments
 *   - 转发量 / 分享量           → totalShares
 *   - 作品数 / 投稿数           → contentCount
 */

const { findMetric } = require("./bilibili-data");

/**
 * Collect data from Douyin creator dashboard.
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

  // ---- Step 1: Navigate to Douyin creator center ----
  try {
    helpers.navigate("https://creator.douyin.com");
  } catch {
    helpers.open("https://creator.douyin.com");
  }
  await helpers.sleep(5000);

  // ---- Step 2: Get home/overview snapshot ----
  let homeText = "";
  try {
    homeText = helpers.snapshot();
  } catch {
    await helpers.sleep(3000);
    try { homeText = helpers.snapshot(); } catch {}
  }

  if (homeText) {
    result.rawData.homeSnapshot = homeText.substring(0, 5000);

    result.followers = findMetric(homeText, ["粉丝总量", "粉丝数", "粉丝", "关注者"]);
    result.totalViews = findMetric(homeText, ["总播放量", "播放量", "播放总量", "展现量"]);
    result.totalLikes = findMetric(homeText, ["点赞量", "总获赞", "获赞", "点赞数"]);
    result.totalComments = findMetric(homeText, ["评论量", "评论数", "评论"]);
    result.totalShares = findMetric(homeText, ["转发量", "分享量", "分享数", "转发数"]);
    result.contentCount = findMetric(homeText, ["作品数", "作品", "投稿数", "已发布"]);
  }

  // ---- Step 3: Try data overview page for more metrics ----
  try {
    helpers.navigate("https://creator.douyin.com/creator-micro/data/overview");
    await helpers.sleep(5000);
    const dataText = helpers.snapshot();
    if (dataText) {
      result.rawData.dataSnapshot = dataText.substring(0, 5000);

      if (result.followers === 0) {
        result.followers = findMetric(dataText, ["粉丝总量", "粉丝数", "粉丝"]);
      }
      if (result.totalViews === 0) {
        result.totalViews = findMetric(dataText, ["总播放量", "播放量", "播放"]);
      }
      if (result.totalLikes === 0) {
        result.totalLikes = findMetric(dataText, ["点赞量", "获赞", "点赞"]);
      }
      if (result.totalComments === 0) {
        result.totalComments = findMetric(dataText, ["评论量", "评论数", "评论"]);
      }
      if (result.totalShares === 0) {
        result.totalShares = findMetric(dataText, ["转发量", "分享量", "分享"]);
      }
      if (result.contentCount === 0) {
        result.contentCount = findMetric(dataText, ["作品数", "投稿数", "视频数"]);
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
