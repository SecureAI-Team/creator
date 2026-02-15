/**
 * Zhihu (知乎) creator dashboard data collector.
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

  log.info("zhihu: Step 1 — navigate to creator");

  try {
    helpers.navigate("https://www.zhihu.com/creator");
  } catch {}

  await helpers.sleep(5000);

  let homeText = await waitForContent(
    helpers,
    ["创作者", "关注者", "阅读", "赞同", "回答"],
    60000,
    3000
  );

  if (homeText) {
    const flat = flattenSnapshot(homeText);
    log.info(`zhihu: home flat (${flat.length} chars): ${flat.substring(0, 500)}`);
    result.followers = findMetric(homeText, ["关注者", "粉丝数", "粉丝", "总关注"], log);
    result.totalViews = findMetric(homeText, ["阅读量", "总阅读", "浏览量", "展示次数"], log);
    result.totalLikes = findMetric(homeText, ["赞同数", "获赞", "赞同", "点赞数"], log);
    result.totalComments = findMetric(homeText, ["评论数", "评论量", "评论"], log);
    result.totalShares = findMetric(homeText, ["分享数", "转发数", "收藏数", "收藏"], log);
    result.contentCount = findMetric(homeText, ["内容数", "回答数", "文章数", "创作数"], log);
  }

  // ---- Try data page via sidebar click ----
  try {
    const snap = helpers.snapshot();
    if (snap) {
      let clicked = false;
      for (const linkText of ["内容分析", "数据分析", "创作数据", "数据"]) {
        if (helpers.clickByText(snap, linkText)) {
          clicked = true;
          log.info(`zhihu: Clicked "${linkText}"`);
          break;
        }
      }
      if (clicked) {
        await helpers.sleep(5000);
        const dataText = helpers.snapshot();
        if (dataText) {
          const flat = flattenSnapshot(dataText);
          log.info(`zhihu: data flat (${flat.length} chars): ${flat.substring(0, 500)}`);
          if (result.followers === 0) result.followers = findMetric(dataText, ["关注者", "粉丝", "总关注"], log);
          if (result.totalViews === 0) result.totalViews = findMetric(dataText, ["阅读量", "总阅读", "浏览"], log);
          if (result.totalLikes === 0) result.totalLikes = findMetric(dataText, ["赞同", "获赞", "点赞"], log);
          if (result.totalComments === 0) result.totalComments = findMetric(dataText, ["评论数", "评论"], log);
          if (result.contentCount === 0) result.contentCount = findMetric(dataText, ["内容数", "回答数", "文章数"], log);
        }
      }
    }
  } catch (err) {
    log.warn(`zhihu: data click error: ${err.message}`);
  }

  log.info(`zhihu: result = ${JSON.stringify(result)}`);
  return result;
}

module.exports = { collect };
