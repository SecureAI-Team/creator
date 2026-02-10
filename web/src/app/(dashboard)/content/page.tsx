"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Video, Image, Music, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

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

const typeIcons = {
  TEXT: FileText,
  VIDEO: Video,
  IMAGE: Image,
  AUDIO: Music,
};

const statusConfig: Record<ContentStatus, { label: string; className: string }> = {
  DRAFT: { label: "草稿", className: "bg-gray-100 text-gray-600" },
  ADAPTED: { label: "已适配", className: "bg-blue-100 text-blue-600" },
  REVIEWING: { label: "审核中", className: "bg-yellow-100 text-yellow-600" },
  PUBLISHING: { label: "发布中", className: "bg-purple-100 text-purple-600" },
  PUBLISHED: { label: "已发布", className: "bg-green-100 text-green-600" },
  FAILED: { label: "失败", className: "bg-red-100 text-red-600" },
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

  const handleCreate = () => {
    // Navigate to chat to create content via AI
    window.location.href = "/chat?action=create";
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">内容管理</h1>
          <p className="text-muted-foreground mt-1">
            管理你的所有创作内容 {total > 0 && `(${total} 条)`}
          </p>
        </div>
        <Button className="gap-2" onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          新建内容
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex rounded-lg bg-muted p-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filter === tab.key
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索内容..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Content list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => {
            const Icon = typeIcons[item.contentType];
            const sc = statusConfig[item.status];
            return (
              <Card key={item.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {item.platforms.join(", ")} · {new Date(item.updatedAt).toLocaleDateString("zh-CN")}
                    </div>
                  </div>
                  <Badge className={sc.className} variant="secondary">
                    {sc.label}
                  </Badge>
                  <Button variant="ghost" size="sm">查看</Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
            <h3 className="font-medium mb-1">暂无内容</h3>
            <p className="text-sm text-muted-foreground">
              前往「AI 对话」使用自然语言创建你的第一篇内容
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
