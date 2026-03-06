/**
 * Kuaishou publish script.
 *
 * Uses OpenClaw ref-based browser automation.
 */

async function publish(content, helpers) {
  const log = helpers.log;
  try {
    log.info("kuaishou: navigating to video upload page");
    try { helpers.navigate("https://cp.kuaishou.com/article/publish/video"); } catch (e) { log.warn("kuaishou: nav timeout (ok):", e.message); }
    await helpers.sleep(5000);

    if (helpers.isLoginPage()) {
      return { success: false, error: "未登录快手，请先登录" };
    }

    // Upload video
    if (content.mediaUrl) {
      log.info("kuaishou: uploading video");
      try {
        helpers.upload(content.mediaUrl);
        await helpers.sleep(2000);
        const clicked = helpers.findAndClick(["上传视频", "选择文件", "点击上传"]);
        if (!clicked) log.warn("kuaishou: could not find upload trigger");
        await helpers.sleep(15000);
      } catch (e) { log.warn("kuaishou: upload error:", e.message); }
    }

    // Fill description (combined title + body + tags, max 500 chars)
    const parts = [];
    if (content.title) parts.push(content.title);
    if (content.body) parts.push(content.body);
    for (const tag of (content.tags || []).slice(0, 10)) {
      parts.push(`#${tag}`);
    }
    const desc = parts.join("\n").substring(0, 500);
    if (desc) {
      log.info("kuaishou: filling description");
      if (!helpers.findAndType(["作品描述", "添加描述", "描述", "说点什么"], desc)) {
        helpers.findAndFill(["作品描述", "添加描述", "描述", "说点什么"], desc);
      }
    }

    try { helpers.screenshot(); } catch (e) { log.warn("kuaishou: screenshot failed:", e.message); }

    log.info("kuaishou: clicking publish button");
    if (!helpers.findAndClick(["发布", "发布作品"])) {
      return { success: false, error: "无法找到发布按钮" };
    }
    await helpers.sleep(5000);

    return { success: true, note: "快手视频发布流程已执行" };
  } catch (err) {
    return { success: false, error: `快手发布失败: ${err.message}` };
  }
}

module.exports = { publish };
