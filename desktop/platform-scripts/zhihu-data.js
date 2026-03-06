/**
 * Zhihu (知乎) creator dashboard data collector.
 *
 * Strategy:
 *   1. Navigate to /creator for overview.
 *   2. Try sidebar "内容分析" for detailed engagement.
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

  // ---- Step 1: Creator overview ----
  log.info("zhihu: Step 1 — navigate to creator");
  try {
    helpers.navigate("https://www.zhihu.com/creator");
  } catch (e) { log.warn("zhihu: nav timeout (ok):", e.message); }

  await helpers.sleep(5000);

  let homeText = await waitForContent(
    helpers,
    ["创作者", "关注者", "阅读", "赞同", "回答"],
    60000,
    3000
  );

  if (homeText) {
    if (isLoginSnapshot(homeText)) {
      log.warn("zhihu: login page detected");
      return result;
    }
    const flat = flattenSnapshot(homeText);
    log.info(`zhihu: home flat (${flat.length} chars): ${flat.substring(0, 1000)}`);
    result.followers = findMetric(homeText, ["关注者", "粉丝总数", "粉丝数", "粉丝"], {
      log,
      excludePrefixes: ["新增", "昨日", "净增"],
    });
    result.totalViews = findMetric(homeText, ["总阅读量", "阅读量", "总阅读", "浏览量"], {
      log,
      excludePrefixes: ["昨日", "今日"],
    });
    result.totalLikes = findMetric(homeText, ["总赞同", "赞同数", "获赞", "赞同"], {
      log,
      excludePrefixes: ["昨日", "今日"],
    });
    result.totalComments = findMetric(homeText, ["评论总数", "评论数", "评论"], log);
    result.totalShares = findMetric(homeText, ["收藏总数", "收藏数", "分享数", "收藏"], log);
    result.contentCount = findMetric(homeText, ["内容总数", "内容数", "回答数", "文章数", "创作数"], log);
  }

  // ---- Step 2: Try sidebar click to "内容分析" ----
  log.info("zhihu: Step 2 — try data analysis page");
  try {
    const clicked = helpers.findAndClick(["内容分析", "数据分析", "创作数据"]);
    if (clicked) {
      await helpers.sleep(5000);
      const dataText = await waitForContent(helpers, ["阅读", "赞同", "数据"], 30000, 3000);
      if (dataText) {
        const flat = flattenSnapshot(dataText);
        log.info(`zhihu: data flat (${flat.length} chars): ${flat.substring(0, 1000)}`);
        if (result.followers === 0) result.followers = findMetric(dataText, ["关注者", "粉丝", "总关注"], log);
        const views = findMetric(dataText, ["总阅读", "阅读量", "浏览"], log);
        if (views > result.totalViews) result.totalViews = views;
        const likes = findMetric(dataText, ["总赞同", "赞同", "获赞"], log);
        if (likes > result.totalLikes) result.totalLikes = likes;
        if (result.totalComments === 0) result.totalComments = findMetric(dataText, ["评论数", "评论"], log);
        if (result.contentCount === 0) result.contentCount = findMetric(dataText, ["内容数", "回答数", "文章数"], log);
      }
    }
  } catch (err) {
    log.warn(`zhihu: data click error: ${err.message}`);
  }

  log.info(`zhihu: result = ${JSON.stringify(result)}`);
  return result;
}

module.exports = { collect };
