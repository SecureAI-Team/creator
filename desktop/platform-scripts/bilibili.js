/**
 * Bilibili publish script.
 *
 * Uses OpenClaw browser CLI to automate video/article publishing on bilibili.
 * NOTE: Element selectors need to be verified via `snapshot --interactive`
 * during actual testing, as bilibili's DOM changes frequently.
 */

/**
 * Publish content to bilibili.
 * @param {object} content - { title, body, mediaUrl, coverUrl, tags, contentType }
 * @param {object} helpers - { navigate, open, snapshot, click, type, fill, upload, screenshot, sleep }
 * @returns {Promise<{ success: boolean, platformUrl?: string, error?: string }>}
 */
async function publish(content, helpers) {
  const isVideo = content.contentType === "VIDEO";
  return isVideo
    ? await publishVideo(content, helpers)
    : await publishArticle(content, helpers);
}

async function publishVideo(content, helpers) {
  try {
    // 1. Navigate to video upload page
    helpers.navigate("https://member.bilibili.com/platform/upload/video/frame");
    await helpers.sleep(5000);

    // 2. Upload video if local file path is provided
    if (content.mediaUrl) {
      try {
        helpers.upload('input[type="file"]', content.mediaUrl);
        await helpers.sleep(15000); // Wait for upload to progress
      } catch {
        // Upload may need manual intervention
      }
    }

    // 3. Fill title (limit: 80 chars)
    const titleText = content.title.substring(0, 80);
    try {
      helpers.fill('input[placeholder*="标题"], [class*="title"] input', titleText);
    } catch {
      try {
        helpers.type('[contenteditable="true"]', titleText);
      } catch {}
    }

    // 4. Fill description (limit: 2000 chars)
    if (content.body) {
      const desc = content.body.substring(0, 2000);
      try {
        helpers.fill('textarea[placeholder*="简介"], textarea[placeholder*="描述"]', desc);
      } catch {
        try {
          helpers.type('[class*="desc"] [contenteditable="true"]', desc);
        } catch {}
      }
    }

    // 5. Add tags (max 12)
    for (const tag of (content.tags || []).slice(0, 12)) {
      try {
        helpers.type('[class*="tag"] input, input[placeholder*="标签"]', tag);
        helpers.exec('press Enter');
        await helpers.sleep(500);
      } catch {
        break;
      }
    }

    // 6. Screenshot for evidence
    try { helpers.screenshot(); } catch {}

    // 7. Click publish
    try {
      helpers.click('button:has-text("投稿"), button:has-text("发布")');
      await helpers.sleep(5000);
    } catch {
      return { success: false, error: "无法找到发布按钮" };
    }

    return { success: true, note: "发布流程已执行，请在 bilibili 创作中心确认" };
  } catch (err) {
    return { success: false, error: `bilibili 视频发布失败: ${err.message}` };
  }
}

async function publishArticle(content, helpers) {
  try {
    helpers.navigate("https://member.bilibili.com/platform/upload/text/edit");
    await helpers.sleep(5000);

    const titleText = content.title.substring(0, 80);
    try {
      helpers.fill('input[placeholder*="标题"], [class*="title"] input', titleText);
    } catch {}

    if (content.body) {
      try {
        helpers.type('[class*="editor"] [contenteditable="true"], .ql-editor', content.body.substring(0, 2000));
      } catch {}
    }

    try { helpers.screenshot(); } catch {}

    try {
      helpers.click('button:has-text("发布"), [class*="submit"]');
      await helpers.sleep(5000);
    } catch {
      return { success: false, error: "无法找到发布按钮" };
    }

    return { success: true, note: "文章发布流程已执行" };
  } catch (err) {
    return { success: false, error: `bilibili 图文发布失败: ${err.message}` };
  }
}

module.exports = { publish };
