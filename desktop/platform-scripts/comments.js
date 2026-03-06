/**
 * Cross-platform comment collection and reply.
 *
 * Collects recent comments from platform creator dashboards
 * and supports replying to individual comments via browser automation.
 */

const { flattenSnapshot, waitForContent } = require("./bilibili-data");

const COMMENT_PAGES = {
  bilibili: "https://member.bilibili.com/platform/comment",
  douyin: "https://creator.douyin.com/creator-micro/comment",
  xiaohongshu: "https://creator.xiaohongshu.com/comment",
  "weixin-mp": "https://mp.weixin.qq.com",
  "weixin-channels": "https://channels.weixin.qq.com/platform/comment",
  kuaishou: "https://cp.kuaishou.com/article/comment",
  zhihu: "https://www.zhihu.com/creator/comment",
  weibo: "https://weibo.com",
  toutiao: "https://mp.toutiao.com/profile_v4/weitoutiao/comment",
};

const COMMENT_KEYWORDS = {
  bilibili: ["评论", "回复", "互动", "弹幕"],
  douyin: ["评论", "回复", "互动管理"],
  xiaohongshu: ["评论", "回复", "互动"],
  "weixin-mp": ["留言", "评论", "回复"],
  "weixin-channels": ["评论", "回复", "互动"],
  kuaishou: ["评论", "回复", "互动"],
  zhihu: ["评论", "回复", "赞同"],
  weibo: ["评论", "回复", "转发"],
  toutiao: ["评论", "回复", "互动"],
};

/**
 * Parse comment-like entries from a flattened snapshot.
 * Looks for patterns: author text, comment body, timestamp, reply count.
 */
function parseCommentsFromSnapshot(snapshot) {
  if (!snapshot) return [];
  const flat = flattenSnapshot(snapshot);
  const comments = [];
  const lines = flat.split(/\s+/);

  const timeRegex = /\d{1,2}[:\-]\d{2}|\d+[分时天周]前|昨天|前天|\d{1,2}月\d{1,2}日/;
  let buffer = [];

  for (let i = 0; i < lines.length; i++) {
    const token = lines[i];
    if (timeRegex.test(token) && buffer.length > 1) {
      comments.push({
        author: buffer[0] || "unknown",
        body: buffer.slice(1).join(" "),
        time: token,
      });
      buffer = [];
    } else {
      buffer.push(token);
    }
  }

  return comments.slice(0, 50);
}

/**
 * Collect comments from a single platform.
 * @param {string} platform
 * @param {object} helpers
 * @returns {Promise<{ success: boolean, comments: Array, error?: string }>}
 */
async function collectComments(platform, helpers) {
  const log = helpers.log;
  const url = COMMENT_PAGES[platform];
  if (!url) {
    return { success: false, comments: [], error: `不支持 ${platform} 评论采集` };
  }

  log.info(`comments: collecting from ${platform}`);

  try {
    helpers.navigate(url);
  } catch {
    // timeout OK
  }

  await helpers.sleep(5000);

  const keywords = COMMENT_KEYWORDS[platform] || ["评论", "回复"];
  const snapshot = await waitForContent(helpers, keywords, 60000, 3000);

  if (!snapshot) {
    log.warn(`comments: no content found for ${platform}`);
    return { success: false, comments: [], error: `${platform} 评论页面未加载` };
  }

  const flat = flattenSnapshot(snapshot);
  log.info(`comments: ${platform} flat (${flat.length} chars): ${flat.substring(0, 300)}`);

  const comments = parseCommentsFromSnapshot(snapshot);
  log.info(`comments: ${platform} found ${comments.length} comment(s)`);

  return {
    success: true,
    comments: comments.map((c) => ({
      platform,
      author: c.author,
      body: c.body,
      time: c.time,
    })),
  };
}

/**
 * Reply to a comment on a specific platform.
 * @param {string} platform
 * @param {string} externalId - comment identifier or position hint
 * @param {string} replyBody
 * @param {object} helpers
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function replyToComment(platform, externalId, replyBody, helpers) {
  const log = helpers.log;
  const url = COMMENT_PAGES[platform];
  if (!url) {
    return { success: false, error: `不支持 ${platform} 评论回复` };
  }

  log.info(`comments: replying on ${platform}, id=${externalId}`);

  try {
    helpers.navigate(url);
  } catch {
    // timeout OK
  }
  await helpers.sleep(5000);

  const keywords = COMMENT_KEYWORDS[platform] || ["评论", "回复"];
  await waitForContent(helpers, keywords, 30000, 3000);

  // Click the "回复" button using ref-based interaction
  if (!helpers.findAndClick(["回复"])) {
    log.warn(`comments: could not find reply button on ${platform}`);
    return { success: false, error: "找不到回复按钮" };
  }
  await helpers.sleep(1500);

  // Type the reply into reply input
  if (!helpers.findAndType(["回复", "输入回复", "写回复", "请输入"], replyBody)) {
    log.warn(`comments: could not type reply on ${platform}`);
    return { success: false, error: "无法输入回复内容" };
  }

  await helpers.sleep(1000);

  // Submit the reply
  if (!helpers.findAndClick(["发送", "回复", "发布", "提交"])) {
    return { success: false, error: "无法提交回复" };
  }
  await helpers.sleep(3000);

  log.info(`comments: reply submitted on ${platform}`);
  return { success: true };
}

module.exports = {
  collectComments,
  replyToComment,
  parseCommentsFromSnapshot,
  COMMENT_PAGES,
};
