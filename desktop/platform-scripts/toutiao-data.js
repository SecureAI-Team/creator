/**
 * Toutiao (头条号) creator data collector.
 *
 * Strategy:
 *   1. Navigate to profile_v4/index for overview.
 *   2. Navigate to profile_v4/data/content for detailed engagement.
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

  // ---- Step 1: Profile overview ----
  log.info("toutiao: Step 1 — navigate to profile overview");
  try {
    helpers.navigate("https://mp.toutiao.com/profile_v4/index");
  } catch (e) { log.warn("toutiao: nav timeout (ok):", e.message); }

  await helpers.sleep(5000);

  const overviewText = await waitForContent(
    helpers,
    ["粉丝", "阅读", "头条号", "数据概览"],
    60000,
    3000
  );

  if (overviewText) {
    if (isLoginSnapshot(overviewText)) {
      log.warn("toutiao: login page detected");
      return result;
    }
    const flat = flattenSnapshot(overviewText);
    log.info(`toutiao: overview flat (${flat.length} chars): ${flat.substring(0, 1000)}`);
    result.followers = findMetric(overviewText, ["粉丝总数", "粉丝数", "粉丝"], {
      log,
      excludePrefixes: ["新增", "昨日", "净增"],
    });
    result.totalViews = findMetric(overviewText, ["总阅读量", "总阅读", "阅读量", "总播放", "播放量"], {
      log,
      excludePrefixes: ["昨日", "今日", "新增"],
    });
    result.totalLikes = findMetric(overviewText, ["总点赞", "点赞数", "获赞", "点赞"], {
      log,
      excludePrefixes: ["昨日", "今日", "新增"],
    });
    result.totalComments = findMetric(overviewText, ["评论总数", "评论数", "评论"], log);
    result.totalShares = findMetric(overviewText, ["转发总数", "转发数", "分享"], log);
    result.contentCount = findMetric(overviewText, ["内容总数", "内容数", "文章数", "视频数", "作品数"], log);
  }

  // ---- Step 2: Data content page ----
  log.info("toutiao: Step 2 — navigate to data analysis");
  try {
    helpers.navigate("https://mp.toutiao.com/profile_v4/data/content");
  } catch (e) { log.warn("toutiao: nav timeout (ok):", e.message); }

  await helpers.sleep(5000);

  const dataText = await waitForContent(
    helpers,
    ["数据分析", "阅读", "内容", "数据概览"],
    60000,
    3000
  );

  if (dataText) {
    const flat = flattenSnapshot(dataText);
    log.info(`toutiao: data flat (${flat.length} chars): ${flat.substring(0, 1000)}`);
    if (result.followers === 0) {
      result.followers = findMetric(dataText, ["粉丝总数", "粉丝数", "粉丝"], {
        log,
        excludePrefixes: ["新增", "昨日", "净增"],
      });
    }
    const views = findMetric(dataText, ["总阅读量", "总阅读", "阅读量", "总播放"], {
      log,
      excludePrefixes: ["昨日", "今日", "新增"],
    });
    if (views > result.totalViews) result.totalViews = views;
    const likes = findMetric(dataText, ["总点赞", "点赞数", "获赞"], {
      log,
      excludePrefixes: ["昨日", "今日", "新增"],
    });
    if (likes > result.totalLikes) result.totalLikes = likes;
    if (result.totalComments === 0) result.totalComments = findMetric(dataText, ["评论数", "评论"], log);
    if (result.totalShares === 0) result.totalShares = findMetric(dataText, ["转发数", "分享"], log);
    if (result.contentCount === 0) result.contentCount = findMetric(dataText, ["内容数", "文章数", "视频数", "作品数"], log);
  }

  log.info(`toutiao: result = ${JSON.stringify(result)}`);
  return result;
}

module.exports = { collect };
