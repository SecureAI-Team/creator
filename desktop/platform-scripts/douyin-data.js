/**
 * Douyin (抖音) creator dashboard data collector.
 *
 * Strategy:
 *   1. Navigate explicitly to /creator-micro/home (SPA may redirect to last-visited page
 *      if we only go to creator.douyin.com, so we MUST use the full home URL).
 *   2. Click "首页" in the sidebar to ensure we're on the homepage.
 *   3. Parse homepage metrics (粉丝, 获赞, 播放).
 *   4. Navigate to /creator-micro/data/overview for detailed data.
 *   5. Parse data overview metrics.
 */

const { findMetric, flattenSnapshot, waitForContent } = require("./bilibili-data");

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
  };

  // ---- Step 1: Navigate to explicit home URL ----
  // IMPORTANT: Don't use just creator.douyin.com — the SPA remembers the last
  // visited sub-page and may land on 关注管理, 内容管理, etc.
  try {
    helpers.navigate("https://creator.douyin.com/creator-micro/home");
  } catch {
    try {
      helpers.open("https://creator.douyin.com/creator-micro/home");
    } catch {
      // Page loading slowly, proceed
    }
  }

  // ---- Step 2: Wait for homepage content ----
  const homeText = await waitForContent(
    helpers,
    ["粉丝", "播放", "获赞", "作品数"],
    25000,
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

  // ---- Step 3: Navigate directly to data overview page ----
  // Don't rely on sidebar click — the SPA sidebar may expand sub-menus instead
  // of navigating. Use the direct URL instead.
  try {
    helpers.navigate("https://creator.douyin.com/creator-micro/data/overview");
  } catch {
    // Timeout OK, page may still load
  }

  const dataText = await waitForContent(
    helpers,
    ["粉丝总量", "粉丝数", "播放量", "作品点赞", "涨粉"],
    20000,
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
