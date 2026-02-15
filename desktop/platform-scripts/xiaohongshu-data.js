/**
 * Xiaohongshu (小红书) creator dashboard data collector.
 *
 * Strategy:
 *   - Home page (/creator/home): get followers, contentCount from profile section.
 *   - Data page (/creator/data): get engagement metrics (views, likes, comments, shares).
 *   - DO NOT override followers from data page — it shows period metrics (涨粉)
 *     not total followers, and numbers near "粉丝" on data page are misleading.
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

  log.info("xiaohongshu: Step 1 — navigate to home");

  // ---- Step 1: Navigate to home ----
  try {
    helpers.navigate("https://creator.xiaohongshu.com/creator/home");
  } catch {}

  await helpers.sleep(5000);

  // Use specific home page keywords to avoid matching on stale content
  let homeText = await waitForContent(
    helpers,
    ["粉丝数", "获赞与收藏", "笔记数", "创作者中心"],
    90000,
    3000
  );

  if (homeText) {
    const flat = flattenSnapshot(homeText);
    log.info(`xiaohongshu: home flat (${flat.length} chars): ${flat.substring(0, 500)}`);
    // Use "粉丝数" (specific label on home page) — NOT generic "粉丝"
    result.followers = findMetric(homeText, ["粉丝数", "关注者"], log);
    result.totalLikes = findMetric(homeText, ["获赞与收藏", "赞藏量", "获赞", "点赞数"], log);
    result.totalComments = findMetric(homeText, ["评论数", "评论量", "评论"], log);
    result.totalShares = findMetric(homeText, ["分享数", "转发数", "分享"], log);
    result.contentCount = findMetric(homeText, ["笔记数", "作品数", "笔记", "已发布"], log);
  }

  // ---- Step 2: Navigate to data dashboard ----
  log.info("xiaohongshu: Step 2 — navigate to data");
  try {
    helpers.navigate("https://creator.xiaohongshu.com/creator/data");
  } catch {}

  await helpers.sleep(3000);

  const dataText = await waitForContent(
    helpers,
    ["曝光数", "观看数", "互动数", "数据概览", "数据中心"],
    60000,
    3000
  );

  if (dataText) {
    const flat = flattenSnapshot(dataText);
    log.info(`xiaohongshu: data flat (${flat.length} chars): ${flat.substring(0, 500)}`);
    // Only get engagement metrics from data page, NOT followers
    if (result.totalViews === 0) result.totalViews = findMetric(dataText, ["观看数", "观看量", "曝光数", "曝光量", "浏览量", "阅读量"], log);
    if (result.totalLikes === 0) result.totalLikes = findMetric(dataText, ["点赞数", "赞藏", "获赞"], log);
    if (result.totalComments === 0) result.totalComments = findMetric(dataText, ["评论数", "评论"], log);
    if (result.totalShares === 0) result.totalShares = findMetric(dataText, ["分享数", "转发"], log);
    if (result.contentCount === 0) result.contentCount = findMetric(dataText, ["笔记数", "作品数"], log);
  }

  log.info(`xiaohongshu: result = ${JSON.stringify(result)}`);
  return result;
}

module.exports = { collect };
