/**
 * Weibo publish script.
 *
 * Supports text posts and video.
 * Uses OpenClaw ref-based browser automation.
 */

async function publish(content, helpers) {
  const log = helpers.log;
  const isVideo = content.contentType === "VIDEO";
  return isVideo
    ? await publishVideo(content, helpers)
    : await publishPost(content, helpers);
}

async function publishPost(content, helpers) {
  const log = helpers.log;
  try {
    log.info("weibo: navigating to home page");
    try { helpers.navigate("https://weibo.com"); } catch (e) { log.warn("weibo: nav timeout (ok):", e.message); }
    await helpers.sleep(5000);

    if (helpers.isLoginPage()) {
      return { success: false, error: "未登录微博，请先登录" };
    }

    // Build post text: body + hashtags (max 2000 chars)
    const parts = [];
    if (content.body) parts.push(content.body);
    for (const tag of (content.tags || []).slice(0, 10)) {
      parts.push(`#${tag}#`);
    }
    const postText = parts.join(" ").substring(0, 2000);

    if (postText) {
      log.info("weibo: filling post text");
      if (!helpers.findAndType(["有什么新鲜事", "分享新鲜事", "写微博", "说说"], postText)) {
        helpers.findAndFill(["有什么新鲜事", "分享新鲜事", "写微博", "说说"], postText);
      }
    }

    // Upload image if provided
    if (content.coverUrl) {
      log.info("weibo: uploading image");
      try {
        helpers.upload(content.coverUrl);
        await helpers.sleep(2000);
        helpers.findAndClick(["图片", "上传图片", "添加图片"]);
        await helpers.sleep(5000);
      } catch (e) { log.warn("weibo: image upload error:", e.message); }
    }

    try { helpers.screenshot(); } catch (e) { log.warn("weibo: screenshot failed:", e.message); }

    log.info("weibo: clicking send button");
    if (!helpers.findAndClick(["发送", "发布"])) {
      return { success: false, error: "无法找到发送按钮" };
    }
    await helpers.sleep(5000);

    return { success: true, note: "微博发送流程已执行" };
  } catch (err) {
    return { success: false, error: `微博发布失败: ${err.message}` };
  }
}

async function publishVideo(content, helpers) {
  const log = helpers.log;
  try {
    log.info("weibo: navigating to video upload");
    try { helpers.navigate("https://weibo.com"); } catch (e) { log.warn("weibo: nav timeout (ok):", e.message); }
    await helpers.sleep(5000);

    if (helpers.isLoginPage()) {
      return { success: false, error: "未登录微博，请先登录" };
    }

    // Upload video
    if (content.mediaUrl) {
      log.info("weibo: uploading video");
      try {
        helpers.upload(content.mediaUrl);
        await helpers.sleep(2000);
        helpers.findAndClick(["视频", "上传视频"]);
        await helpers.sleep(15000);
      } catch (e) { log.warn("weibo: video upload error:", e.message); }
    }

    // Fill description
    const parts = [];
    if (content.body) parts.push(content.body);
    for (const tag of (content.tags || []).slice(0, 10)) {
      parts.push(`#${tag}#`);
    }
    const desc = parts.join(" ").substring(0, 2000);

    if (desc) {
      log.info("weibo: filling video description");
      if (!helpers.findAndType(["有什么新鲜事", "分享新鲜事", "写微博", "说说"], desc)) {
        log.warn("weibo: could not find text field");
      }
    }

    try { helpers.screenshot(); } catch (e) { log.warn("weibo: screenshot failed:", e.message); }

    log.info("weibo: clicking send button");
    if (!helpers.findAndClick(["发送", "发布"])) {
      return { success: false, error: "无法找到发送按钮" };
    }
    await helpers.sleep(5000);

    return { success: true, note: "微博视频发布流程已执行" };
  } catch (err) {
    return { success: false, error: `微博视频发布失败: ${err.message}` };
  }
}

module.exports = { publish };
