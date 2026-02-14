/**
 * WeChat Channels (微信视频号) creator dashboard data collector.
 *
 * Navigates to https://channels.weixin.qq.com and extracts metrics
 * from the creator center dashboard.
 *
 * Page layout (from real snapshot):
 *   视频号ID: sphjnVNVq4gWQrX
 *   视频 36              → contentCount
 *   关注者 107            → followers
 *   昨日数据
 *   净增关注 4            → rawData.dailyNewFollowers
 *   新增播放 469          → totalViews (daily)
 *   新增点赞 0            → totalLikes (daily)
 *   新增评论 0            → totalComments (daily)
 */

const { findMetric, flattenSnapshot, waitForContent } = require("./bilibili-data");

/**
 * Collect data from WeChat Channels (视频号) dashboard.
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

  // ---- Step 1: Navigate to WeChat Channels creator center ----
  try {
    helpers.navigate("https://channels.weixin.qq.com");
  } catch {
    try {
      helpers.open("https://channels.weixin.qq.com");
    } catch {
      // Timeout OK — browser should be open
    }
  }

  // ---- Step 2: Wait for content to appear ----
  let homeText = await waitForContent(
    helpers,
    ["视频号", "关注者", "视频", "昨日", "创作"],
    20000,
    3000
  );

  if (homeText) {
    result.rawData.homeSnapshot = homeText.substring(0, 5000);
    result.rawData.homeFlatText = flattenSnapshot(homeText).substring(0, 3000);

    // Cumulative metrics from profile section
    result.followers = findMetric(homeText, ["关注者", "粉丝数", "粉丝", "总关注"]);
    result.contentCount = findMetric(homeText, ["视频", "作品数", "作品", "已发布"]);

    // Daily metrics from "昨日数据" section
    result.totalViews = findMetric(homeText, ["新增播放", "播放量", "播放", "曝光"]);
    result.totalLikes = findMetric(homeText, ["新增点赞", "点赞数", "点赞", "获赞"]);
    result.totalComments = findMetric(homeText, ["新增评论", "评论数", "评论"]);
    result.totalShares = findMetric(homeText, ["新增分享", "分享数", "分享", "转发"]);

    // Store daily change data
    const dailyNewFollowers = findMetric(homeText, ["净增关注", "新增关注"]);
    if (dailyNewFollowers > 0) {
      result.rawData.dailyNewFollowers = dailyNewFollowers;
    }
  }

  // ---- Step 3: Try to navigate to data/analytics page for more detail ----
  try {
    const snap = homeText || helpers.snapshot();
    if (snap) {
      let clicked = false;
      for (const linkText of ["数据中心", "数据分析", "数据", "查看更多"]) {
        if (helpers.clickByText(snap, linkText)) {
          clicked = true;
          break;
        }
      }
      if (clicked) {
        await helpers.sleep(4000);
        const dataText = helpers.snapshot();
        if (dataText) {
          result.rawData.dataSnapshot = dataText.substring(0, 5000);
          result.rawData.dataFlatText = flattenSnapshot(dataText).substring(0, 3000);

          // Try to find total/aggregate metrics from the data page
          if (result.followers === 0) {
            result.followers = findMetric(dataText, ["关注者", "粉丝", "总关注"]);
          }
          if (result.totalViews === 0) {
            result.totalViews = findMetric(dataText, ["播放量", "总播放", "播放"]);
          }
          if (result.totalLikes === 0) {
            result.totalLikes = findMetric(dataText, ["点赞量", "获赞", "点赞"]);
          }
          if (result.totalComments === 0) {
            result.totalComments = findMetric(dataText, ["评论量", "评论数", "评论"]);
          }
          if (result.totalShares === 0) {
            result.totalShares = findMetric(dataText, ["分享量", "分享数", "分享"]);
          }
        }
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
