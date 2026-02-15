/**
 * Kuaishou (快手) creator dashboard data collector.
 */

const { findMetric, flattenSnapshot, waitForContent } = require("./bilibili-data");

async function collect(helpers) {
  const result = {
    followers: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    contentCount: 0,
  };

  console.error("[collector:kuaishou] Step 1: navigate to home");

  try {
    helpers.navigate("https://cp.kuaishou.com");
  } catch {}

  await helpers.sleep(5000);

  let homeText = await waitForContent(
    helpers,
    ["粉丝", "播放", "作品", "创作者", "数据"],
    60000,
    3000
  );

  if (homeText) {
    const flat = flattenSnapshot(homeText);
    console.error(`[collector:kuaishou] home flat (first 500): ${flat.substring(0, 500)}`);
    result.followers = findMetric(homeText, ["粉丝数", "粉丝总数", "粉丝", "关注者"]);
    result.totalViews = findMetric(homeText, ["播放量", "总播放量", "播放", "展现量", "曝光"]);
    result.totalLikes = findMetric(homeText, ["点赞数", "获赞", "点赞", "赞"]);
    result.totalComments = findMetric(homeText, ["评论数", "评论量", "评论"]);
    result.totalShares = findMetric(homeText, ["分享数", "转发数", "分享"]);
    result.contentCount = findMetric(homeText, ["作品数", "视频数", "投稿数", "已发布"]);
  }

  // ---- Try data overview page ----
  console.error("[collector:kuaishou] Step 2: navigate to data");
  try {
    helpers.navigate("https://cp.kuaishou.com/article/publish/general-data");
  } catch {}

  await helpers.sleep(3000);

  const dataText = await waitForContent(
    helpers,
    ["粉丝", "播放", "数据"],
    30000,
    3000
  );
  if (dataText) {
    const flat = flattenSnapshot(dataText);
    console.error(`[collector:kuaishou] data flat (first 500): ${flat.substring(0, 500)}`);
    if (result.followers === 0) result.followers = findMetric(dataText, ["粉丝数", "粉丝", "关注"]);
    if (result.totalViews === 0) result.totalViews = findMetric(dataText, ["播放量", "总播放", "播放"]);
    if (result.totalLikes === 0) result.totalLikes = findMetric(dataText, ["点赞数", "获赞", "点赞"]);
    if (result.totalComments === 0) result.totalComments = findMetric(dataText, ["评论数", "评论"]);
    if (result.totalShares === 0) result.totalShares = findMetric(dataText, ["分享数", "分享"]);
    if (result.contentCount === 0) result.contentCount = findMetric(dataText, ["作品数", "视频数"]);
  }

  console.error(`[collector:kuaishou] result: ${JSON.stringify(result)}`);
  return result;
}

module.exports = { collect };
