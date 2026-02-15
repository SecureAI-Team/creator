/**
 * Douyin (抖音) creator dashboard data collector.
 *
 * Strategy:
 *   1. Navigate to /creator-micro/home (explicit home path to avoid SPA
 *      routing to last-visited page).
 *   2. Even if navigate CLI times out (gateway has internal 20s timeout),
 *      the browser continues loading in the background. DON'T fallback to
 *      `open` — that creates a new tab and resets navigation progress.
 *   3. Poll with waitForContent (60s) until page content appears.
 *   4. Navigate to /creator-micro/data/overview for detailed data.
 */

const { findMetric, flattenSnapshot, waitForContent } = require("./bilibili-data");

async function collect(helpers) {
  const result = {
    followers: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    contentCount: 0,
  };

  // ---- Step 1: Start navigation to home ----
  // navigate may throw (20s gateway timeout), but the browser keeps loading.
  // Do NOT use helpers.open() as fallback — it creates a new tab and resets progress.
  try {
    helpers.navigate("https://creator.douyin.com/creator-micro/home");
  } catch {
    // Timeout OK — browser is still loading in background
  }

  // ---- Step 2: Wait for homepage content (up to 60s) ----
  const homeText = await waitForContent(
    helpers,
    ["粉丝", "获赞", "播放", "作品数", "创作者"],
    60000,
    3000
  );

  if (homeText) {
    result.followers = findMetric(homeText, ["粉丝总量", "粉丝数", "粉丝"]);
    result.totalLikes = findMetric(homeText, ["获赞", "总获赞", "点赞量", "点赞数"]);
    result.totalViews = findMetric(homeText, ["总播放量", "播放总量", "播放量", "展现量"]);
    result.totalComments = findMetric(homeText, ["评论量", "评论数", "评论"]);
    result.totalShares = findMetric(homeText, ["转发量", "分享量", "分享数", "转发数"]);
    result.contentCount = findMetric(homeText, ["作品数", "作品", "投稿数", "已发布"]);
  }

  // ---- Step 3: Navigate to data overview for detailed stats ----
  try {
    helpers.navigate("https://creator.douyin.com/creator-micro/data/overview");
  } catch {
    // Timeout OK
  }

  const dataText = await waitForContent(
    helpers,
    ["粉丝总量", "粉丝数", "播放量", "作品点赞", "涨粉", "净增"],
    45000,
    3000
  );

  if (dataText) {
    if (result.followers === 0) {
      result.followers = findMetric(dataText, ["粉丝总量", "粉丝数", "粉丝"]);
    }
    if (result.totalViews === 0) {
      result.totalViews = findMetric(dataText, ["总播放量", "播放总量", "播放量", "播放"]);
    }
    if (result.totalLikes === 0) {
      result.totalLikes = findMetric(dataText, ["获赞", "总获赞", "作品点赞", "点赞量"]);
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

  return result;
}

module.exports = { collect };
