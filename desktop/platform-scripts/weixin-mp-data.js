/**
 * WeChat Official Account (微信公众号) creator dashboard data collector.
 *
 * All key data is on the home page — no sub-page navigation needed.
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

  console.error("[collector:weixin-mp] Step 1: navigate to mp.weixin.qq.com");

  try {
    helpers.navigate("https://mp.weixin.qq.com");
  } catch {}

  await helpers.sleep(3000);

  let homeText = await waitForContent(
    helpers,
    ["公众号", "总用户", "原创", "阅读", "关注"],
    60000,
    3000
  );

  if (homeText) {
    const flat = flattenSnapshot(homeText);
    console.error(`[collector:weixin-mp] home flat (first 500): ${flat.substring(0, 500)}`);
    result.followers = findMetric(homeText, ["总用户数", "累计关注", "总关注"]);
    result.totalViews = findMetric(homeText, ["昨日阅读", "阅读量", "总阅读"]);
    result.totalShares = findMetric(homeText, ["昨日分享", "分享次数"]);
    result.contentCount = findMetric(homeText, ["原创内容", "已发表", "文章数"]);
    result.totalLikes = findMetric(homeText, ["点赞", "在看"]);
    result.totalComments = findMetric(homeText, ["评论", "留言"]);
  }

  console.error(`[collector:weixin-mp] result: ${JSON.stringify(result)}`);
  return result;
}

module.exports = { collect };
