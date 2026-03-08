/**
 * YouTube publish script (个人创作者).
 *
 * Uses OpenClaw ref-based browser automation on YouTube Studio.
 * Upload video, fill title/description/tags, set visibility, publish.
 */

async function publish(content, helpers) {
  const log = helpers.log;
  try {
    log.info("youtube: navigating to YouTube Studio");
    try {
      helpers.navigate("https://studio.youtube.com");
    } catch (e) {
      log.warn("youtube: nav timeout (ok):", e.message);
    }
    await helpers.sleep(6000);

    if (helpers.isLoginPage()) {
      return { success: false, error: "未登录 YouTube（请使用 Google 账号登录）" };
    }

    // Click Create / Upload
    log.info("youtube: looking for Create / Upload button");
    const uploadClicked = helpers.findAndClick(["Create", "Upload", "Upload videos", "上传", "创建"]);
    if (!uploadClicked) {
      return { success: false, error: "未找到「创建/上传」按钮，请确认已打开 YouTube 工作室" };
    }
    await helpers.sleep(3000);

    // Arm file upload then trigger file chooser
    if (content.mediaUrl) {
      log.info("youtube: uploading video file");
      try {
        helpers.upload(content.mediaUrl);
        await helpers.sleep(2000);
        const trigger = helpers.findAndClick(["Select files", "Select file", "选择文件", "Drag and drop", "上传"]);
        if (!trigger) log.warn("youtube: could not find upload trigger, file dialog may already be open");
        await helpers.sleep(15000);
      } catch (e) {
        log.warn("youtube: upload error:", e.message);
      }
    }

    // Title (YouTube allows up to 100 chars)
    const titleText = (content.title || "").substring(0, 100);
    if (titleText) {
      log.info("youtube: filling title");
      if (!helpers.findAndFill(["Add a title", "Title", "标题", "添加标题"], titleText)) {
        helpers.findAndType(["Add a title", "Title", "标题"], titleText);
      }
    }

    // Description
    if (content.body) {
      const desc = content.body.substring(0, 5000);
      log.info("youtube: filling description");
      if (!helpers.findAndFill(["Description", "Add a description", "描述", "说明"], desc)) {
        helpers.findAndType(["Description", "Add a description", "描述"], desc);
      }
    }

    // Tags (thumbnail / visibility may appear first; we try to add tags if visible)
    for (const tag of (content.tags || []).slice(0, 50)) {
      if (!helpers.findAndType(["Add tag", "Tags", "标签", "Add tags"], tag)) break;
      helpers.press("Enter");
      await helpers.sleep(400);
    }

    try {
      helpers.screenshot();
    } catch (e) {
      log.warn("youtube: screenshot failed:", e.message);
    }

    // Visibility: Public by default for 个人创作者
    const visibility = (content.visibility || "public").toLowerCase();
    if (visibility !== "public") {
      helpers.findAndClick(["Visibility", "可见性", "Unlisted", "Private", "不公开", "私享"]);
      await helpers.sleep(1000);
    }

    // Publish / Done
    log.info("youtube: clicking Publish / Done");
    if (!helpers.findAndClick(["Publish", "Done", "Next", "发布", "完成", "下一步"])) {
      return { success: false, error: "未找到「发布/完成」按钮，请手动在浏览器中完成发布" };
    }
    await helpers.sleep(5000);

    return { success: true, note: "YouTube 发布流程已执行，请在工作室中确认" };
  } catch (err) {
    return { success: false, error: `YouTube 发布失败: ${err.message}` };
  }
}

module.exports = { publish };
