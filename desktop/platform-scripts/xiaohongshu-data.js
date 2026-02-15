/**
 * Xiaohongshu (小红书) creator dashboard data collector.
 *
 * Strategy: navigate to explicit URLs, don't fallback to open(),
 * poll with long waitForContent timeout.
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

  // ---- Step 1: Navigate to home ----
  try {
    helpers.navigate("https://creator.xiaohongshu.com/creator/home");
  } catch {}

  let homeText = await waitForContent(
    helpers,
    ["粉丝", "笔记", "创作者", "赞藏", "关注"],
    60000,
    3000
  );

  if (homeText) {
    result.followers = findMetric(homeText, ["粉丝数", "粉丝", "关注者"]);
    result.totalViews = findMetric(homeText, ["观看量", "阅读量", "曝光量", "曝光数", "浏览量"]);
    result.totalLikes = findMetric(homeText, ["点赞数", "赞藏量", "获赞与收藏", "获赞", "点赞"]);
    result.totalComments = findMetric(homeText, ["评论数", "评论量", "评论"]);
    result.totalShares = findMetric(homeText, ["分享数", "转发数", "分享"]);
    result.contentCount = findMetric(homeText, ["笔记数", "作品数", "笔记", "已发布"]);
  }

  // ---- Step 2: Navigate to data dashboard ----
  try {
    helpers.navigate("https://creator.xiaohongshu.com/creator/data");
  } catch {}

  const dataText = await waitForContent(
    helpers,
    ["曝光数", "观看数", "点赞数", "涨粉", "互动"],
    45000,
    3000
  );

  if (dataText) {
    if (result.followers === 0) result.followers = findMetric(dataText, ["粉丝数", "粉丝", "涨粉"]);
    if (result.totalViews === 0) result.totalViews = findMetric(dataText, ["观看数", "观看量", "曝光数", "曝光"]);
    if (result.totalLikes === 0) result.totalLikes = findMetric(dataText, ["点赞数", "赞藏", "获赞"]);
    if (result.totalComments === 0) result.totalComments = findMetric(dataText, ["评论数", "评论"]);
    if (result.totalShares === 0) result.totalShares = findMetric(dataText, ["分享数", "转发"]);
    if (result.contentCount === 0) result.contentCount = findMetric(dataText, ["笔记数", "作品数"]);
  }

  return result;
}

module.exports = { collect };
