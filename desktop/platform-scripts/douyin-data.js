/**
 * Douyin (抖音) creator dashboard data collector.
 *
 * Strategy:
 *   1. Navigate to /creator-micro/home (explicit home path to avoid SPA
 *      routing to last-visited page).
 *   2. Even if navigate CLI times out (gateway has internal 20s timeout),
 *      the browser continues loading in the background. DON'T fallback to
 *      `open` — that creates a new tab and resets navigation progress.
 *   3. Brief sleep after navigate to let SPA start rendering new content
 *      (prevents matching stale content from previous page).
 *   4. Poll with waitForContent (90s) until page content appears.
 *   5. Navigate to /creator-micro/data/overview for detailed data.
 *
 * Keywords are very specific to page MAIN CONTENT (not sidebar) to prevent
 * early matching on navigation menus or stale SPA content.
 */

const { findMetric, flattenSnapshot, waitForContent } = require("./bilibili-data");

async function collect(helpers) {
  const log = helpers.log;
  const result = {
    followers: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    contentCount: 0,
  };

  log.info("douyin: Step 1 — navigate to home");

  // ---- Step 1: Start navigation to home ----
  try {
    helpers.navigate("https://creator.douyin.com/creator-micro/home");
  } catch {
    // Timeout OK — browser is still loading in background
  }

  // Brief sleep to let SPA route and start rendering the home page.
  await helpers.sleep(5000);

  // ---- Step 2: Wait for homepage content (up to 90s) ----
  // Use keywords that ONLY appear in the home page main content area,
  // NOT in the sidebar (首页/内容管理/数据中心 etc).
  const homeText = await waitForContent(
    helpers,
    ["新的创作", "播放总量", "看详细数据", "获赞"],
    90000,
    3000
  );

  if (homeText) {
    const flat = flattenSnapshot(homeText);
    log.info(`douyin: home flat (${flat.length} chars): ${flat.substring(0, 500)}`);
    result.followers = findMetric(homeText, ["粉丝总量", "粉丝数", "粉丝"], log);
    result.totalLikes = findMetric(homeText, ["获赞", "总获赞", "点赞量", "点赞数"], log);
    result.totalViews = findMetric(homeText, ["总播放量", "播放总量", "播放量", "展现量"], log);
    result.totalComments = findMetric(homeText, ["评论量", "评论数", "评论"], log);
    result.totalShares = findMetric(homeText, ["转发量", "分享量", "分享数", "转发数"], log);
    result.contentCount = findMetric(homeText, ["作品数", "作品", "投稿数", "已发布"], log);
  }

  // ---- Step 3: Navigate to data overview for detailed stats ----
  log.info("douyin: Step 3 — navigate to data overview");
  try {
    helpers.navigate("https://creator.douyin.com/creator-micro/data/overview");
  } catch {
    // Timeout OK
  }

  await helpers.sleep(3000);

  const dataText = await waitForContent(
    helpers,
    ["核心数据", "数据概览", "涨粉趋势", "作品数据", "净增粉丝"],
    60000,
    3000
  );

  if (dataText) {
    const flat = flattenSnapshot(dataText);
    log.info(`douyin: data flat (${flat.length} chars): ${flat.substring(0, 500)}`);
    if (result.followers === 0) {
      result.followers = findMetric(dataText, ["粉丝总量", "粉丝数", "粉丝"], log);
    }
    if (result.totalViews === 0) {
      result.totalViews = findMetric(dataText, ["总播放量", "播放总量", "播放量", "播放"], log);
    }
    if (result.totalLikes === 0) {
      result.totalLikes = findMetric(dataText, ["获赞", "总获赞", "作品点赞", "点赞量"], log);
    }
    if (result.totalComments === 0) {
      result.totalComments = findMetric(dataText, ["评论量", "评论数", "评论"], log);
    }
    if (result.totalShares === 0) {
      result.totalShares = findMetric(dataText, ["转发量", "分享量", "分享"], log);
    }
    if (result.contentCount === 0) {
      result.contentCount = findMetric(dataText, ["作品数", "投稿数", "视频数"], log);
    }
  }

  log.info(`douyin: result = ${JSON.stringify(result)}`);
  return result;
}

module.exports = { collect };
