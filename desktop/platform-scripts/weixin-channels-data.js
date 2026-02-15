/**
 * WeChat Channels (微信视频号) creator dashboard data collector.
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

  // ---- Step 1: Navigate to creator dashboard ----
  try {
    helpers.navigate("https://channels.weixin.qq.com/platform");
  } catch {}

  let homeText = await waitForContent(
    helpers,
    ["视频号", "关注者", "视频", "昨日", "创作", "数据"],
    60000,
    3000
  );

  if (homeText) {
    result.followers = findMetric(homeText, ["关注者", "粉丝数", "粉丝", "总关注"]);
    result.contentCount = findMetric(homeText, ["视频", "作品数", "作品", "已发布"]);
    result.totalViews = findMetric(homeText, ["新增播放", "播放量", "播放", "曝光"]);
    result.totalLikes = findMetric(homeText, ["新增点赞", "点赞数", "点赞", "获赞"]);
    result.totalComments = findMetric(homeText, ["新增评论", "评论数", "评论"]);
    result.totalShares = findMetric(homeText, ["新增分享", "分享数", "分享", "转发"]);
  }

  // ---- Step 2: Try data center for more detail ----
  try {
    const snap = homeText || helpers.snapshot();
    if (snap) {
      let clicked = false;
      for (const linkText of ["数据中心", "数据分析", "数据", "查看更多"]) {
        if (helpers.clickByText(snap, linkText)) {
          clicked = true;
          break;
        }
      }
      if (clicked) {
        await helpers.sleep(5000);
        const dataText = helpers.snapshot();
        if (dataText) {
          if (result.followers === 0) result.followers = findMetric(dataText, ["关注者", "粉丝", "总关注"]);
          if (result.totalViews === 0) result.totalViews = findMetric(dataText, ["播放量", "总播放", "播放"]);
          if (result.totalLikes === 0) result.totalLikes = findMetric(dataText, ["点赞量", "获赞", "点赞"]);
          if (result.totalComments === 0) result.totalComments = findMetric(dataText, ["评论量", "评论数", "评论"]);
          if (result.totalShares === 0) result.totalShares = findMetric(dataText, ["分享量", "分享数", "分享"]);
        }
      }
    }
  } catch {}

  return result;
}

module.exports = { collect };
