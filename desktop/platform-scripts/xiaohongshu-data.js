/**
 * Xiaohongshu (小红书) creator dashboard data collector.
 *
 * Strategy:
 *   - Home page (/creator/home): get followers and contentCount from profile.
 *   - Data page (/creator/data): get engagement metrics.
 *   - DO NOT use followers from data page — it shows period "涨粉" not total.
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

  // ---- Step 1: Home page for profile metrics ----
  log.info("xiaohongshu: Step 1 — navigate to home");
  try {
    helpers.navigate("https://creator.xiaohongshu.com/creator/home");
  } catch (e) { log.warn("xiaohongshu: nav timeout (ok):", e.message); }

  await helpers.sleep(5000);

  let homeText = await waitForContent(
    helpers,
    ["粉丝数", "获赞与收藏", "笔记数", "创作者中心"],
    90000,
    3000
  );

  if (homeText) {
    if (isLoginSnapshot(homeText)) {
      log.warn("xiaohongshu: login page detected");
      return result;
    }
    const flat = flattenSnapshot(homeText);
    log.info(`xiaohongshu: home flat (${flat.length} chars): ${flat.substring(0, 1000)}`);
    // "粉丝数" is the total on home page — NOT generic "粉丝" which may match elsewhere
    result.followers = findMetric(homeText, ["粉丝数", "关注者"], log);
    result.totalLikes = findMetric(homeText, ["获赞与收藏", "赞藏量", "获赞", "点赞数"], log);
    result.totalComments = findMetric(homeText, ["评论数", "评论量"], log);
    result.totalShares = findMetric(homeText, ["分享数", "转发数"], log);
    result.contentCount = findMetric(homeText, ["笔记数", "作品数", "已发布"], log);
  }

  // ---- Step 2: Data dashboard for engagement ----
  log.info("xiaohongshu: Step 2 — navigate to data");
  try {
    helpers.navigate("https://creator.xiaohongshu.com/creator/data");
  } catch (e) { log.warn("xiaohongshu: nav timeout (ok):", e.message); }

  await helpers.sleep(3000);

  const dataText = await waitForContent(
    helpers,
    ["曝光数", "观看数", "互动数", "数据概览", "数据中心"],
    60000,
    3000
  );

  if (dataText) {
    const flat = flattenSnapshot(dataText);
    log.info(`xiaohongshu: data flat (${flat.length} chars): ${flat.substring(0, 1000)}`);
    // Engagement only from data page — DO NOT update followers
    if (result.totalViews === 0) {
      result.totalViews = findMetric(dataText, ["观看数", "观看量", "曝光数", "曝光量", "浏览量"], log);
    }
    if (result.totalLikes === 0) result.totalLikes = findMetric(dataText, ["点赞数", "赞藏", "获赞"], log);
    if (result.totalComments === 0) result.totalComments = findMetric(dataText, ["评论数", "评论"], log);
    if (result.totalShares === 0) result.totalShares = findMetric(dataText, ["分享数", "转发"], log);
    if (result.contentCount === 0) result.contentCount = findMetric(dataText, ["笔记数", "作品数"], log);
  }

  log.info(`xiaohongshu: result = ${JSON.stringify(result)}`);
  return result;
}

module.exports = { collect };
