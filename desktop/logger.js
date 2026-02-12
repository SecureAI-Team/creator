/**
 * File-based rotating logger for desktop client.
 *
 * Writes to: %APPDATA%/creator-desktop/logs/  (Windows)
 *            ~/Library/Application Support/creator-desktop/logs/  (macOS)
 *            ~/.config/creator-desktop/logs/  (Linux)
 *
 * Features:
 *  - Timestamped log lines  (ISO + level + tag + message)
 *  - Auto-rotate at 2 MB, keep last 5 files
 *  - Expose getLogs() for IPC so web page can display logs
 *  - log.info / log.warn / log.error / log.debug helpers
 */

const fs = require("fs");
const path = require("path");

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const MAX_FILES = 5;

let logsDir = null;
let currentLogPath = null;
let logStream = null;
const ringBuffer = []; // last N lines kept in memory for quick IPC read
const RING_SIZE = 500;

function init(userDataPath) {
  logsDir = path.join(userDataPath, "logs");
  fs.mkdirSync(logsDir, { recursive: true });
  currentLogPath = path.join(logsDir, "app.log");
  openStream();
}

function openStream() {
  if (logStream) {
    try { logStream.end(); } catch { /* ignore */ }
  }
  logStream = fs.createWriteStream(currentLogPath, { flags: "a" });
}

function rotate() {
  if (!currentLogPath) return;
  try {
    const stat = fs.statSync(currentLogPath);
    if (stat.size < MAX_FILE_SIZE) return;
  } catch {
    return;
  }
  try { logStream.end(); } catch { /* ignore */ }

  // Shift existing rotated files
  for (let i = MAX_FILES - 1; i >= 1; i--) {
    const from = path.join(logsDir, `app.${i}.log`);
    const to = path.join(logsDir, `app.${i + 1}.log`);
    try { fs.renameSync(from, to); } catch { /* ignore */ }
  }
  try { fs.renameSync(currentLogPath, path.join(logsDir, "app.1.log")); } catch { /* ignore */ }

  // Delete oldest beyond MAX_FILES
  const oldest = path.join(logsDir, `app.${MAX_FILES + 1}.log`);
  try { fs.unlinkSync(oldest); } catch { /* ignore */ }

  openStream();
}

function write(level, tag, ...args) {
  const ts = new Date().toISOString();
  const msg = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
  const line = `${ts} [${level}] [${tag}] ${msg}`;

  // Console
  if (level === "ERROR") {
    console.error(line);
  } else if (level === "WARN") {
    console.warn(line);
  } else {
    console.log(line);
  }

  // Ring buffer (in-memory)
  ringBuffer.push(line);
  if (ringBuffer.length > RING_SIZE) ringBuffer.shift();

  // File
  if (logStream) {
    logStream.write(line + "\n");
    rotate();
  }
}

function createTaggedLogger(tag) {
  return {
    debug: (...args) => write("DEBUG", tag, ...args),
    info: (...args) => write("INFO", tag, ...args),
    warn: (...args) => write("WARN", tag, ...args),
    error: (...args) => write("ERROR", tag, ...args),
  };
}

/**
 * Get recent log lines (ring buffer) for IPC.
 * @param {number} [count=200]
 */
function getLogs(count = 200) {
  return ringBuffer.slice(-count);
}

/**
 * Get full log file contents (for "export logs" feature).
 */
function getLogFilePath() {
  return currentLogPath;
}

module.exports = { init, createTaggedLogger, getLogs, getLogFilePath };
