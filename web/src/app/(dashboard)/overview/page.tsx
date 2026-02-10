"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Globe,
  FileText,
  Eye,
  TrendingUp,
  Loader2,
} from "lucide-react";

interface DataResponse {
  totals: { views: number; likes: number; comments: number; shares: number };
  platforms: { platformKey: string; status: string }[];
  contentStats: { status: string; count: number }[];
}

interface ContentResponse {
  items: {
    id: string;
    title: string;
    contentType: string;
    status: string;
    updatedAt: string;
  }[];
  total: number;
}

export default function OverviewPage() {
  const [data, setData] = useState<DataResponse | null>(null);
  const [recentContent, setRecentContent] = useState<ContentResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [dataRes, contentRes] = await Promise.all([
          fetch("/api/data?days=30").then((r) => r.json()),
          fetch("/api/content?pageSize=5").then((r) => r.json()),
        ]);
        setData(dataRes);
        setRecentContent(contentRes);
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, []);

  const connectedPlatforms = data?.platforms?.filter(
    (p) => p.status === "CONNECTED"
  ).length ?? 0;

  const totalContent = recentContent?.total ?? 0;
  const totalViews = data?.totals?.views ?? 0;
  const totalInteractions =
    (data?.totals?.likes ?? 0) +
    (data?.totals?.comments ?? 0) +
    (data?.totals?.shares ?? 0);

  const stats = [
    { label: "已连接平台", value: String(connectedPlatforms), icon: Globe, color: "text-blue-500" },
    { label: "内容总数", value: String(totalContent), icon: FileText, color: "text-green-500" },
    { label: "总浏览量", value: totalViews.toLocaleString(), icon: Eye, color: "text-purple-500" },
    { label: "总互动数", value: totalInteractions.toLocaleString(), icon: TrendingUp, color: "text-orange-500" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">概览</h1>
        <p className="text-muted-foreground mt-1">
          欢迎回来！这是你的创作数据总览。
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
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

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>快速操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <a
              href="/content"
              className="flex items-center gap-3 rounded-lg border border-border p-4 hover:bg-muted transition-colors"
            >
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium text-sm">创建内容</div>
                <div className="text-xs text-muted-foreground">开始新的创作</div>
              </div>
            </a>
            <a
              href="/platforms"
              className="flex items-center gap-3 rounded-lg border border-border p-4 hover:bg-muted transition-colors"
            >
              <Globe className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium text-sm">连接平台</div>
                <div className="text-xs text-muted-foreground">登录你的创作平台</div>
              </div>
            </a>
            <a
              href="/chat"
              className="flex items-center gap-3 rounded-lg border border-border p-4 hover:bg-muted transition-colors"
            >
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium text-sm">AI 对话</div>
                <div className="text-xs text-muted-foreground">与 AI 助手对话</div>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Recent content */}
      <Card>
        <CardHeader>
          <CardTitle>最近内容</CardTitle>
        </CardHeader>
        <CardContent>
          {recentContent && recentContent.items.length > 0 ? (
            <div className="space-y-3">
              {recentContent.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.contentType} · {new Date(item.updatedAt).toLocaleDateString("zh-CN")}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p className="font-medium">还没有创作内容</p>
              <p className="text-sm mt-1">前往「AI 对话」开始你的第一次创作</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
