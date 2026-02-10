"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eye, ThumbsUp, MessageSquare, Share2, RefreshCw, Loader2 } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const PLATFORMS = [
  { key: "all", label: "全部" },
  { key: "bilibili", label: "哔哩哔哩" },
  { key: "douyin", label: "抖音" },
  { key: "xiaohongshu", label: "小红书" },
  { key: "youtube", label: "YouTube" },
  { key: "weixin-mp", label: "公众号" },
  { key: "weixin-channels", label: "视频号" },
  { key: "kuaishou", label: "快手" },
  { key: "zhihu", label: "知乎" },
  { key: "weibo", label: "微博" },
  { key: "toutiao", label: "头条号" },
];

const TIME_RANGES: { key: string; label: string; days: number }[] = [
  { key: "7d", label: "近 7 天", days: 7 },
  { key: "30d", label: "近 30 天", days: 30 },
  { key: "90d", label: "近 90 天", days: 90 },
  { key: "all", label: "全部", days: 365 },
];

interface PublishRecord {
  id: string; platform: string; views: number; likes: number; comments: number; shares: number;
  publishedAt: string; contentItem: { title: string; contentType: string };
}

interface DataResponse {
  totals: { views: number; likes: number; comments: number; shares: number };
  records: PublishRecord[];
  platforms: { platformKey: string; status: string }[];
}

export default function DataPage() {
  const [platform, setPlatform] = useState("all");
  const [timeRange, setTimeRange] = useState("7d");
  const [data, setData] = useState<DataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const days = TIME_RANGES.find((t) => t.key === timeRange)?.days ?? 7;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ days: String(days) });
      if (platform !== "all") params.set("platform", platform);
      const res = await fetch(`/api/data?${params.toString()}`);
      setData(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [platform, days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch("/api/data/refresh", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(platform !== "all" ? { platform } : {}),
      });
      await fetchData();
    } catch { /* ignore */ }
    setRefreshing(false);
  };

  const totals = data?.totals ?? { views: 0, likes: 0, comments: 0, shares: 0 };

  const statsItems = [
    { label: "总浏览量", value: totals.views.toLocaleString(), icon: Eye, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
    { label: "总点赞数", value: totals.likes.toLocaleString(), icon: ThumbsUp, iconBg: "bg-red-50", iconColor: "text-red-500" },
    { label: "总评论数", value: totals.comments.toLocaleString(), icon: MessageSquare, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: "总分享数", value: totals.shares.toLocaleString(), icon: Share2, iconBg: "bg-violet-50", iconColor: "text-violet-600" },
  ];

  const chartData = (() => {
    if (!data?.records?.length) return [];
    const grouped = new Map<string, { views: number; likes: number }>();
    for (const r of data.records) {
      if (!r.publishedAt) continue;
      const date = new Date(r.publishedAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
      const existing = grouped.get(date) || { views: 0, likes: 0 };
      existing.views += r.views; existing.likes += r.likes;
      grouped.set(date, existing);
    }
    return Array.from(grouped.entries()).map(([date, val]) => ({ date, ...val }));
  })();

  const platformBreakdown = (() => {
    if (!data?.records?.length) return [];
    const grouped = new Map<string, { views: number; likes: number; comments: number; shares: number }>();
    for (const r of data.records) {
      const existing = grouped.get(r.platform) || { views: 0, likes: 0, comments: 0, shares: 0 };
      existing.views += r.views; existing.likes += r.likes; existing.comments += r.comments; existing.shares += r.shares;
      grouped.set(r.platform, existing);
    }
    return Array.from(grouped.entries()).map(([p, val]) => ({ platform: p, ...val }));
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据分析</h1>
          <p className="text-gray-500 text-sm mt-1">跨平台内容数据统计与分析</p>
        </div>
        <Button variant="outline" className="gap-2 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "刷新中..." : "刷新数据"}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
          {PLATFORMS.map((p) => (<option key={p.key} value={p.key}>{p.label}</option>))}
        </select>
        <div className="flex rounded-xl bg-gray-100 p-1">
          {TIME_RANGES.map((tr) => (
            <button key={tr.key} onClick={() => setTimeRange(tr.key)} className={`px-3.5 py-1.5 text-sm rounded-lg transition-all ${timeRange === tr.key ? "bg-white shadow-sm font-medium text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
              {tr.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gray-300" /></div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statsItems.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-5 transition-all hover:shadow-md hover:shadow-gray-100/80">
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

          {/* Chart */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6">
            <h3 className="font-semibold text-gray-900 mb-4">趋势图</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#9ca3af" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }} />
                  <Line type="monotone" dataKey="views" stroke="#4f46e5" strokeWidth={2} dot={false} name="浏览量" />
                  <Line type="monotone" dataKey="likes" stroke="#ef4444" strokeWidth={2} dot={false} name="点赞" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 mx-auto mb-4"><Eye className="h-7 w-7 text-gray-300" /></div>
                  <p className="font-medium text-gray-600">暂无数据</p>
                  <p className="text-sm text-gray-400 mt-1">连接平台并拉取数据后，趋势图将在这里显示</p>
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">各平台数据对比</h3>
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
                  {platformBreakdown.length > 0 ? platformBreakdown.map((row) => (
                    <tr key={row.platform} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-6 font-medium text-gray-900">{row.platform}</td>
                      <td className="py-3 px-6 text-right text-gray-600">{row.views.toLocaleString()}</td>
                      <td className="py-3 px-6 text-right text-gray-600">{row.likes.toLocaleString()}</td>
                      <td className="py-3 px-6 text-right text-gray-600">{row.comments.toLocaleString()}</td>
                      <td className="py-3 px-6 text-right text-gray-600">{row.shares.toLocaleString()}</td>
                    </tr>
                  )) : (
                    <tr><td className="py-12 text-center text-gray-400" colSpan={5}>暂无平台数据</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
