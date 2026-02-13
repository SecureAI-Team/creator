/**
 * Douyin publish script.
 * Uses OpenClaw browser CLI helpers.
 */

async function publish(content, helpers) {
  try {
    helpers.navigate("https://creator.douyin.com/creator-micro/content/upload");
    await helpers.sleep(5000);

    if (content.mediaUrl && content.contentType === "VIDEO") {
      try {
        helpers.upload('input[type="file"]', content.mediaUrl);
        await helpers.sleep(15000);
      } catch {}
    }

    const titleText = content.title.substring(0, 55);
    try {
      helpers.fill('input[placeholder*="标题"], [class*="caption"] [contenteditable="true"]', titleText);
    } catch {
      try { helpers.type('[contenteditable="true"]', titleText); } catch {}
    }

    for (const tag of (content.tags || []).slice(0, 5)) {
      try {
        helpers.type('[class*="tag"] input, [class*="hashtag"] input', "#" + tag);
        helpers.exec("press Enter");
        await helpers.sleep(500);
      } catch { break; }
    }

    try { helpers.screenshot(); } catch {}

    try {
      helpers.click('button:has-text("发布"), [class*="publish"], [class*="submit"]');
      await helpers.sleep(5000);
    } catch {
      return { success: false, error: "无法找到发布按钮" };
    }

    return { success: true, note: "抖音发布流程已执行" };
  } catch (err) {
    return { success: false, error: `抖音发布失败: ${err.message}` };
  }
}

module.exports = { publish };
