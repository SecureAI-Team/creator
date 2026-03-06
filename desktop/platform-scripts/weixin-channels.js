/**
 * WeChat Channels (视频号) publish script.
 *
 * Uses OpenClaw ref-based browser automation.
 */

async function publish(content, helpers) {
  const log = helpers.log;
  try {
    log.info("weixin-channels: navigating to video upload page");
    try { helpers.navigate("https://channels.weixin.qq.com/platform/post/create"); } catch (e) { log.warn("weixin-channels: nav timeout (ok):", e.message); }
    await helpers.sleep(5000);

    if (helpers.isLoginPage()) {
      return { success: false, error: "未登录微信视频号，请先登录" };
    }

    // Upload video
    if (content.mediaUrl) {
      log.info("weixin-channels: uploading video");
      try {
        helpers.upload(content.mediaUrl);
        await helpers.sleep(2000);
        const clicked = helpers.findAndClick(["上传视频", "选择文件", "点击上传"]);
        if (!clicked) log.warn("weixin-channels: could not find upload trigger");
        await helpers.sleep(15000);
      } catch (e) { log.warn("weixin-channels: upload error:", e.message); }
    }

    // Fill description (combined title + body, max 1000 chars)
    const desc = [content.title, content.body].filter(Boolean).join("\n").substring(0, 1000);
    if (desc) {
      log.info("weixin-channels: filling description");
      if (!helpers.findAndType(["描述", "添加描述", "说点什么", "输入描述"], desc)) {
        helpers.findAndFill(["描述", "添加描述", "说点什么", "输入描述"], desc);
      }
    }

    // Add topics
    for (const tag of (content.tags || []).slice(0, 5)) {
      const clicked = helpers.findAndClick(["话题", "添加话题", "#"]);
      if (!clicked) break;
      await helpers.sleep(500);
      // Type tag name in the topic search
      const snap = helpers.snapshotInteractive();
      const { ref } = helpers.findRefByTexts(snap, ["搜索话题", "输入话题", "话题"]);
      if (ref) {
        try {
          helpers.type(ref, tag);
          await helpers.sleep(1000);
          helpers.press("Enter");
          await helpers.sleep(500);
        } catch (e) { log.warn("weixin-channels: tag error:", e.message); }
      }
    }

    try { helpers.screenshot(); } catch (e) { log.warn("weixin-channels: screenshot failed:", e.message); }

    log.info("weixin-channels: clicking publish button");
    if (!helpers.findAndClick(["发表", "发布"])) {
      return { success: false, error: "无法找到发表按钮" };
    }
    await helpers.sleep(5000);

    return { success: true, note: "微信视频号发布流程已执行" };
  } catch (err) {
    return { success: false, error: `微信视频号发布失败: ${err.message}` };
  }
}

module.exports = { publish };
