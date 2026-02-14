/**
 * Douyin (抖音) creator dashboard data collector.
 *
 * Navigates to https://creator.douyin.com and extracts metrics
 * from the dashboard overview page.
 *
 * Key metrics on the creator dashboard:
 *   Profile section (cumulative totals):
 *     关注 22, 粉丝 994, 获赞 4142
 *   Data section (per-video or 7-day stats):
 *     播放量 45 (video), 点赞量 1 (video)
 *     播放量 72 (7-day), 作品点赞 1 (7-day)
 *
 * IMPORTANT: Label priority matters! "获赞" (total=4142) must come BEFORE
 * "点赞量" (per-video=1) to capture the correct aggregate value.
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
    rawData: {},
  };

  // ---- Step 1: Navigate to Douyin creator center ----
  // Douyin can be slow (20s+ page load). Try navigate, catch timeout, proceed anyway.
  try {
    helpers.navigate("https://creator.douyin.com");
  } catch {
    try {
      helpers.open("https://creator.douyin.com");
    } catch {
      // Even open failed — page is loading slowly, but browser should be open
    }
  }

  // ---- Step 2: Wait for content to appear ----
  const homeText = await waitForContent(
    helpers,
    ["粉丝", "播放", "作品", "创作者", "数据"],
    20000,
    3000
  );

  if (homeText) {
    result.rawData.homeSnapshot = homeText.substring(0, 5000);
    result.rawData.homeFlatText = flattenSnapshot(homeText).substring(0, 3000);

    // Profile section cumulative labels first, then data section labels
    result.followers = findMetric(homeText, ["粉丝总量", "粉丝数", "粉丝", "关注者"]);
    result.totalLikes = findMetric(homeText, ["获赞", "总获赞", "点赞量", "点赞数"]);
    result.totalViews = findMetric(homeText, ["总播放量", "播放总量", "播放量", "展现量"]);
    result.totalComments = findMetric(homeText, ["评论量", "评论数", "评论"]);
    result.totalShares = findMetric(homeText, ["转发量", "分享量", "分享数", "转发数"]);
    result.contentCount = findMetric(homeText, ["作品数", "作品", "投稿数", "已发布"]);
  }

  // ---- Step 3: Try data overview page via sidebar click (SPA) ----
  try {
    const snap = homeText || helpers.snapshot();
    if (snap) {
      let clicked = false;
      for (const linkText of ["数据概览", "数据中心", "数据"]) {
        if (helpers.clickByText(snap, linkText)) {
          clicked = true;
          break;
        }
      }
      if (clicked) {
        await helpers.sleep(4000);
      } else {
        // Fallback: direct URL navigation
        try {
          helpers.navigate("https://creator.douyin.com/creator-micro/data/overview");
        } catch {
          // Timeout is OK, page may have partially loaded
        }
        await helpers.sleep(4000);
      }
    }

    const dataText = helpers.snapshot();
    if (dataText) {
      result.rawData.dataSnapshot = dataText.substring(0, 5000);
      result.rawData.dataFlatText = flattenSnapshot(dataText).substring(0, 3000);

      if (result.followers === 0) {
        result.followers = findMetric(dataText, ["粉丝总量", "粉丝数", "粉丝"]);
      }
      if (result.totalViews === 0) {
        result.totalViews = findMetric(dataText, ["总播放量", "播放总量", "播放量", "播放"]);
      }
      if (result.totalLikes === 0) {
        result.totalLikes = findMetric(dataText, ["获赞", "总获赞", "点赞量", "点赞"]);
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
