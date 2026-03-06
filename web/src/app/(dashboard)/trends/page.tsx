"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TrendingUp, RefreshCw, Loader2, Flame, PenLine } from "lucide-react";

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

interface TrendItem {
  id: string;
  rank: number;
  title: string;
  platform: string;
  heat: number;
}

interface TrendsResponse {
  trends: TrendItem[];
  lastUpdated: string;
}

export default function TrendsPage() {
  const router = useRouter();
  const [platform, setPlatform] = useState("all");
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrends = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (platform !== "all") params.set("platform", platform);
      const res = await fetch(`/api/trends?${params.toString()}`);
      const data: TrendsResponse = await res.json();
      setTrends(data.trends || []);
      setLastUpdated(data.lastUpdated || null);
    } catch {
      setTrends([]);
    }
    setLoading(false);
  }, [platform]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/trends/refresh", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        await fetchTrends();
      }
    } catch {
      /* ignore */
    }
    setRefreshing(false);
  };

  const handleCreateFromTrend = (title: string) => {
    router.push(`/chat?action=create&topic=${encodeURIComponent(title)}`);
  };

  const filteredTrends =
    platform === "all"
      ? trends
      : trends.filter((t) => t.platform === platform);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">热点追踪</h1>
          <p className="text-gray-500 text-sm mt-1">实时跟踪各平台热门话题</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          刷新
        </Button>
      </div>

      {/* Platform tabs */}
      <div className="flex rounded-xl bg-gray-100 p-1 overflow-x-auto">
        {PLATFORMS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPlatform(p.key)}
            className={`px-3.5 py-1.5 text-sm rounded-lg transition-all shrink-0 ${
              platform === p.key
                ? "bg-white shadow-sm font-medium text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Trends list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
        </div>
      ) : filteredTrends.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center">
          <div className="flex justify-center mb-4">
            <Flame className="h-12 w-12 text-gray-200" />
          </div>
          <p className="text-gray-500 mb-2">暂无热点数据，点击刷新采集最新热点</p>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2 rounded-xl"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            刷新
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTrends.map((trend) => {
            const platInfo = PLATFORMS.find((p) => p.key === trend.platform);
            return (
              <div
                key={trend.id}
                className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 hover:shadow-md hover:shadow-gray-100/80 transition-all"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 text-orange-600 font-bold text-sm shrink-0">
                  {trend.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{trend.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gradient-to-r ${platInfo?.color || "from-gray-400 to-gray-500"} text-white`}
                    >
                      {platInfo?.label || trend.platform}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <TrendingUp className="h-3.5 w-3.5" />
                      {trend.heat}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCreateFromTrend(trend.title)}
                  className="gap-1.5 shrink-0 rounded-xl"
                >
                  <PenLine className="h-3.5 w-3.5" />
                  以此创作
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {lastUpdated && filteredTrends.length > 0 && (
        <p className="text-xs text-gray-400">上次更新: {new Date(lastUpdated).toLocaleString("zh-CN")}</p>
      )}
    </div>
  );
}
