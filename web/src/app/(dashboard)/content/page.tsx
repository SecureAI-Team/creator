"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, FileText, Video, Image, Music, Search, Loader2 } from "lucide-react";

type ContentType = "all" | "TEXT" | "VIDEO" | "IMAGE" | "AUDIO";
type ContentStatus = "DRAFT" | "ADAPTED" | "REVIEWING" | "PUBLISHING" | "PUBLISHED" | "FAILED";

interface ContentItem {
  id: string;
  title: string;
  contentType: "TEXT" | "VIDEO" | "IMAGE" | "AUDIO";
  status: ContentStatus;
  platforms: string[];
  createdAt: string;
  updatedAt: string;
}

const typeConfig = {
  TEXT: { icon: FileText, bg: "bg-blue-50", color: "text-blue-600" },
  VIDEO: { icon: Video, bg: "bg-violet-50", color: "text-violet-600" },
  IMAGE: { icon: Image, bg: "bg-pink-50", color: "text-pink-600" },
  AUDIO: { icon: Music, bg: "bg-amber-50", color: "text-amber-600" },
};

const statusConfig: Record<ContentStatus, { label: string; bg: string; text: string; dot: string }> = {
  DRAFT: { label: "草稿", bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
  ADAPTED: { label: "已适配", bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-500" },
  REVIEWING: { label: "审核中", bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-500" },
  PUBLISHING: { label: "发布中", bg: "bg-violet-50", text: "text-violet-600", dot: "bg-violet-500" },
  PUBLISHED: { label: "已发布", bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-500" },
  FAILED: { label: "失败", bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500" },
};

const filterTabs: { key: ContentType; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "TEXT", label: "图文" },
  { key: "VIDEO", label: "视频" },
  { key: "IMAGE", label: "图片" },
  { key: "AUDIO", label: "音频" },
];

export default function ContentPage() {
  const [filter, setFilter] = useState<ContentType>("all");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("type", filter);
      if (search) params.set("q", search);
      const res = await fetch(`/api/content?${params.toString()}`);
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [filter, search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">内容管理</h1>
          <p className="text-gray-500 text-sm mt-1">
            管理你的所有创作内容 {total > 0 && `(${total} 条)`}
          </p>
        </div>
        <Button
          className="gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
          onClick={() => (window.location.href = "/chat?action=create")}
        >
          <Plus className="h-4 w-4" />
          新建内容
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex rounded-xl bg-gray-100 p-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3.5 py-1.5 text-sm rounded-lg transition-all ${
                filter === tab.key
                  ? "bg-white shadow-sm font-medium text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索内容..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl border-gray-200 bg-white"
          />
        </div>
      </div>

      {/* Content list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
        </div>
      ) : items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item) => {
            const tc = typeConfig[item.contentType];
            const sc = statusConfig[item.status];
            const Icon = tc.icon;
            return (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 hover:shadow-md hover:shadow-gray-100/80 transition-all"
              >
                <div
                  className={`h-10 w-10 rounded-xl ${tc.bg} flex items-center justify-center`}
                >
                  <Icon className={`h-5 w-5 ${tc.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {item.title}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {item.platforms.join(", ")} &middot;{" "}
                    {new Date(item.updatedAt).toLocaleDateString("zh-CN")}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                  {sc.label}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-gray-600"
                >
                  查看
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 mx-auto mb-4">
            <FileText className="h-7 w-7 text-gray-300" />
          </div>
          <h3 className="font-medium text-gray-600 mb-1">暂无内容</h3>
          <p className="text-sm text-gray-400">
            前往「AI 对话」使用自然语言创建你的第一篇内容
          </p>
        </div>
      )}
    </div>
  );
}
