/**
 * Bilibili publish script.
 *
 * Uses OpenClaw ref-based browser automation to publish video/article on bilibili.
 * All actions use snapshot refs (e.g. "e12"), not CSS selectors.
 */

async function publish(content, helpers) {
  const log = helpers.log;
  const isVideo = content.contentType === "VIDEO";
  return isVideo
    ? await publishVideo(content, helpers)
    : await publishArticle(content, helpers);
}

async function publishVideo(content, helpers) {
  const log = helpers.log;
  try {
    log.info("bilibili: navigating to video upload page");
    try { helpers.navigate("https://member.bilibili.com/platform/upload/video/frame"); } catch (e) { log.warn("bilibili: nav timeout (ok):", e.message); }
    await helpers.sleep(5000);

    if (helpers.isLoginPage()) {
      return { success: false, error: "未登录 bilibili，请先登录" };
    }

    // Upload video file (arm upload before clicking trigger)
    if (content.mediaUrl) {
      log.info("bilibili: uploading video file");
      try {
        helpers.upload(content.mediaUrl);
        await helpers.sleep(2000);
        // Click the upload area/button to trigger file chooser
        const clicked = helpers.findAndClick(["上传视频", "选择文件", "拖拽上传", "upload"]);
        if (!clicked) log.warn("bilibili: could not find upload trigger button");
        await helpers.sleep(15000);
      } catch (e) { log.warn("bilibili: upload error:", e.message); }
    }

    // Fill title
    const titleText = (content.title || "").substring(0, 80);
    if (titleText) {
      log.info("bilibili: filling title");
      if (!helpers.findAndFill(["标题", "视频标题", "title"], titleText)) {
        helpers.findAndType(["标题", "视频标题", "title"], titleText);
      }
    }

    // Fill description
    if (content.body) {
      const desc = content.body.substring(0, 2000);
      log.info("bilibili: filling description");
      if (!helpers.findAndType(["简介", "描述", "视频简介", "description"], desc)) {
        log.warn("bilibili: could not find description field");
      }
    }

    // Add tags
    for (const tag of (content.tags || []).slice(0, 12)) {
      if (!helpers.findAndType(["标签", "添加标签", "tag"], tag)) break;
      helpers.press("Enter");
      await helpers.sleep(500);
    }

    try { helpers.screenshot(); } catch (e) { log.warn("bilibili: screenshot failed:", e.message); }

    // Click publish
    log.info("bilibili: clicking publish button");
    if (!helpers.findAndClick(["投稿", "立即投稿", "发布"])) {
      return { success: false, error: "无法找到投稿/发布按钮" };
    }
    await helpers.sleep(5000);

    return { success: true, note: "B站视频发布流程已执行，请在创作中心确认" };
  } catch (err) {
    return { success: false, error: `bilibili 视频发布失败: ${err.message}` };
  }
}

async function publishArticle(content, helpers) {
  const log = helpers.log;
  try {
    log.info("bilibili: navigating to article editor");
    try { helpers.navigate("https://member.bilibili.com/platform/upload/text/edit"); } catch (e) { log.warn("bilibili: nav timeout (ok):", e.message); }
    await helpers.sleep(5000);

    if (helpers.isLoginPage()) {
      return { success: false, error: "未登录 bilibili，请先登录" };
    }

    const titleText = (content.title || "").substring(0, 80);
    if (titleText) {
      log.info("bilibili: filling article title");
      if (!helpers.findAndFill(["标题", "文章标题", "title"], titleText)) {
        helpers.findAndType(["标题", "文章标题", "title"], titleText);
      }
    }

    if (content.body) {
      log.info("bilibili: filling article body");
      // For rich text editors, find the editor area by snapshot ref
      const snap = helpers.snapshotInteractive();
      const { ref } = helpers.findRefByTexts(snap, ["编辑器", "正文", "请输入正文", "editor"]);
      if (ref) {
        try { helpers.type(ref, content.body.substring(0, 20000)); } catch (e) { log.warn("bilibili: body type error:", e.message); }
      } else {
        log.warn("bilibili: could not find body editor ref");
      }
    }

    try { helpers.screenshot(); } catch (e) { log.warn("bilibili: screenshot failed:", e.message); }

    log.info("bilibili: clicking publish button");
    if (!helpers.findAndClick(["发布", "提交", "投稿"])) {
      return { success: false, error: "无法找到发布按钮" };
    }
    await helpers.sleep(5000);

    return { success: true, note: "B站文章发布流程已执行" };
  } catch (err) {
    return { success: false, error: `bilibili 图文发布失败: ${err.message}` };
  }
}

module.exports = { publish };
