/**
 * Xiaohongshu publish script.
 *
 * Uses OpenClaw ref-based browser automation.
 * All actions use snapshot refs, not CSS selectors.
 */

async function publish(content, helpers) {
  const log = helpers.log;
  try {
    log.info("xiaohongshu: navigating to publish page");
    try { helpers.navigate("https://creator.xiaohongshu.com/publish/publish"); } catch (e) { log.warn("xiaohongshu: nav timeout (ok):", e.message); }
    await helpers.sleep(5000);

    if (helpers.isLoginPage()) {
      return { success: false, error: "未登录小红书，请先登录" };
    }

    // Upload media
    if (content.mediaUrl) {
      log.info("xiaohongshu: uploading media");
      try {
        helpers.upload(content.mediaUrl);
        await helpers.sleep(2000);
        const clicked = helpers.findAndClick(["上传", "选择文件", "拖拽上传", "添加图片", "添加视频"]);
        if (!clicked) log.warn("xiaohongshu: could not find upload trigger");
        await helpers.sleep(10000);
      } catch (e) { log.warn("xiaohongshu: upload error:", e.message); }
    }

    // Fill title (max 20 chars)
    const titleText = (content.title || "").substring(0, 20);
    if (titleText) {
      log.info("xiaohongshu: filling title");
      if (!helpers.findAndFill(["标题", "填写标题", "添加标题"], titleText)) {
        helpers.findAndType(["标题", "填写标题", "添加标题"], titleText);
      }
    }

    // Fill body (max 1000 chars)
    if (content.body) {
      const bodyText = content.body.substring(0, 1000);
      log.info("xiaohongshu: filling body");
      if (!helpers.findAndType(["正文", "添加正文", "输入正文", "描述"], bodyText)) {
        log.warn("xiaohongshu: could not find body field");
      }
    }

    // Add topic tags
    for (const tag of (content.tags || []).slice(0, 5)) {
      if (!helpers.findAndType(["话题", "添加话题", "#"], tag)) break;
      helpers.press("Enter");
      await helpers.sleep(500);
    }

    try { helpers.screenshot(); } catch (e) { log.warn("xiaohongshu: screenshot failed:", e.message); }

    log.info("xiaohongshu: clicking publish button");
    if (!helpers.findAndClick(["发布", "发布笔记"])) {
      return { success: false, error: "无法找到发布按钮" };
    }
    await helpers.sleep(5000);

    return { success: true, note: "小红书发布流程已执行" };
  } catch (err) {
    return { success: false, error: `小红书发布失败: ${err.message}` };
  }
}

module.exports = { publish };
