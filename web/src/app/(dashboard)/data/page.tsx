"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, ThumbsUp, MessageSquare, Share2, RefreshCw, Loader2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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
      const json = await res.json();
      setData(json);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [platform, days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch("/api/data/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(platform !== "all" ? { platform } : {}),
      });
      await fetchData();
    } catch {
      // ignore
    }
    setRefreshing(false);
  };

  const totals = data?.totals ?? { views: 0, likes: 0, comments: 0, shares: 0 };

  const statsItems = [
    { label: "总浏览量", value: totals.views.toLocaleString(), icon: Eye, color: "text-blue-500" },
    { label: "总点赞数", value: totals.likes.toLocaleString(), icon: ThumbsUp, color: "text-red-500" },
    { label: "总评论数", value: totals.comments.toLocaleString(), icon: MessageSquare, color: "text-green-500" },
    { label: "总分享数", value: totals.shares.toLocaleString(), icon: Share2, color: "text-purple-500" },
  ];

  // Build chart data from records grouped by date
  const chartData = (() => {
    if (!data?.records?.length) return [];
    const grouped = new Map<string, { views: number; likes: number }>();
    for (const r of data.records) {
      if (!r.publishedAt) continue;
      const date = new Date(r.publishedAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
      const existing = grouped.get(date) || { views: 0, likes: 0 };
      existing.views += r.views;
      existing.likes += r.likes;
      grouped.set(date, existing);
    }
    return Array.from(grouped.entries()).map(([date, val]) => ({
      date,
      ...val,
    }));
  })();

  // Platform breakdown
  const platformBreakdown = (() => {
    if (!data?.records?.length) return [];
    const grouped = new Map<string, { views: number; likes: number; comments: number; shares: number }>();
    for (const r of data.records) {
      const existing = grouped.get(r.platform) || { views: 0, likes: 0, comments: 0, shares: 0 };
      existing.views += r.views;
      existing.likes += r.likes;
      existing.comments += r.comments;
      existing.shares += r.shares;
      grouped.set(r.platform, existing);
    }
    return Array.from(grouped.entries()).map(([plat, val]) => ({
      platform: plat,
      ...val,
    }));
  })();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">数据分析</h1>
          <p className="text-muted-foreground mt-1">跨平台内容数据统计与分析</p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "刷新中..." : "刷新数据"}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          {PLATFORMS.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
        <div className="flex rounded-lg bg-muted p-1">
          {TIME_RANGES.map((tr) => (
            <button
              key={tr.key}
              onClick={() => setTimeRange(tr.key)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                timeRange === tr.key
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tr.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statsItems.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <stat.icon className={`h-8 w-8 ${stat.color} opacity-80`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>趋势图</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Line type="monotone" dataKey="views" stroke="#6366f1" strokeWidth={2} name="浏览量" />
                    <Line type="monotone" dataKey="likes" stroke="#ef4444" strokeWidth={2} name="点赞" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Eye className="h-12 w-12 mx-auto mb-4 opacity-40" />
                    <p className="font-medium">暂无数据</p>
                    <p className="text-sm mt-1">连接平台并拉取数据后，趋势图将在这里显示</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Per-platform table */}
          <Card>
            <CardHeader>
              <CardTitle>各平台数据对比</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">平台</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">浏览量</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">点赞</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">评论</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">分享</th>
                    </tr>
                  </thead>
                  <tbody>
                    {platformBreakdown.length > 0 ? (
                      platformBreakdown.map((row) => (
                        <tr key={row.platform} className="border-b border-border last:border-0">
                          <td className="py-3 px-4 font-medium">{row.platform}</td>
                          <td className="py-3 px-4 text-right">{row.views.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right">{row.likes.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right">{row.comments.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right">{row.shares.toLocaleString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-8 text-center text-muted-foreground" colSpan={5}>
                          暂无平台数据
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
