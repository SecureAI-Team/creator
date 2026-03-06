/**
 * Toutiao (头条) publish script.
 *
 * Supports articles and video.
 * Uses OpenClaw ref-based browser automation.
 */

async function publish(content, helpers) {
  const log = helpers.log;
  const isVideo = content.contentType === "VIDEO";
  return isVideo
    ? await publishVideo(content, helpers)
    : await publishArticle(content, helpers);
}

async function publishArticle(content, helpers) {
  const log = helpers.log;
  try {
    log.info("toutiao: navigating to article editor");
    try { helpers.navigate("https://mp.toutiao.com/profile_v4/graphic/publish"); } catch (e) { log.warn("toutiao: nav timeout (ok):", e.message); }
    await helpers.sleep(5000);

    if (helpers.isLoginPage()) {
      return { success: false, error: "未登录头条号，请先登录" };
    }

    // Fill title (max 30 chars)
    const titleText = (content.title || "").substring(0, 30);
    if (titleText) {
      log.info("toutiao: filling article title");
      if (!helpers.findAndFill(["标题", "请输入文章标题", "文章标题"], titleText)) {
        helpers.findAndType(["标题", "请输入文章标题", "文章标题"], titleText);
      }
    }

    // Fill body
    if (content.body) {
      log.info("toutiao: filling article body");
      const snap = helpers.snapshotInteractive();
      const { ref } = helpers.findRefByTexts(snap, ["正文", "请输入正文", "编辑器"]);
      if (ref) {
        try { helpers.type(ref, content.body.substring(0, 30000)); } catch (e) { log.warn("toutiao: body type error:", e.message); }
      } else {
        log.warn("toutiao: could not find body editor");
      }
    }

    // Add tags (max 10)
    for (const tag of (content.tags || []).slice(0, 10)) {
      if (!helpers.findAndType(["标签", "添加标签", "话题"], tag)) break;
      helpers.press("Enter");
      await helpers.sleep(500);
    }

    try { helpers.screenshot(); } catch (e) { log.warn("toutiao: screenshot failed:", e.message); }

    log.info("toutiao: clicking publish button");
    if (!helpers.findAndClick(["发布", "发表文章"])) {
      return { success: false, error: "无法找到发布按钮" };
    }
    await helpers.sleep(5000);

    return { success: true, note: "头条文章发布流程已执行" };
  } catch (err) {
    return { success: false, error: `头条文章发布失败: ${err.message}` };
  }
}

async function publishVideo(content, helpers) {
  const log = helpers.log;
  try {
    log.info("toutiao: navigating to video upload");
    try { helpers.navigate("https://mp.toutiao.com/profile_v4/xigua/upload"); } catch (e) { log.warn("toutiao: nav timeout (ok):", e.message); }
    await helpers.sleep(5000);

    if (helpers.isLoginPage()) {
      return { success: false, error: "未登录头条号，请先登录" };
    }

    // Upload video
    if (content.mediaUrl) {
      log.info("toutiao: uploading video");
      try {
        helpers.upload(content.mediaUrl);
        await helpers.sleep(2000);
        helpers.findAndClick(["上传视频", "选择文件", "点击上传"]);
        await helpers.sleep(15000);
      } catch (e) { log.warn("toutiao: upload error:", e.message); }
    }

    // Fill title
    const titleText = (content.title || "").substring(0, 30);
    if (titleText) {
      log.info("toutiao: filling video title");
      if (!helpers.findAndFill(["标题", "视频标题"], titleText)) {
        helpers.findAndType(["标题", "视频标题"], titleText);
      }
    }

    // Add tags
    for (const tag of (content.tags || []).slice(0, 10)) {
      if (!helpers.findAndType(["标签", "添加标签", "话题"], tag)) break;
      helpers.press("Enter");
      await helpers.sleep(500);
    }

    try { helpers.screenshot(); } catch (e) { log.warn("toutiao: screenshot failed:", e.message); }

    log.info("toutiao: clicking publish button");
    if (!helpers.findAndClick(["发布", "发布视频"])) {
      return { success: false, error: "无法找到发布按钮" };
    }
    await helpers.sleep(5000);

    return { success: true, note: "头条视频发布流程已执行" };
  } catch (err) {
    return { success: false, error: `头条视频发布失败: ${err.message}` };
  }
}

module.exports = { publish };
