"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Send, Check, Loader2 } from "lucide-react";

interface ContentItem {
  id: string;
  title: string;
  contentType: string;
  status: string;
  platforms: string[];
}

const PLATFORM_LABELS: Record<string, string> = {
  bilibili: "B站",
  douyin: "抖音",
  xiaohongshu: "小红书",
  youtube: "YouTube",
  "weixin-mp": "公众号",
  "weixin-channels": "视频号",
  kuaishou: "快手",
  zhihu: "知乎",
  weibo: "微博",
  toutiao: "头条号",
};

export default function TelegramPublishPage() {
  const [drafts, setDrafts] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDraft, setSelectedDraft] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const token = (document.getElementById("tg-token") as HTMLInputElement)?.value;
        const res = await fetch("/api/content?status=DRAFT&pageSize=20", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        setDrafts(data.items || []);
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, []);

  const togglePlatform = (key: string) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handlePublish = async () => {
    if (!selectedDraft || selectedPlatforms.size === 0) return;

    setPublishing(true);
    try {
      const token = (document.getElementById("tg-token") as HTMLInputElement)?.value;
      const platforms = Array.from(selectedPlatforms).join(", ");
      await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: `/publish ${selectedDraft} --platforms ${platforms}`,
        }),
      });
      setPublished(true);
    } catch {
      // ignore
    }
    setPublishing(false);
  };

  if (published) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-lg font-bold mb-2">发布任务已提交</h2>
        <p className="text-sm text-muted-foreground mb-6">
          AI 助手正在处理发布任务，完成后会通过 Telegram 通知你
        </p>
        <a
          href="/tg"
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
        >
          返回首页
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border">
        <a href="/tg" className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </a>
        <h1 className="text-sm font-bold">快速发布</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Step 1: Select draft */}
        <div>
          <h2 className="text-sm font-semibold mb-3">1. 选择要发布的内容</h2>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : drafts.length > 0 ? (
            <div className="space-y-2">
              {drafts.map((draft) => (
                <button
                  key={draft.id}
                  onClick={() => setSelectedDraft(draft.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    selectedDraft === draft.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="text-sm font-medium truncate">{draft.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {draft.contentType}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              暂无草稿，先去创建内容吧
            </p>
          )}
        </div>

        {/* Step 2: Select platforms */}
        {selectedDraft && (
          <div>
            <h2 className="text-sm font-semibold mb-3">2. 选择目标平台</h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PLATFORM_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => togglePlatform(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedPlatforms.has(key)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Publish button */}
        {selectedDraft && selectedPlatforms.size > 0 && (
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50"
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {publishing ? "发布中..." : `发布到 ${selectedPlatforms.size} 个平台`}
          </button>
        )}
      </div>
    </div>
  );
}
