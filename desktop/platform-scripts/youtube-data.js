/**
 * YouTube creator dashboard data collector (个人创作者).
 *
 * Uses Browser RPA on YouTube Studio: navigate to studio.youtube.com,
 * snapshot channel overview for subscribers, views, video count.
 * No API key required — uses the same browser login as the creator.
 */

const { findMetric, flattenSnapshot, waitForContent, isLoginSnapshot } = require("./bilibili-data");

/**
 * Parse English number from text (e.g. "1,234", "1.2K", "2.5M").
 */
function parseEnglishNumber(text) {
  if (!text) return 0;
  text = String(text).replace(/,/g, "").trim();
  const kMatch = text.match(/^([\d.]+)\s*K$/i);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);
  const mMatch = text.match(/^([\d.]+)\s*M$/i);
  if (mMatch) return Math.round(parseFloat(mMatch[1]) * 1000000);
  const num = parseFloat(text);
  return isNaN(num) ? 0 : Math.round(num);
}

/**
 * Find a numeric value near English labels in snapshot (YouTube Studio is EN).
 */
function findMetricEn(snapshot, labels, log) {
  if (!snapshot) return 0;
  const flat = flattenSnapshot(snapshot);
  for (const label of labels) {
    const re = new RegExp(label + "\\s*[：:]?\\s*([\\d,.]+\\s*[KMB]?)\\b", "gi");
    const m = re.exec(flat);
    if (m) {
      const val = parseEnglishNumber(m[1].trim());
      if (log) log.debug(`findMetricEn "${label}" → ${val}`);
      return val;
    }
    const tokenRe = new RegExp("([\\d,.]+\\s*[KMB]?)\\s*" + label, "gi");
    const m2 = tokenRe.exec(flat);
    if (m2) {
      const val = parseEnglishNumber(m2[1].trim());
      if (log) log.debug(`findMetricEn "${label}" (reverse) → ${val}`);
      return val;
    }
  }
  return 0;
}

async function collect(helpers) {
  const log = helpers.log;
  const result = {
    followers: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    contentCount: 0,
  };

  log.info("youtube: navigating to YouTube Studio");
  try {
    helpers.navigate("https://studio.youtube.com");
  } catch (e) {
    log.warn("youtube: nav timeout (ok):", e.message);
  }

  await helpers.sleep(6000);

  const snapshot = await waitForContent(
    helpers,
    ["Subscribers", "subscribers", "Watch time", "Views", "Videos", "Channel", "Dashboard", "Overview"],
    60000,
    3000
  );

  if (!snapshot) {
    log.warn("youtube: no content loaded");
    return result;
  }

  if (isLoginSnapshot(snapshot) || flattenSnapshot(snapshot).toLowerCase().includes("sign in")) {
    log.warn("youtube: login page detected");
    return result;
  }

  const flat = flattenSnapshot(snapshot);
  log.info(`youtube: flat (${flat.length} chars): ${flat.substring(0, 800)}`);

  result.followers = findMetricEn(snapshot, ["Subscribers", "subscribers"], log);
  result.totalViews = findMetricEn(snapshot, ["Total views", "Views", "Watch time"], log);
  result.contentCount = findMetricEn(snapshot, ["Videos", "Total videos"], log);

  if (result.totalViews === 0) {
    const num = parseInt(flat.replace(/\D/g, "").substring(0, 12), 10);
    if (!isNaN(num) && num > 0 && num < 1e12) result.totalViews = num;
  }

  log.info(`youtube: result = ${JSON.stringify(result)}`);
  return result;
}

module.exports = { collect };
