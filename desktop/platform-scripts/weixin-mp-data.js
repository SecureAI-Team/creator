/**
 * WeChat Official Account (微信公众号) creator dashboard data collector.
 *
 * Strategy:
 *   1. Navigate to mp.weixin.qq.com home dashboard for "总用户数" (total followers).
 *   2. Navigate to data analysis page for cumulative engagement metrics.
 *
 * IMPORTANT metric distinctions:
 *   - "总用户数" = total followers (cumulative)
 *   - "昨日阅读" = yesterday's reads (period metric, NOT total)
 *   - "昨日分享" = yesterday's shares (period metric, NOT total)
 *   - We prefer cumulative totals; period metrics are used as fallback only.
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

  // ---- Step 1: Home dashboard for total followers ----
  log.info("weixin-mp: Step 1 — navigate to home dashboard");
  try {
    helpers.navigate("https://mp.weixin.qq.com");
  } catch (e) { log.warn("weixin-mp: nav timeout (ok):", e.message); }

  await helpers.sleep(5000);

  let homeText = await waitForContent(
    helpers,
    ["总用户数", "数据概况", "内容与数据"],
    90000,
    3000
  );

  if (homeText) {
    const flat = flattenSnapshot(homeText);
    log.info(`weixin-mp: home flat (${flat.length} chars): ${flat.substring(0, 1000)}`);

    if (flat.includes("扫码登录") || flat.includes("请使用微信扫描")) {
      log.warn("weixin-mp: detected login page, session expired");
      return result;
    }

    result.followers = findMetric(homeText, ["总用户数", "累计关注", "总关注"], log);
    result.contentCount = findMetric(homeText, ["原创内容", "已发表", "文章数"], log);

    // Period metrics as FALLBACK — clearly labeled as "昨日" values
    const yesterdayViews = findMetric(homeText, ["昨日阅读"], log);
    const yesterdayShares = findMetric(homeText, ["昨日分享"], log);
    const yesterdayLikes = findMetric(homeText, ["昨日在看", "昨日点赞"], log);
    if (yesterdayViews > 0) {
      log.info(`weixin-mp: using 昨日阅读 ${yesterdayViews} as period fallback`);
      result.totalViews = yesterdayViews;
    }
    if (yesterdayShares > 0) result.totalShares = yesterdayShares;
    if (yesterdayLikes > 0) result.totalLikes = yesterdayLikes;
  } else {
    log.warn("weixin-mp: home page did not load — session may have expired");
  }

  // ---- Step 2: Data analysis for cumulative engagement ----
  log.info("weixin-mp: Step 2 — navigate to data analysis");
  try {
    // Try clicking "数据分析" in sidebar first
    const clicked = helpers.findAndClick(["数据分析", "内容分析", "图文分析"]);
    if (!clicked) {
      helpers.navigate("https://mp.weixin.qq.com/cgi-bin/misreporthome");
    }
  } catch (e) { log.warn("weixin-mp: data nav:", e.message); }

  await helpers.sleep(5000);

  const dataText = await waitForContent(
    helpers,
    ["累计", "总阅读", "图文分析", "数据分析"],
    30000,
    3000
  );

  if (dataText) {
    const flat = flattenSnapshot(dataText);
    log.info(`weixin-mp: data flat (${flat.length} chars): ${flat.substring(0, 1000)}`);

    // Prefer cumulative metrics over period values
    const totalViews = findMetric(dataText, ["总阅读", "累计阅读", "阅读总量"], {
      log,
      excludePrefixes: ["昨日", "今日", "新增"],
    });
    if (totalViews > result.totalViews) result.totalViews = totalViews;

    const totalLikes = findMetric(dataText, ["总在看", "累计在看", "累计点赞", "在看总量"], {
      log,
      excludePrefixes: ["昨日", "今日", "新增"],
    });
    if (totalLikes > result.totalLikes) result.totalLikes = totalLikes;

    const totalComments = findMetric(dataText, ["评论总量", "累计留言", "留言总量"], {
      log,
      excludePrefixes: ["昨日", "今日", "新增"],
    });
    if (totalComments > result.totalComments) result.totalComments = totalComments;

    const totalShares = findMetric(dataText, ["总分享", "累计分享", "分享总量"], {
      log,
      excludePrefixes: ["昨日", "今日", "新增"],
    });
    if (totalShares > result.totalShares) result.totalShares = totalShares;

    if (result.followers === 0) {
      result.followers = findMetric(dataText, ["总用户数", "累计关注", "粉丝总数"], log);
    }
  }

  log.info(`weixin-mp: result = ${JSON.stringify(result)}`);
  return result;
}

module.exports = { collect };
