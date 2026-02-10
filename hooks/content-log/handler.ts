import type { HookHandler } from "../../src/hooks/hooks.js";
import * as fs from "fs";
import * as path from "path";

/**
 * Content Log Hook
 *
 * Triggered on new sessions. Scans workspace/content/drafts/ for
 * recent draft records and maintains a summary index file.
 *
 * Tool RPA skills write individual draft files; this hook aggregates them.
 */
const handler: HookHandler = async (event) => {
  const draftsDir = path.resolve(__dirname, "../../workspace/content/drafts");

  if (!fs.existsSync(draftsDir)) {
    return;
  }

  const files = fs.readdirSync(draftsDir).filter((f) => f.endsWith(".md") && f !== "index.md");

  if (files.length === 0) {
    return;
  }

  // Build summary index
  const indexPath = path.join(draftsDir, "index.md");
  const lines = [
    `# 草稿索引`,
    ``,
    `最后更新: ${new Date().toISOString()}`,
    `总草稿: ${files.length} 篇`,
    ``,
    `## 列表（按时间倒序）`,
    ...files
      .sort()
      .reverse()
      .slice(0, 20)
      .map((f) => `- [${f}](./${f})`),
    ``,
  ];
  fs.writeFileSync(indexPath, lines.join("\n"), "utf-8");
};

export default handler;
