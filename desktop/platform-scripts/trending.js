/**
 * Cross-platform trending/hot topic collection.
 *
 * Scrapes hot search lists from major Chinese platforms via browser automation.
 * Returns structured trending data for the trends dashboard.
 */

const { flattenSnapshot, waitForContent } = require("./bilibili-data");

const TRENDING_PAGES = {
  douyin: { url: "https://www.douyin.com/hot", keywords: ["热搜", "热榜", "热门"] },
  weibo: { url: "https://s.weibo.com/top/summary", keywords: ["热搜", "热搜榜", "实时"] },
  zhihu: { url: "https://www.zhihu.com/hot", keywords: ["热榜", "热门", "热议"] },
  bilibili: { url: "https://www.bilibili.com/v/popular/rank/all", keywords: ["排行", "热门", "综合"] },
  toutiao: { url: "https://www.toutiao.com/hot-event/hot-board/", keywords: ["热榜", "热搜", "热点"] },
  baidu: { url: "https://top.baidu.com/board?tab=realtime", keywords: ["热搜", "实时", "热点"] },
};

/**
 * Parse trending entries from a flattened snapshot text.
 * Looks for numbered lists, titles, and heat values.
 */
function parseTrendingFromSnapshot(snapshot, platform) {
  if (!snapshot) return [];
  const flat = flattenSnapshot(snapshot);
  const items = [];

  // Pattern: numbered entries (1. title, 2. title, etc.) or ranked items
  const lines = flat.split(/(?=\d{1,3}[\.\s、])/);

  for (const line of lines) {
    const match = line.match(/^(\d{1,3})[\.\s、]\s*(.+)/);
    if (match) {
      const rank = parseInt(match[1], 10);
      let title = match[2].trim();

      // Extract heat value if present (e.g. "xxx 1234万热度")
      let heat = 0;
      const heatMatch = title.match(/([\d.]+)\s*万?\s*(?:热度|搜索|讨论|播放)/);
      if (heatMatch) {
        heat = parseFloat(heatMatch[1]);
        if (title.includes("万")) heat *= 10000;
        title = title.replace(heatMatch[0], "").trim();
      }

      if (title.length > 2 && title.length < 200 && rank <= 50) {
        items.push({ rank, title, heat, platform });
      }
    }
  }

  return items.slice(0, 30);
}

/**
 * Collect trending topics from a single platform.
 * @param {string} platform
 * @param {object} helpers
 * @returns {Promise<{ success: boolean, items: Array, error?: string }>}
 */
async function collectTrending(platform, helpers) {
  const log = helpers.log;
  const config = TRENDING_PAGES[platform];
  if (!config) {
    return { success: false, items: [], error: `不支持 ${platform} 热搜采集` };
  }

  log.info(`trending: collecting from ${platform} → ${config.url}`);

  try {
    helpers.navigate(config.url);
  } catch {
    // timeout OK
  }

  await helpers.sleep(5000);

  const snapshot = await waitForContent(helpers, config.keywords, 45000, 3000);
  if (!snapshot) {
    log.warn(`trending: no content for ${platform}`);
    return { success: false, items: [], error: `${platform} 热搜页面未加载` };
  }

  const flat = flattenSnapshot(snapshot);
  log.info(`trending: ${platform} flat (${flat.length} chars): ${flat.substring(0, 400)}`);

  const items = parseTrendingFromSnapshot(snapshot, platform);
  log.info(`trending: ${platform} found ${items.length} item(s)`);

  return { success: true, items };
}

/**
 * Collect trending from all supported platforms sequentially.
 * @param {object} helpers
 * @param {string[]} [platforms] - optional subset of platforms
 * @returns {Promise<{ success: boolean, results: Record<string, object> }>}
 */
async function collectAllTrending(helpers, platforms) {
  const log = helpers.log;
  const targets = platforms && platforms.length > 0
    ? platforms
    : Object.keys(TRENDING_PAGES);

  const results = {};
  for (const p of targets) {
    try {
      results[p] = await collectTrending(p, helpers);
    } catch (err) {
      log.error(`trending: ${p} error: ${err.message}`);
      results[p] = { success: false, items: [], error: err.message };
    }
  }

  const totalItems = Object.values(results).reduce(
    (sum, r) => sum + ((r.items || []).length), 0
  );
  log.info(`trending: collected ${totalItems} total items from ${targets.length} platforms`);

  return { success: true, results };
}

module.exports = {
  collectTrending,
  collectAllTrending,
  parseTrendingFromSnapshot,
  TRENDING_PAGES,
};
