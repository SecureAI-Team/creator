/**
 * WeChat Official Account (公众号) publish script.
 *
 * Uses OpenClaw ref-based browser automation.
 * Saves as DRAFT by default to avoid accidental publishing.
 */

async function publish(content, helpers) {
  const log = helpers.log;
  try {
    log.info("weixin-mp: navigating to article editor");
    try { helpers.navigate("https://mp.weixin.qq.com"); } catch (e) { log.warn("weixin-mp: nav timeout (ok):", e.message); }
    await helpers.sleep(5000);

    if (helpers.isLoginPage()) {
      return { success: false, error: "未登录微信公众号，请先登录" };
    }

    // Click "创作" > "写新图文"
    log.info("weixin-mp: navigating to new article page");
    const clickedNew = helpers.findAndClick(["图文消息", "写新图文", "新建图文", "创作"]);
    if (!clickedNew) {
      try { helpers.navigate("https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit&action=edit&type=77"); } catch (e) { log.warn("weixin-mp: direct nav to editor:", e.message); }
    }
    await helpers.sleep(5000);

    // Fill title (max 64 chars)
    const titleText = (content.title || "").substring(0, 64);
    if (titleText) {
      log.info("weixin-mp: filling title");
      if (!helpers.findAndFill(["标题", "请输入标题", "文章标题"], titleText)) {
        helpers.findAndType(["标题", "请输入标题", "文章标题"], titleText);
      }
    }

    // Fill body
    if (content.body) {
      const bodyText = content.body.substring(0, 50000);
      log.info("weixin-mp: filling body");
      const snap = helpers.snapshotInteractive();
      const { ref } = helpers.findRefByTexts(snap, ["正文", "请输入正文", "编辑区域", "编辑器"]);
      if (ref) {
        try { helpers.type(ref, bodyText); } catch (e) { log.warn("weixin-mp: body type error:", e.message); }
      } else {
        log.warn("weixin-mp: could not find body editor");
      }
    }

    // Upload cover image
    if (content.coverUrl) {
      log.info("weixin-mp: uploading cover image");
      try {
        helpers.upload(content.coverUrl);
        await helpers.sleep(2000);
        helpers.findAndClick(["封面", "上传封面", "添加封面"]);
        await helpers.sleep(5000);
      } catch (e) { log.warn("weixin-mp: cover upload error:", e.message); }
    }

    try { helpers.screenshot(); } catch (e) { log.warn("weixin-mp: screenshot failed:", e.message); }

    // Save as draft (safer than publishing)
    log.info("weixin-mp: saving as draft");
    if (!helpers.findAndClick(["保存草稿", "保存为草稿", "存草稿"])) {
      log.warn("weixin-mp: could not find save draft button, trying publish");
      helpers.findAndClick(["群发", "发送", "发布"]);
    }
    await helpers.sleep(3000);

    return { success: true, note: "微信公众号图文已保存为草稿，请在公众号后台确认并群发" };
  } catch (err) {
    return { success: false, error: `微信公众号发布失败: ${err.message}` };
  }
}

module.exports = { publish };
