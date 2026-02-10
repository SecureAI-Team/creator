import type { HookHandler } from "../../src/hooks/hooks.js";
import * as fs from "fs";
import * as path from "path";

/**
 * Publish Log Hook
 *
 * Triggered on new sessions. Scans workspace/content/published/ for
 * recent publish records and maintains a summary index file.
 *
 * Publish skills write individual log files; this hook aggregates them.
 */
const handler: HookHandler = async (event) => {
  const publishedDir = path.resolve(__dirname, "../../workspace/content/published");

  if (!fs.existsSync(publishedDir)) {
    return;
  }

  const files = fs.readdirSync(publishedDir).filter((f) => f.endsWith(".md") && f !== "index.md");

  if (files.length === 0) {
    return;
  }

  // Build summary index
  const today = new Date().toISOString().slice(0, 10);
  const todayFiles = files.filter((f) => f.startsWith(today));

  if (todayFiles.length > 0) {
    const indexPath = path.join(publishedDir, "index.md");
    const lines = [
      `# 发布记录索引`,
      ``,
      `最后更新: ${new Date().toISOString()}`,
      `今日发布: ${todayFiles.length} 篇`,
      `总记录: ${files.length} 篇`,
      ``,
      `## 今日`,
      ...todayFiles.map((f) => `- [${f}](./${f})`),
      ``,
    ];
    fs.writeFileSync(indexPath, lines.join("\n"), "utf-8");
  }
};

export default handler;
