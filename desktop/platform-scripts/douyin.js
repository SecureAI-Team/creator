/**
 * Douyin publish script.
 *
 * Uses OpenClaw ref-based browser automation.
 * All actions use snapshot refs, not CSS selectors.
 */

async function publish(content, helpers) {
  const log = helpers.log;
  try {
    log.info("douyin: navigating to upload page");
    try { helpers.navigate("https://creator.douyin.com/creator-micro/content/upload"); } catch (e) { log.warn("douyin: nav timeout (ok):", e.message); }
    await helpers.sleep(5000);

    if (helpers.isLoginPage()) {
      return { success: false, error: "未登录抖音，请先登录" };
    }

    // Upload video
    if (content.mediaUrl && content.contentType === "VIDEO") {
      log.info("douyin: uploading video file");
      try {
        helpers.upload(content.mediaUrl);
        await helpers.sleep(2000);
        const clicked = helpers.findAndClick(["上传视频", "选择文件", "点击上传", "拖拽上传"]);
        if (!clicked) log.warn("douyin: could not find upload trigger");
        await helpers.sleep(15000);
      } catch (e) { log.warn("douyin: upload error:", e.message); }
    }

    // Fill title/caption
    const titleText = (content.title || "").substring(0, 55);
    if (titleText) {
      log.info("douyin: filling title");
      if (!helpers.findAndFill(["标题", "作品标题", "添加作品描述"], titleText)) {
        helpers.findAndType(["标题", "作品标题", "添加作品描述"], titleText);
      }
    }

    // Add hashtags
    for (const tag of (content.tags || []).slice(0, 5)) {
      if (!helpers.findAndType(["话题", "添加话题", "#"], "#" + tag)) break;
      helpers.press("Enter");
      await helpers.sleep(500);
    }

    try { helpers.screenshot(); } catch (e) { log.warn("douyin: screenshot failed:", e.message); }

    log.info("douyin: clicking publish button");
    if (!helpers.findAndClick(["发布", "发布作品"])) {
      return { success: false, error: "无法找到发布按钮" };
    }
    await helpers.sleep(5000);

    return { success: true, note: "抖音发布流程已执行" };
  } catch (err) {
    return { success: false, error: `抖音发布失败: ${err.message}` };
  }
}

module.exports = { publish };
