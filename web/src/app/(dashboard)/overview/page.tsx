"use client";

import { useEffect, useState } from "react";
import {
  Globe,
  FileText,
  Eye,
  TrendingUp,
  Loader2,
  ArrowRight,
  MessageSquare,
  Sparkles,
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

const statusLabels: Record<string, string> = {
  DRAFT: "草稿",
  ADAPTED: "已适配",
  REVIEWING: "审核中",
  PUBLISHING: "发布中",
  PUBLISHED: "已发布",
  FAILED: "失败",
};

export default function OverviewPage() {
  const [data, setData] = useState<DataResponse | null>(null);
  const [recentContent, setRecentContent] = useState<ContentResponse | null>(
    null
  );
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

  const connectedPlatforms =
    data?.platforms?.filter((p) => p.status === "CONNECTED").length ?? 0;
  const totalContent = recentContent?.total ?? 0;
  const totalViews = data?.totals?.views ?? 0;
  const totalInteractions =
    (data?.totals?.likes ?? 0) +
    (data?.totals?.comments ?? 0) +
    (data?.totals?.shares ?? 0);

  const stats = [
    {
      label: "已连接平台",
      value: String(connectedPlatforms),
      icon: Globe,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "内容总数",
      value: String(totalContent),
      icon: FileText,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "总浏览量",
      value: totalViews.toLocaleString(),
      icon: Eye,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
    },
    {
      label: "总互动数",
      value: totalInteractions.toLocaleString(),
      icon: TrendingUp,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-8 text-white shadow-lg shadow-blue-500/20">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-6 w-6" />
          <h1 className="text-2xl font-bold">欢迎回来</h1>
        </div>
        <p className="text-blue-100 text-sm max-w-xl">
          这是你的创作数据总览。连接平台、使用 AI 工具创作内容，然后一键多平台发布。
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-gray-100 bg-white p-5 transition-all hover:shadow-md hover:shadow-gray-100/80"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stat.value}
                </p>
              </div>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.iconBg}`}
              >
                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              href: "/content",
              icon: FileText,
              label: "创建内容",
              desc: "开始新的创作",
              iconBg: "bg-blue-50",
              iconColor: "text-blue-600",
            },
            {
              href: "/platforms",
              icon: Globe,
              label: "连接平台",
              desc: "登录你的创作平台",
              iconBg: "bg-emerald-50",
              iconColor: "text-emerald-600",
            },
            {
              href: "/chat",
              icon: MessageSquare,
              label: "AI 对话",
              desc: "与 AI 助手对话",
              iconBg: "bg-violet-50",
              iconColor: "text-violet-600",
            },
          ].map((action) => (
            <a
              key={action.href}
              href={action.href}
              className="group flex items-center gap-4 rounded-xl border border-gray-100 p-4 hover:border-blue-200 hover:bg-blue-50/30 transition-all"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.iconBg}`}
              >
                <action.icon className={`h-5 w-5 ${action.iconColor}`} />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900">
                  {action.label}
                </div>
                <div className="text-xs text-gray-400">{action.desc}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
            </a>
          ))}
        </div>
      </div>

      {/* Recent content */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">最近内容</h2>
          <a
            href="/content"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            查看全部
          </a>
        </div>
        {recentContent && recentContent.items.length > 0 ? (
          <div className="space-y-2">
            {recentContent.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                  <FileText className="h-4 w-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {item.title}
                  </div>
                  <div className="text-xs text-gray-400">
                    {item.contentType} &middot;{" "}
                    {new Date(item.updatedAt).toLocaleDateString("zh-CN")}
                  </div>
                </div>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {statusLabels[item.status] || item.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 mx-auto mb-4">
              <FileText className="h-7 w-7 text-gray-300" />
            </div>
            <p className="font-medium text-gray-600">还没有创作内容</p>
            <p className="text-sm text-gray-400 mt-1">
              前往「AI 对话」开始你的第一次创作
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
