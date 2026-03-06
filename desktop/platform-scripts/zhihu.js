/**
 * Zhihu publish script.
 *
 * Supports articles (zhuanlan) and video.
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
    log.info("zhihu: navigating to article editor");
    try { helpers.navigate("https://zhuanlan.zhihu.com/write"); } catch (e) { log.warn("zhihu: nav timeout (ok):", e.message); }
    await helpers.sleep(5000);

    if (helpers.isLoginPage()) {
      return { success: false, error: "未登录知乎，请先登录" };
    }

    // Fill title (max 100 chars)
    const titleText = (content.title || "").substring(0, 100);
    if (titleText) {
      log.info("zhihu: filling article title");
      if (!helpers.findAndFill(["标题", "请输入标题", "文章标题"], titleText)) {
        helpers.findAndType(["标题", "请输入标题", "文章标题"], titleText);
      }
    }

    // Fill body in editor
    if (content.body) {
      log.info("zhihu: filling article body");
      const snap = helpers.snapshotInteractive();
      const { ref } = helpers.findRefByTexts(snap, ["正文", "请输入正文", "编辑器", "输入正文"]);
      if (ref) {
        try { helpers.type(ref, content.body.substring(0, 50000)); } catch (e) { log.warn("zhihu: body type error:", e.message); }
      } else {
        log.warn("zhihu: could not find body editor");
      }
    }

    // Add topic tags (max 5)
    for (const tag of (content.tags || []).slice(0, 5)) {
      if (!helpers.findAndType(["话题", "添加话题", "搜索话题"], tag)) break;
      await helpers.sleep(1000);
      helpers.press("Enter");
      await helpers.sleep(500);
    }

    try { helpers.screenshot(); } catch (e) { log.warn("zhihu: screenshot failed:", e.message); }

    log.info("zhihu: clicking publish button");
    if (!helpers.findAndClick(["发布", "发布文章"])) {
      return { success: false, error: "无法找到发布按钮" };
    }
    await helpers.sleep(5000);

    return { success: true, note: "知乎文章发布流程已执行" };
  } catch (err) {
    return { success: false, error: `知乎文章发布失败: ${err.message}` };
  }
}

async function publishVideo(content, helpers) {
  const log = helpers.log;
  try {
    log.info("zhihu: navigating to video upload page");
    try { helpers.navigate("https://www.zhihu.com/creator/video/upload"); } catch (e) { log.warn("zhihu: nav timeout (ok):", e.message); }
    await helpers.sleep(5000);

    if (helpers.isLoginPage()) {
      return { success: false, error: "未登录知乎，请先登录" };
    }

    // Upload video
    if (content.mediaUrl) {
      log.info("zhihu: uploading video");
      try {
        helpers.upload(content.mediaUrl);
        await helpers.sleep(2000);
        helpers.findAndClick(["上传视频", "选择文件", "点击上传"]);
        await helpers.sleep(15000);
      } catch (e) { log.warn("zhihu: upload error:", e.message); }
    }

    // Fill title and description
    const titleText = (content.title || "").substring(0, 100);
    if (titleText) {
      log.info("zhihu: filling video title");
      if (!helpers.findAndFill(["标题", "视频标题"], titleText)) {
        helpers.findAndType(["标题", "视频标题"], titleText);
      }
    }

    if (content.body) {
      log.info("zhihu: filling video description");
      if (!helpers.findAndType(["描述", "视频描述", "简介"], content.body.substring(0, 500))) {
        log.warn("zhihu: could not find description field");
      }
    }

    try { helpers.screenshot(); } catch (e) { log.warn("zhihu: screenshot failed:", e.message); }

    log.info("zhihu: clicking publish button");
    if (!helpers.findAndClick(["发布", "发布视频"])) {
      return { success: false, error: "无法找到发布按钮" };
    }
    await helpers.sleep(5000);

    return { success: true, note: "知乎视频发布流程已执行" };
  } catch (err) {
    return { success: false, error: `知乎视频发布失败: ${err.message}` };
  }
}

module.exports = { publish };
