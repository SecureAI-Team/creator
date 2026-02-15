/**
 * WeChat Official Account (微信公众号) creator dashboard data collector.
 *
 * All key data is on the home page — no sub-page navigation needed.
 * The dashboard shows: 总用户数, 昨日阅读, 昨日分享, 原创内容 count.
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

  log.info("weixin-mp: Step 1 — navigate to mp.weixin.qq.com");

  try {
    helpers.navigate("https://mp.weixin.qq.com");
  } catch {}

  await helpers.sleep(5000);

  // Use dashboard-specific keywords that won't match login pages or sidebars
  // "总用户数" only appears on the home dashboard
  // "首页" + "内容与数据" = MP dashboard sidebar
  let homeText = await waitForContent(
    helpers,
    ["总用户数", "昨日阅读", "原创内容", "数据概况", "内容与数据"],
    90000,
    3000
  );

  if (homeText) {
    const flat = flattenSnapshot(homeText);
    log.info(`weixin-mp: home flat (${flat.length} chars): ${flat.substring(0, 500)}`);

    // Check if we're on a login page instead of the dashboard
    if (flat.includes("扫码登录") || flat.includes("请使用微信扫描") || flat.includes("登录")) {
      log.warn("weixin-mp: detected login page, session may have expired");
      return result;
    }

    result.followers = findMetric(homeText, ["总用户数", "累计关注", "总关注", "关注人数"], log);
    result.totalViews = findMetric(homeText, ["昨日阅读", "阅读量", "总阅读"], log);
    result.totalShares = findMetric(homeText, ["昨日分享", "分享次数"], log);
    result.contentCount = findMetric(homeText, ["原创内容", "已发表", "文章数"], log);
    result.totalLikes = findMetric(homeText, ["点赞", "在看"], log);
    result.totalComments = findMetric(homeText, ["评论", "留言"], log);
  } else {
    log.warn("weixin-mp: waitForContent timeout — page may not have loaded or session expired");
  }

  log.info(`weixin-mp: result = ${JSON.stringify(result)}`);
  return result;
}

module.exports = { collect };
