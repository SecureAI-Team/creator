/**
 * Douyin (抖音) creator dashboard data collector.
 *
 * Strategy:
 *   1. Navigate to /creator-micro/home for followers + summary metrics.
 *   2. Navigate to /creator-micro/data/overview for detailed engagement.
 *   3. Poll with waitForContent until page-specific content appears.
 *
 * Keywords target MAIN CONTENT only (not sidebar) to prevent early match.
 */

const { findMetric, flattenSnapshot, waitForContent, isLoginSnapshot } = require("./bilibili-data");

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

  // ---- Step 1: Home page ----
  log.info("douyin: Step 1 — navigate to home");
  try {
    helpers.navigate("https://creator.douyin.com/creator-micro/home");
  } catch (e) { log.warn("douyin: nav timeout (ok):", e.message); }

  await helpers.sleep(5000);

  const homeText = await waitForContent(
    helpers,
    ["新的创作", "播放总量", "看详细数据", "获赞"],
    90000,
    3000
  );

  if (homeText) {
    if (isLoginSnapshot(homeText)) {
      log.warn("douyin: login page detected");
      return result;
    }
    const flat = flattenSnapshot(homeText);
    log.info(`douyin: home flat (${flat.length} chars): ${flat.substring(0, 1000)}`);
    result.followers = findMetric(homeText, ["粉丝总量", "粉丝数", "粉丝"], {
      log,
      excludePrefixes: ["新增", "净增", "昨日"],
    });
    result.totalLikes = findMetric(homeText, ["总获赞", "获赞", "点赞量", "点赞数"], {
      log,
      excludePrefixes: ["新增", "昨日"],
    });
    result.totalViews = findMetric(homeText, ["播放总量", "总播放量", "播放量"], {
      log,
      excludePrefixes: ["新增", "昨日"],
    });
    result.totalComments = findMetric(homeText, ["评论总量", "评论量", "评论数"], log);
    result.totalShares = findMetric(homeText, ["转发总量", "分享量", "分享数"], log);
    result.contentCount = findMetric(homeText, ["作品数", "作品", "投稿数"], log);
  }

  // ---- Step 2: Data overview ----
  log.info("douyin: Step 2 — navigate to data overview");
  try {
    helpers.navigate("https://creator.douyin.com/creator-micro/data/overview");
  } catch (e) { log.warn("douyin: nav timeout (ok):", e.message); }

  await helpers.sleep(3000);

  const dataText = await waitForContent(
    helpers,
    ["核心数据", "数据概览", "涨粉趋势", "作品数据", "净增粉丝"],
    60000,
    3000
  );

  if (dataText) {
    const flat = flattenSnapshot(dataText);
    log.info(`douyin: data flat (${flat.length} chars): ${flat.substring(0, 1000)}`);
    if (result.followers === 0) {
      result.followers = findMetric(dataText, ["粉丝总量", "粉丝数", "粉丝"], {
        log,
        excludePrefixes: ["新增", "净增", "昨日"],
      });
    }
    const views = findMetric(dataText, ["播放总量", "总播放量", "播放量"], {
      log,
      excludePrefixes: ["新增", "昨日"],
    });
    if (views > result.totalViews) result.totalViews = views;
    const likes = findMetric(dataText, ["总获赞", "获赞", "点赞量"], {
      log,
      excludePrefixes: ["新增", "昨日"],
    });
    if (likes > result.totalLikes) result.totalLikes = likes;
    if (result.totalComments === 0) result.totalComments = findMetric(dataText, ["评论量", "评论数", "评论"], log);
    if (result.totalShares === 0) result.totalShares = findMetric(dataText, ["转发量", "分享量", "分享"], log);
    if (result.contentCount === 0) result.contentCount = findMetric(dataText, ["作品数", "投稿数", "视频数"], log);
  }

  log.info(`douyin: result = ${JSON.stringify(result)}`);
  return result;
}

module.exports = { collect };
