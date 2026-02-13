"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Eye, ThumbsUp, RefreshCw, Loader2, Timer,
  FileText, Users, BarChart3, TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const PLATFORMS = [
  { key: "all", label: "全部" },
  { key: "bilibili", label: "哔哩哔哩", initial: "B", color: "from-[#00A1D6] to-[#0091c2]" },
  { key: "douyin", label: "抖音", initial: "抖", color: "from-[#1a1a1a] to-[#333333]" },
  { key: "xiaohongshu", label: "小红书", initial: "小", color: "from-[#FE2C55] to-[#e0264c]" },
  { key: "youtube", label: "YouTube", initial: "Y", color: "from-[#FF0000] to-[#cc0000]" },
  { key: "weixin-mp", label: "公众号", initial: "公", color: "from-[#07C160] to-[#06a050]" },
  { key: "weixin-channels", label: "视频号", initial: "视", color: "from-[#07C160] to-[#06a050]" },
  { key: "kuaishou", label: "快手", initial: "快", color: "from-[#FF4906] to-[#e04105]" },
  { key: "zhihu", label: "知乎", initial: "知", color: "from-[#0066FF] to-[#0055dd]" },
  { key: "weibo", label: "微博", initial: "微", color: "from-[#E6162D] to-[#cc1326]" },
  { key: "toutiao", label: "头条号", initial: "头", color: "from-[#F85959] to-[#e04e4e]" },
];

const TIME_RANGES: { key: string; label: string; days: number }[] = [
  { key: "7d", label: "近 7 天", days: 7 },
  { key: "30d", label: "近 30 天", days: 30 },
  { key: "90d", label: "近 90 天", days: 90 },
  { key: "all", label: "全部", days: 365 },
];

const AUTO_REFRESH_OPTIONS = [
  { key: "off", label: "关闭自动刷新", ms: 0 },
  { key: "5m", label: "每 5 分钟", ms: 5 * 60 * 1000 },
  { key: "15m", label: "每 15 分钟", ms: 15 * 60 * 1000 },
  { key: "30m", label: "每 30 分钟", ms: 30 * 60 * 1000 },
];

type ViewMode = "platform" | "content" | "trend";

interface PlatformMetric {
  id: string;
  platform: string;
  accountId: string;
  date: string;
  followers: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  contentCount: number;
}

interface PublishRecord {
  id: string;
  platform: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  publishedAt: string;
  contentItem: { title: string; contentType: string };
}

interface DataResponse {
  totals: { views: number; likes: number; comments: number; shares: number };
  records: PublishRecord[];
  platforms: { platformKey: string; accountId: string; accountName: string | null; status: string }[];
  platformMetrics: PlatformMetric[];
}

interface MetricsResponse {
  latest: Record<string, PlatformMetric>;
  growth: Record<string, { followers: number; views: number }>;
  history: { platform: string; accountId: string; date: string; followers: number; totalViews: number; totalLikes: number }[];
}

export default function DataPage() {
  const [platform, setPlatform] = useState("all");
  const [timeRange, setTimeRange] = useState("30d");
  const [data, setData] = useState<DataResponse | null>(null);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState("off");
  const [viewMode, setViewMode] = useState<ViewMode>("platform");
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const days = TIME_RANGES.find((t) => t.key === timeRange)?.days ?? 30;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ days: String(days) });
      if (platform !== "all") params.set("platform", platform);

      // Fetch both endpoints in parallel
      const [dataRes, metricsRes] = await Promise.all([
        fetch(`/api/data?${params.toString()}`),
        fetch(`/api/data/metrics?${params.toString()}`),
      ]);

      setData(await dataRes.json());
      setMetrics(await metricsRes.json());
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [platform, days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh timer
  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    const setting = AUTO_REFRESH_OPTIONS.find((o) => o.key === autoRefresh);
    if (setting && setting.ms > 0) {
      refreshTimerRef.current = setInterval(fetchData, setting.ms);
    }
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [autoRefresh, fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshResult(null);
    try {
      const res = await fetch("/api/data/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(platform !== "all" ? { platform } : {}),
      });
      const result = await res.json();
      setRefreshResult(result.message || (result.success ? "刷新完成" : "刷新失败"));
      await fetchData();
    } catch {
      setRefreshResult("刷新请求失败");
    }
    setRefreshing(false);
    // Auto-clear result message after 5s
    setTimeout(() => setRefreshResult(null), 5000);
  };

  const totals = data?.totals ?? { views: 0, likes: 0, comments: 0, shares: 0 };
  const platformMetrics = data?.platformMetrics || [];

  // Total followers across all platforms
  const totalFollowers = platformMetrics.reduce((sum, m) => sum + m.followers, 0);
  const totalContentCount = platformMetrics.reduce((sum, m) => sum + m.contentCount, 0);

  const statsItems = [
    { label: "总粉丝数", value: totalFollowers.toLocaleString(), icon: Users, iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
    { label: "总浏览量", value: totals.views > 0 ? totals.views.toLocaleString() : platformMetrics.reduce((s, m) => s + m.totalViews, 0).toLocaleString(), icon: Eye, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
    { label: "总点赞数", value: totals.likes > 0 ? totals.likes.toLocaleString() : platformMetrics.reduce((s, m) => s + m.totalLikes, 0).toLocaleString(), icon: ThumbsUp, iconBg: "bg-red-50", iconColor: "text-red-500" },
    { label: "作品总数", value: totalContentCount > 0 ? totalContentCount.toLocaleString() : "-", icon: BarChart3, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
  ];

  // Content performance data
  const contentPerformance = (() => {
    if (!data?.records?.length) return [];
    const grouped = new Map<
      string,
      { title: string; contentType: string; platforms: string[]; views: number; likes: number; comments: number; shares: number }
    >();
    for (const r of data.records) {
      const key = r.contentItem.title;
      const existing = grouped.get(key) || {
        title: r.contentItem.title,
        contentType: r.contentItem.contentType,
        platforms: [],
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
      };
      if (!existing.platforms.includes(r.platform)) existing.platforms.push(r.platform);
      existing.views += r.views;
      existing.likes += r.likes;
      existing.comments += r.comments;
      existing.shares += r.shares;
      grouped.set(key, existing);
    }
    return Array.from(grouped.values()).sort((a, b) => b.views - a.views);
  })();

  // Trend chart data from platform metrics history
  const trendChartData = (() => {
    if (!metrics?.history?.length) return [];
    const byDate = new Map<string, { date: string; followers: number; views: number; likes: number }>();
    for (const h of metrics.history) {
      const existing = byDate.get(h.date) || { date: h.date, followers: 0, views: 0, likes: 0 };
      existing.followers += h.followers;
      existing.views += h.totalViews;
      existing.likes += h.totalLikes;
      byDate.set(h.date, existing);
    }
    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  })();

  const GrowthBadge = ({ value }: { value: number }) => {
    if (value > 0) return <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600"><TrendingUp className="h-3 w-3" />+{value.toLocaleString()}</span>;
    if (value < 0) return <span className="inline-flex items-center gap-0.5 text-xs text-red-500"><TrendingDown className="h-3 w-3" />{value.toLocaleString()}</span>;
    return <span className="inline-flex items-center gap-0.5 text-xs text-gray-400"><Minus className="h-3 w-3" />0</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据分析</h1>
          <p className="text-gray-500 text-sm mt-1">跨平台创作者数据统计与分析</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-2 py-2 text-xs text-gray-500 focus:outline-none"
          >
            {AUTO_REFRESH_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          {autoRefresh !== "off" && <Timer className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />}
          <Button
            variant="outline"
            className="gap-2 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "采集中..." : "采集数据"}
          </Button>
        </div>
      </div>

      {/* Refresh result message */}
      {refreshResult && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-2 text-sm text-blue-700">
          {refreshResult}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          {PLATFORMS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
        <div className="flex rounded-xl bg-gray-100 p-1">
          {TIME_RANGES.map((tr) => (
            <button
              key={tr.key}
              onClick={() => setTimeRange(tr.key)}
              className={`px-3.5 py-1.5 text-sm rounded-lg transition-all ${
                timeRange === tr.key ? "bg-white shadow-sm font-medium text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tr.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex rounded-xl bg-gray-100 p-1">
          <button
            onClick={() => setViewMode("platform")}
            className={`px-3.5 py-1.5 text-sm rounded-lg transition-all ${
              viewMode === "platform" ? "bg-white shadow-sm font-medium text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            平台总览
          </button>
          <button
            onClick={() => setViewMode("trend")}
            className={`px-3.5 py-1.5 text-sm rounded-lg transition-all ${
              viewMode === "trend" ? "bg-white shadow-sm font-medium text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            趋势
          </button>
          <button
            onClick={() => setViewMode("content")}
            className={`px-3.5 py-1.5 text-sm rounded-lg transition-all ${
              viewMode === "content" ? "bg-white shadow-sm font-medium text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            单内容
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
        </div>
      ) : (
        <>
          {/* Summary stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statsItems.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-gray-100 bg-white p-5 transition-all hover:shadow-md hover:shadow-gray-100/80"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.iconBg}`}>
                    <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {viewMode === "platform" && (
            <>
              {/* Platform metrics cards */}
              {platformMetrics.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">各平台数据</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {platformMetrics.map((m) => {
                      const pInfo = PLATFORMS.find((p) => p.key === m.platform);
                      const growthKey = `${m.platform}:${m.accountId || "default"}`;
                      const growth = metrics?.growth?.[growthKey] || metrics?.growth?.[m.platform];
                      // Find account name from platform connections
                      const acctInfo = data?.platforms?.find(
                        (p) => p.platformKey === m.platform && p.accountId === (m.accountId || "default")
                      );
                      const hasMultipleAccounts = platformMetrics.filter((pm) => pm.platform === m.platform).length > 1;
                      return (
                        <div
                          key={`${m.platform}:${m.accountId || "default"}`}
                          className="rounded-2xl border border-gray-100 bg-white p-5 hover:shadow-md hover:shadow-gray-100/80 transition-all"
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div
                              className={`h-10 w-10 rounded-xl bg-gradient-to-br ${pInfo?.color || "from-gray-400 to-gray-500"} flex items-center justify-center text-white font-bold`}
                            >
                              {pInfo?.initial || "?"}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">
                                {pInfo?.label || m.platform}
                                {hasMultipleAccounts && (
                                  <span className="ml-2 text-xs font-normal text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-md">
                                    {acctInfo?.accountName || m.accountId || "default"}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-400">
                                更新于 {new Date(m.date).toLocaleDateString("zh-CN")}
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-gray-500">粉丝</p>
                              <p className="text-lg font-bold text-gray-900">{m.followers.toLocaleString()}</p>
                              {growth && <GrowthBadge value={growth.followers} />}
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">浏览量</p>
                              <p className="text-lg font-bold text-gray-900">{m.totalViews.toLocaleString()}</p>
                              {growth && <GrowthBadge value={growth.views} />}
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">作品数</p>
                              <p className="text-lg font-bold text-gray-900">{m.contentCount.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">点赞</p>
                              <p className="text-sm font-semibold text-gray-700">{m.totalLikes.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">评论</p>
                              <p className="text-sm font-semibold text-gray-700">{m.totalComments.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">分享</p>
                              <p className="text-sm font-semibold text-gray-700">{m.totalShares.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 mx-auto mb-4">
                    <BarChart3 className="h-7 w-7 text-gray-300" />
                  </div>
                  <h3 className="font-medium text-gray-600 mb-1">暂无平台数据</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    点击「采集数据」从已连接的平台后台抓取最新数据
                  </p>
                  <p className="text-xs text-gray-300 mt-2">
                    支持: 哔哩哔哩、微信公众号、抖音、小红书、快手、知乎
                  </p>
                </div>
              )}
            </>
          )}

          {viewMode === "trend" && (
            <>
              {/* Trend chart from platform metrics history */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6">
                <h3 className="font-semibold text-gray-900 mb-4">粉丝与浏览趋势</h3>
                {trendChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12, fill: "#9ca3af" }}
                        tickFormatter={(v) => {
                          const d = new Date(v);
                          return `${d.getMonth() + 1}/${d.getDate()}`;
                        }}
                      />
                      <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid #e5e7eb",
                          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                        }}
                        labelFormatter={(label) => new Date(label as string).toLocaleDateString("zh-CN")}
                      />
                      <Line type="monotone" dataKey="followers" stroke="#6366f1" strokeWidth={2} dot={false} name="粉丝数" />
                      <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} dot={false} name="浏览量" />
                      <Line type="monotone" dataKey="likes" stroke="#ef4444" strokeWidth={2} dot={false} name="点赞" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 mx-auto mb-4">
                        <Eye className="h-7 w-7 text-gray-300" />
                      </div>
                      <p className="font-medium text-gray-600">暂无趋势数据</p>
                      <p className="text-sm text-gray-400 mt-1">多次采集数据后，趋势图将在这里显示</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Platform breakdown table (from per-content records) */}
              <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">各平台内容表现</h3>
                  <p className="text-xs text-gray-400 mt-1">基于已发布内容的数据统计</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="text-left py-3 px-6 font-medium text-gray-500">平台</th>
                        <th className="text-right py-3 px-6 font-medium text-gray-500">浏览量</th>
                        <th className="text-right py-3 px-6 font-medium text-gray-500">点赞</th>
                        <th className="text-right py-3 px-6 font-medium text-gray-500">评论</th>
                        <th className="text-right py-3 px-6 font-medium text-gray-500">分享</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.records && data.records.length > 0 ? (
                        (() => {
                          const grouped = new Map<string, { views: number; likes: number; comments: number; shares: number }>();
                          for (const r of data.records) {
                            const e = grouped.get(r.platform) || { views: 0, likes: 0, comments: 0, shares: 0 };
                            e.views += r.views; e.likes += r.likes; e.comments += r.comments; e.shares += r.shares;
                            grouped.set(r.platform, e);
                          }
                          return Array.from(grouped.entries()).map(([p, val]) => (
                            <tr key={p} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                              <td className="py-3 px-6 font-medium text-gray-900">{PLATFORMS.find((pl) => pl.key === p)?.label || p}</td>
                              <td className="py-3 px-6 text-right text-gray-600">{val.views.toLocaleString()}</td>
                              <td className="py-3 px-6 text-right text-gray-600">{val.likes.toLocaleString()}</td>
                              <td className="py-3 px-6 text-right text-gray-600">{val.comments.toLocaleString()}</td>
                              <td className="py-3 px-6 text-right text-gray-600">{val.shares.toLocaleString()}</td>
                            </tr>
                          ));
                        })()
                      ) : (
                        <tr>
                          <td className="py-12 text-center text-gray-400" colSpan={5}>
                            暂无内容发布数据
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {viewMode === "content" && (
            <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">单内容数据表现</h3>
                <p className="text-xs text-gray-400 mt-1">按总浏览量排序</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="text-left py-3 px-6 font-medium text-gray-500">内容</th>
                      <th className="text-left py-3 px-6 font-medium text-gray-500">发布平台</th>
                      <th className="text-right py-3 px-6 font-medium text-gray-500">浏览量</th>
                      <th className="text-right py-3 px-6 font-medium text-gray-500">点赞</th>
                      <th className="text-right py-3 px-6 font-medium text-gray-500">评论</th>
                      <th className="text-right py-3 px-6 font-medium text-gray-500">分享</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contentPerformance.length > 0 ? (
                      contentPerformance.map((row, i) => (
                        <tr key={i} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-6">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              <span className="font-medium text-gray-900 truncate max-w-[200px]">{row.title}</span>
                            </div>
                          </td>
                          <td className="py-3 px-6 text-gray-500 text-xs">
                            {row.platforms.map((p) => PLATFORMS.find((pl) => pl.key === p)?.label || p).join(", ")}
                          </td>
                          <td className="py-3 px-6 text-right text-gray-600">{row.views.toLocaleString()}</td>
                          <td className="py-3 px-6 text-right text-gray-600">{row.likes.toLocaleString()}</td>
                          <td className="py-3 px-6 text-right text-gray-600">{row.comments.toLocaleString()}</td>
                          <td className="py-3 px-6 text-right text-gray-600">{row.shares.toLocaleString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-12 text-center text-gray-400" colSpan={6}>
                          暂无内容数据
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
