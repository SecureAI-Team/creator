import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = process.env.OPENCLAW_DATA_DIR || "/data/users";
const TEMPLATE_DIR = process.env.OPENCLAW_TEMPLATE_DIR || process.cwd().replace(/\/web$/, "");

// Base CDP port for user instances (user N gets ports BASE + N*30 .. BASE + N*30 + 29)
const USER_PORT_BASE = 19000;
const PORTS_PER_USER = 30;

export interface UserWorkspaceConfig {
  userId: string;
  platforms: string[];
  tools: string[];
  dashscopeApiKey?: string;
}

/**
 * Get the workspace directory path for a user.
 */
export function getUserWorkspaceDir(userId: string): string {
  return join(DATA_DIR, userId);
}

/**
 * Ensure user workspace directory exists with minimal structure.
 * Called before platform login so OpenClaw has a workspace to use.
 * Does not copy templates (those live in the OpenClaw container).
 */
export function ensureUserWorkspaceExists(userId: string): string {
  const wsDir = getUserWorkspaceDir(userId);
  if (existsSync(wsDir)) return wsDir;

  const dataDirs = [
    "workspace/auth",
    "workspace/content/drafts",
    "workspace/content/adapted",
    "workspace/content/media",
    "workspace/content/published",
    "workspace/content/screenshots",
    "workspace/data",
    "workspace/topics",
    "browser-profiles",
  ];
  mkdirSync(wsDir, { recursive: true });
  for (const dir of dataDirs) {
    mkdirSync(join(wsDir, dir), { recursive: true });
  }
  return wsDir;
}

/**
 * Calculate the base CDP port for a user's browser profiles.
 * Uses a deterministic hash of the userId to distribute port ranges.
 */
export function getUserBasePort(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  // Map to a slot within 0..999 (supports ~1000 concurrent users)
  const slot = Math.abs(hash) % 1000;
  return USER_PORT_BASE + slot * PORTS_PER_USER;
}

/**
 * Initialize workspace directory for a new user.
 * Copies template files and generates user-specific openclaw.json.
 */
export function initializeUserWorkspace(config: UserWorkspaceConfig): string {
  const wsDir = getUserWorkspaceDir(config.userId);

  if (existsSync(wsDir)) {
    return wsDir; // Already initialized
  }

  mkdirSync(wsDir, { recursive: true });

  // Copy shared/template directories
  const templateDirs = [
    "skills",
    "hooks",
    "src",
    "workspace/config",
    "workspace/prompts",
    "workspace/workflows",
    "SOUL.md",
    "IDENTITY.md",
    "AGENTS.md",
  ];

  for (const dir of templateDirs) {
    const src = join(TEMPLATE_DIR, dir);
    const dest = join(wsDir, dir);
    if (existsSync(src)) {
      cpSync(src, dest, { recursive: true });
    }
  }

  // Create workspace data directories
  const dataDirs = [
    "workspace/auth",
    "workspace/content/drafts",
    "workspace/content/adapted",
    "workspace/content/media",
    "workspace/content/published",
    "workspace/content/screenshots",
    "workspace/data",
    "workspace/topics",
    "browser-profiles",
  ];

  for (const dir of dataDirs) {
    mkdirSync(join(wsDir, dir), { recursive: true });
  }

  // Generate user-specific openclaw.json
  generateOpenclawConfig(config);

  return wsDir;
}

/**
 * Generate user-specific openclaw.json with assigned ports.
 */
export function generateOpenclawConfig(config: UserWorkspaceConfig): void {
  const wsDir = getUserWorkspaceDir(config.userId);
  const templatePath = join(TEMPLATE_DIR, "openclaw.json");
  const template = JSON.parse(readFileSync(templatePath, "utf-8"));
  const basePort = getUserBasePort(config.userId);

  // Remap browser profile ports
  let portOffset = 0;
  const profiles: Record<string, { cdpPort: number; color: string }> = {};
  for (const [name, profile] of Object.entries(template.browser.profiles)) {
    const p = profile as { cdpPort: number; color: string };
    profiles[name] = {
      cdpPort: basePort + portOffset,
      color: p.color,
    };
    portOffset++;
  }

  // Build user-specific config
  const userConfig = {
    ...template,
    env: {
      DASHSCOPE_API_KEY: config.dashscopeApiKey || "${DASHSCOPE_API_KEY}",
    },
    browser: {
      ...template.browser,
      profiles,
      screenshotDir: "workspace/content/screenshots",
    },
  };

  writeFileSync(
    join(wsDir, "openclaw.json"),
    JSON.stringify(userConfig, null, 2),
    "utf-8"
  );
}

/**
 * Update user-specific tools.yaml based on enabled tools.
 */
export function updateUserToolsConfig(
  userId: string,
  enabledTools: string[]
): void {
  const wsDir = getUserWorkspaceDir(userId);
  const toolsPath = join(wsDir, "workspace/config/tools.yaml");

  if (!existsSync(toolsPath)) return;

  const content = readFileSync(toolsPath, "utf-8");

  // Simple enable/disable by toggling the enabled field
  // This is a basic implementation; in production, use a proper YAML parser
  const toolBlocks = content.split(/\n  (?=\w)/);
  const updated = toolBlocks.map((block) => {
    const keyMatch = block.match(/^(\w[\w-]*):/m);
    if (!keyMatch) return block;
    const key = keyMatch[1];
    const isEnabled = enabledTools.includes(key);
    return block.replace(
      /enabled:\s*(true|false)/,
      `enabled: ${isEnabled}`
    );
  });

  writeFileSync(toolsPath, updated.join("\n  "), "utf-8");
}
