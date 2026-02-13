/**
 * WeChat Official Account (微信公众号) creator dashboard data collector.
 *
 * Navigates to:
 *   1. https://mp.weixin.qq.com  (公众号后台首页)
 *   2. 数据分析 → 用户分析 (粉丝数据)
 *   3. 数据分析 → 内容分析 (阅读数据)
 *
 * WeChat MP backend is a traditional multi-page app with these key URLs:
 *   - Home: https://mp.weixin.qq.com
 *   - User analysis: https://mp.weixin.qq.com/cgi-bin/user_tag?action=get_all_data&lang=zh_CN&token=XXX
 *   - Content analysis: https://mp.weixin.qq.com/misc/appmsganalysis?...
 *
 * Since WeChat MP URLs require a session token parameter, we navigate
 * to the homepage first, then use link-clicking to reach data pages.
 *
 * Strategy: navigate to home → snapshot → look for data sidebar → click → snapshot → parse.
 */

const { parseChineseNumber, findMetric } = require("./bilibili-data");

/**
 * Collect data from WeChat Official Account dashboard.
 * @param {object} helpers - { navigate, open, snapshot, click, screenshot, sleep, ... }
 * @returns {Promise<{ followers, totalViews, totalLikes, totalComments, totalShares, contentCount, rawData }>}
 */
async function collect(helpers) {
  const result = {
    followers: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    contentCount: 0,
    rawData: {},
  };

  // ---- Step 1: Navigate to WeChat MP home ----
  try {
    helpers.navigate("https://mp.weixin.qq.com");
  } catch {
    helpers.open("https://mp.weixin.qq.com");
  }
  await helpers.sleep(5000);

  // ---- Step 2: Get home page snapshot ----
  let homeText = "";
  try {
    homeText = helpers.snapshot();
  } catch {
    await helpers.sleep(3000);
    try { homeText = helpers.snapshot(); } catch {}
  }

  if (homeText) {
    result.rawData.homeSnapshot = homeText.substring(0, 5000);

    // The home page often shows key metrics:
    // 新关注人数、取消关注人数、净增关注、累计关注
    // 昨日阅读量、昨日分享次数
    result.followers = findMetric(homeText, ["累计关注", "总关注", "粉丝总数", "关注人数"]);
    result.totalViews = findMetric(homeText, ["阅读量", "总阅读", "昨日阅读"]);

    // Also check for recent follower growth
    const newFollowers = findMetric(homeText, ["新增关注", "新关注", "净增关注"]);
    if (newFollowers > 0) {
      result.rawData.newFollowers = newFollowers;
    }
  }

  // ---- Step 3: Try to navigate to data analysis pages ----
  // WeChat MP sidebar usually has: 首页 > 内容与互动 > 数据分析
  try {
    // Try clicking the "数据分析" menu item
    try {
      helpers.click('a:has-text("数据分析")');
      await helpers.sleep(3000);
    } catch {
      // If direct click fails, try navigating via menu
      try {
        helpers.click('text="数据分析"');
        await helpers.sleep(3000);
      } catch {}
    }

    const dataText = helpers.snapshot();
    if (dataText) {
      result.rawData.dataSnapshot = dataText.substring(0, 5000);

      // Data analysis page shows:
      // 用户分析: 新增关注、取消关注、净增关注、累计关注
      // 图文分析: 送达人数、阅读次数、阅读人数、分享转发次数、微信收藏次数
      if (result.followers === 0) {
        result.followers = findMetric(dataText, ["累计关注", "总关注"]);
      }
      if (result.totalViews === 0) {
        result.totalViews = findMetric(dataText, ["阅读次数", "阅读人数", "总阅读"]);
      }
      result.totalShares = findMetric(dataText, ["分享转发", "转发次数", "分享次数"]);
      result.totalLikes = findMetric(dataText, ["点赞", "在看", "好看"]);
      result.totalComments = findMetric(dataText, ["评论", "留言"]);
    }
  } catch {
    // Non-critical navigation failures
  }

  // ---- Step 4: Try content management page for content count ----
  try {
    try {
      helpers.click('a:has-text("内容与互动")');
      await helpers.sleep(2000);
    } catch {
      try {
        helpers.click('text="图文消息"');
        await helpers.sleep(2000);
      } catch {}
    }

    const contentText = helpers.snapshot();
    if (contentText) {
      result.rawData.contentSnapshot = contentText.substring(0, 3000);
      // Look for total article count
      if (result.contentCount === 0) {
        result.contentCount = findMetric(contentText, ["共", "已发表", "已群发", "篇"]);
      }
    }
  } catch {}

  // ---- Step 5: Screenshot for debugging ----
  try {
    helpers.screenshot();
  } catch {}

  return result;
}

module.exports = { collect };
