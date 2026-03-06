/**
 * WeChat Channels (微信视频号) creator dashboard data collector.
 *
 * Strategy:
 *   1. Navigate to channels.weixin.qq.com/platform for dashboard overview.
 *   2. Try to reach data center for cumulative metrics.
 *
 * IMPORTANT metric distinctions:
 *   - "关注者" = total followers (cumulative)
 *   - "新增播放"/"新增点赞"/"新增评论"/"新增分享" = period deltas, NOT totals
 *   - We prefer cumulative totals; period deltas are used as fallback with clear logging.
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

  // ---- Step 1: Creator dashboard overview ----
  log.info("weixin-channels: Step 1 — navigate to platform dashboard");
  try {
    helpers.navigate("https://channels.weixin.qq.com/platform");
  } catch (e) { log.warn("weixin-channels: nav timeout (ok):", e.message); }

  await helpers.sleep(5000);

  let homeText = await waitForContent(
    helpers,
    ["关注者", "昨日数据", "创作者", "数据中心"],
    90000,
    3000
  );

  if (homeText) {
    const flat = flattenSnapshot(homeText);
    log.info(`weixin-channels: home flat (${flat.length} chars): ${flat.substring(0, 1000)}`);

    // Followers: "关注者" is total (cumulative)
    result.followers = findMetric(homeText, ["关注者", "粉丝总数", "粉丝数"], {
      log,
      excludePrefixes: ["新增", "昨日"],
    });

    result.contentCount = findMetric(homeText, ["作品数", "视频数", "已发布", "作品"], {
      log,
      excludePrefixes: ["新增"],
    });

    // Period deltas as fallback — "新增播放" means "new plays" (period metric)
    const newPlays = findMetric(homeText, ["新增播放"], log);
    const newLikes = findMetric(homeText, ["新增点赞"], log);
    const newComments = findMetric(homeText, ["新增评论"], log);
    const newShares = findMetric(homeText, ["新增分享"], log);

    if (newPlays > 0) {
      log.info(`weixin-channels: using 新增播放 ${newPlays} as period fallback`);
      result.totalViews = newPlays;
    }
    if (newLikes > 0) result.totalLikes = newLikes;
    if (newComments > 0) result.totalComments = newComments;
    if (newShares > 0) result.totalShares = newShares;
  }

  // ---- Step 2: Navigate to data center for cumulative totals ----
  log.info("weixin-channels: Step 2 — navigate to data center");
  try {
    const clicked = helpers.findAndClick(["数据中心", "数据分析", "查看更多"]);
    if (!clicked) {
      helpers.navigate("https://channels.weixin.qq.com/platform/data");
    }
  } catch (e) { log.warn("weixin-channels: data nav:", e.message); }

  await helpers.sleep(5000);

  const dataText = await waitForContent(
    helpers,
    ["播放量", "点赞量", "数据概览", "数据趋势"],
    30000,
    3000
  );

  if (dataText) {
    const flat = flattenSnapshot(dataText);
    log.info(`weixin-channels: data flat (${flat.length} chars): ${flat.substring(0, 1000)}`);

    // Prefer cumulative totals from data center
    const views = findMetric(dataText, ["总播放量", "累计播放", "播放量"], {
      log,
      excludePrefixes: ["新增", "昨日", "今日"],
    });
    if (views > result.totalViews) result.totalViews = views;

    const likes = findMetric(dataText, ["总点赞量", "累计点赞", "点赞量", "获赞"], {
      log,
      excludePrefixes: ["新增", "昨日", "今日"],
    });
    if (likes > result.totalLikes) result.totalLikes = likes;

    const comments = findMetric(dataText, ["总评论量", "累计评论", "评论量"], {
      log,
      excludePrefixes: ["新增", "昨日", "今日"],
    });
    if (comments > result.totalComments) result.totalComments = comments;

    const shares = findMetric(dataText, ["总分享量", "累计分享", "分享量"], {
      log,
      excludePrefixes: ["新增", "昨日", "今日"],
    });
    if (shares > result.totalShares) result.totalShares = shares;

    if (result.followers === 0) {
      result.followers = findMetric(dataText, ["关注者", "粉丝总数", "粉丝"], {
        log,
        excludePrefixes: ["新增", "昨日"],
      });
    }
  }

  log.info(`weixin-channels: result = ${JSON.stringify(result)}`);
  return result;
}

module.exports = { collect };
