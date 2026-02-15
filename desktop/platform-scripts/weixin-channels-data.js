/**
 * WeChat Channels (微信视频号) creator dashboard data collector.
 *
 * Strategy: navigate to channels platform, poll for content,
 * then try to click into data center for more detail.
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

  log.info("weixin-channels: Step 1 — navigate to platform");

  // ---- Step 1: Navigate to creator dashboard ----
  try {
    helpers.navigate("https://channels.weixin.qq.com/platform");
  } catch {}

  await helpers.sleep(5000);

  let homeText = await waitForContent(
    helpers,
    ["视频号", "关注者", "昨日数据", "创作者", "数据中心"],
    90000,
    3000
  );

  if (homeText) {
    const flat = flattenSnapshot(homeText);
    log.info(`weixin-channels: home flat (${flat.length} chars): ${flat.substring(0, 500)}`);
    result.followers = findMetric(homeText, ["关注者", "粉丝数", "粉丝", "总关注"], log);
    result.contentCount = findMetric(homeText, ["视频", "作品数", "作品", "已发布"], log);
    result.totalViews = findMetric(homeText, ["新增播放", "播放量", "播放", "曝光"], log);
    result.totalLikes = findMetric(homeText, ["新增点赞", "点赞数", "点赞", "获赞"], log);
    result.totalComments = findMetric(homeText, ["新增评论", "评论数", "评论"], log);
    result.totalShares = findMetric(homeText, ["新增分享", "分享数", "分享", "转发"], log);
  }

  // ---- Step 2: Try data center for more detail ----
  try {
    const snap = homeText || helpers.snapshot();
    if (snap) {
      let clicked = false;
      for (const linkText of ["数据中心", "数据分析", "数据", "查看更多"]) {
        if (helpers.clickByText(snap, linkText)) {
          clicked = true;
          log.info(`weixin-channels: Clicked "${linkText}"`);
          break;
        }
      }
      if (clicked) {
        await helpers.sleep(5000);
        const dataText = helpers.snapshot();
        if (dataText) {
          const flat = flattenSnapshot(dataText);
          log.info(`weixin-channels: data flat (${flat.length} chars): ${flat.substring(0, 500)}`);
          if (result.followers === 0) result.followers = findMetric(dataText, ["关注者", "粉丝", "总关注"], log);
          if (result.totalViews === 0) result.totalViews = findMetric(dataText, ["播放量", "总播放", "播放"], log);
          if (result.totalLikes === 0) result.totalLikes = findMetric(dataText, ["点赞量", "获赞", "点赞"], log);
          if (result.totalComments === 0) result.totalComments = findMetric(dataText, ["评论量", "评论数", "评论"], log);
          if (result.totalShares === 0) result.totalShares = findMetric(dataText, ["分享量", "分享数", "分享"], log);
        }
      }
    }
  } catch (err) {
    log.warn(`weixin-channels: data center click error: ${err.message}`);
  }

  log.info(`weixin-channels: result = ${JSON.stringify(result)}`);
  return result;
}

module.exports = { collect };
