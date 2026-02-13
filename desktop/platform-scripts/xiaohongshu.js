/**
 * Xiaohongshu publish script.
 * Uses OpenClaw browser CLI helpers.
 */

async function publish(content, helpers) {
  try {
    helpers.navigate("https://creator.xiaohongshu.com/publish/publish");
    await helpers.sleep(5000);

    if (content.mediaUrl) {
      try {
        helpers.upload('input[type="file"]', content.mediaUrl);
        await helpers.sleep(10000);
      } catch {}
    }

    const titleText = content.title.substring(0, 20);
    try {
      helpers.fill('input[placeholder*="标题"], [class*="title"] input', titleText);
    } catch {
      try { helpers.type('[class*="title"] [contenteditable="true"]', titleText); } catch {}
    }

    if (content.body) {
      const bodyText = content.body.substring(0, 1000);
      try {
        helpers.type('[class*="desc"] [contenteditable="true"], #post-textarea', bodyText);
      } catch {}
    }

    for (const tag of (content.tags || []).slice(0, 5)) {
      try {
        helpers.type('[class*="tag"] input, [class*="topic"] input', tag);
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

    return { success: true, note: "小红书发布流程已执行" };
  } catch (err) {
    return { success: false, error: `小红书发布失败: ${err.message}` };
  }
}

module.exports = { publish };
