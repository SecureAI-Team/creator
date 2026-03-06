/**
 * Kuaishou (快手) creator dashboard data collector.
 *
 * Strategy:
 *   1. Navigate to cp.kuaishou.com for overview.
 *   2. Navigate to general-data for detailed metrics.
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

  // ---- Step 1: Home overview ----
  log.info("kuaishou: Step 1 — navigate to home");
  try {
    helpers.navigate("https://cp.kuaishou.com");
  } catch (e) { log.warn("kuaishou: nav timeout (ok):", e.message); }

  await helpers.sleep(5000);

  let homeText = await waitForContent(
    helpers,
    ["粉丝", "播放", "作品", "创作者", "数据"],
    60000,
    3000
  );

  if (homeText) {
    if (isLoginSnapshot(homeText)) {
      log.warn("kuaishou: login page detected");
      return result;
    }
    const flat = flattenSnapshot(homeText);
    log.info(`kuaishou: home flat (${flat.length} chars): ${flat.substring(0, 1000)}`);
    result.followers = findMetric(homeText, ["粉丝总数", "粉丝数", "粉丝"], {
      log,
      excludePrefixes: ["新增", "昨日", "净增"],
    });
    result.totalViews = findMetric(homeText, ["总播放量", "播放量", "播放"], {
      log,
      excludePrefixes: ["新增", "昨日"],
    });
    result.totalLikes = findMetric(homeText, ["获赞总数", "点赞数", "获赞", "点赞"], {
      log,
      excludePrefixes: ["新增", "昨日"],
    });
    result.totalComments = findMetric(homeText, ["评论总数", "评论数", "评论"], log);
    result.totalShares = findMetric(homeText, ["分享总数", "分享数", "分享"], log);
    result.contentCount = findMetric(homeText, ["作品总数", "作品数", "视频数", "已发布"], log);
  }

  // ---- Step 2: Data overview page ----
  log.info("kuaishou: Step 2 — navigate to data");
  try {
    helpers.navigate("https://cp.kuaishou.com/article/publish/general-data");
  } catch (e) { log.warn("kuaishou: nav timeout (ok):", e.message); }

  await helpers.sleep(3000);

  const dataText = await waitForContent(
    helpers,
    ["粉丝", "播放", "数据", "概览"],
    30000,
    3000
  );

  if (dataText) {
    const flat = flattenSnapshot(dataText);
    log.info(`kuaishou: data flat (${flat.length} chars): ${flat.substring(0, 1000)}`);
    if (result.followers === 0) {
      result.followers = findMetric(dataText, ["粉丝总数", "粉丝数", "粉丝"], {
        log,
        excludePrefixes: ["新增", "昨日", "净增"],
      });
    }
    const views = findMetric(dataText, ["总播放量", "播放量", "播放"], {
      log,
      excludePrefixes: ["新增", "昨日"],
    });
    if (views > result.totalViews) result.totalViews = views;
    const likes = findMetric(dataText, ["获赞总数", "点赞数", "获赞", "点赞"], {
      log,
      excludePrefixes: ["新增", "昨日"],
    });
    if (likes > result.totalLikes) result.totalLikes = likes;
    if (result.totalComments === 0) result.totalComments = findMetric(dataText, ["评论数", "评论"], log);
    if (result.totalShares === 0) result.totalShares = findMetric(dataText, ["分享数", "分享"], log);
    if (result.contentCount === 0) result.contentCount = findMetric(dataText, ["作品数", "视频数"], log);
  }

  log.info(`kuaishou: result = ${JSON.stringify(result)}`);
  return result;
}

module.exports = { collect };
