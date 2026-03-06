/**
 * Weibo (微博) creator data collector.
 *
 * Strategy:
 *   1. Navigate to user profile page for followers and contentCount.
 *   2. Navigate to home for engagement metrics.
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

  // ---- Step 1: Profile/follow page for followers ----
  log.info("weibo: Step 1 — navigate to follow page");
  try {
    helpers.navigate("https://weibo.com/u/page/follow");
  } catch (e) { log.warn("weibo: nav timeout (ok):", e.message); }

  await helpers.sleep(5000);

  const followText = await waitForContent(
    helpers,
    ["粉丝", "关注", "微博"],
    60000,
    3000
  );

  if (followText) {
    if (isLoginSnapshot(followText)) {
      log.warn("weibo: login page detected");
      return result;
    }
    const flat = flattenSnapshot(followText);
    log.info(`weibo: follow flat (${flat.length} chars): ${flat.substring(0, 1000)}`);
    result.followers = findMetric(followText, ["粉丝", "粉丝数"], log);
    result.contentCount = findMetric(followText, ["微博", "微博数"], log);
  }

  // ---- Step 2: Home page for engagement ----
  log.info("weibo: Step 2 — navigate to home");
  try {
    helpers.navigate("https://weibo.com");
  } catch (e) { log.warn("weibo: nav timeout (ok):", e.message); }

  await helpers.sleep(5000);

  const homeText = await waitForContent(
    helpers,
    ["粉丝", "微博", "阅读", "点赞"],
    60000,
    3000
  );

  if (homeText) {
    const flat = flattenSnapshot(homeText);
    log.info(`weibo: home flat (${flat.length} chars): ${flat.substring(0, 1000)}`);
    if (result.followers === 0) result.followers = findMetric(homeText, ["粉丝", "粉丝数"], log);
    if (result.contentCount === 0) result.contentCount = findMetric(homeText, ["微博", "微博数"], log);
    result.totalViews = findMetric(homeText, ["阅读量", "阅读", "总阅读"], {
      log,
      excludePrefixes: ["昨日", "今日"],
    });
    result.totalLikes = findMetric(homeText, ["点赞数", "点赞", "获赞"], {
      log,
      excludePrefixes: ["昨日", "今日"],
    });
    result.totalComments = findMetric(homeText, ["评论数", "评论"], log);
    result.totalShares = findMetric(homeText, ["转发数", "转发", "分享"], log);
  }

  log.info(`weibo: result = ${JSON.stringify(result)}`);
  return result;
}

module.exports = { collect };
