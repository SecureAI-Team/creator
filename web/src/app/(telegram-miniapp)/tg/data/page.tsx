"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Eye, ThumbsUp, MessageSquare, Share2, Loader2 } from "lucide-react";

interface DataSummary {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  platforms: { platformKey: string; status: string }[];
}

export default function TelegramDataPage() {
  const [data, setData] = useState<DataSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const token = (document.getElementById("tg-token") as HTMLInputElement)?.value;
        const res = await fetch(`/api/data?days=${period}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        setData({
          views: json.totals?.views || 0,
          likes: json.totals?.likes || 0,
          comments: json.totals?.comments || 0,
          shares: json.totals?.shares || 0,
          platforms: json.platforms || [],
        });
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, [period]);

  const statsItems = data
    ? [
        { label: "浏览量", value: data.views, icon: Eye, color: "text-blue-500" },
        { label: "点赞", value: data.likes, icon: ThumbsUp, color: "text-red-500" },
        { label: "评论", value: data.comments, icon: MessageSquare, color: "text-green-500" },
        { label: "分享", value: data.shares, icon: Share2, color: "text-purple-500" },
      ]
    : [];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border">
        <a href="/tg" className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </a>
        <h1 className="text-sm font-bold">数据概览</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Period selector */}
        <div className="flex rounded-lg bg-muted p-1">
          {[
            { key: "7", label: "7天" },
            { key: "30", label: "30天" },
            { key: "90", label: "90天" },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                period === p.key
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {statsItems.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-card border border-border rounded-xl p-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                  <div className="text-xl font-bold">
                    {stat.value.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Platform status */}
            {data && data.platforms.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold mb-2 px-1">平台状态</h2>
                <div className="space-y-2">
                  {data.platforms.map((p) => (
                    <div
                      key={p.platformKey}
                      className="flex items-center justify-between bg-card border border-border rounded-xl px-3 py-2"
                    >
                      <span className="text-sm">{p.platformKey}</span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          p.status === "CONNECTED"
                            ? "bg-green-100 text-green-700"
                            : p.status === "EXPIRED"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {p.status === "CONNECTED"
                          ? "已连接"
                          : p.status === "EXPIRED"
                            ? "已过期"
                            : "未连接"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
