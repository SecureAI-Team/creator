"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Save,
  FileText,
  Video,
  Image,
  Music,
  Loader2,
  Send,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

type ContentStatus = "DRAFT" | "ADAPTED" | "REVIEWING" | "PUBLISHING" | "PUBLISHED" | "FAILED";
type PublishStatus = "PENDING" | "PUBLISHING" | "PUBLISHED" | "FAILED";

interface PublishRecord {
  id: string;
  platform: string;
  status: PublishStatus;
  platformUrl?: string;
  publishedAt?: string;
  errorMessage?: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  createdAt: string;
}

interface ContentItem {
  id: string;
  title: string;
  contentType: "TEXT" | "VIDEO" | "IMAGE" | "AUDIO";
  status: ContentStatus;
  body?: string;
  mediaUrl?: string;
  coverUrl?: string;
  tags: string[];
  platforms: string[];
  publishRecords: PublishRecord[];
  createdAt: string;
  updatedAt: string;
}

const typeConfig = {
  TEXT: { icon: FileText, label: "图文", bg: "bg-blue-50", color: "text-blue-600" },
  VIDEO: { icon: Video, label: "视频", bg: "bg-violet-50", color: "text-violet-600" },
  IMAGE: { icon: Image, label: "图片", bg: "bg-pink-50", color: "text-pink-600" },
  AUDIO: { icon: Music, label: "音频", bg: "bg-amber-50", color: "text-amber-600" },
};

const statusConfig: Record<ContentStatus, { label: string; bg: string; text: string; dot: string }> = {
  DRAFT: { label: "草稿", bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
  ADAPTED: { label: "已适配", bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-500" },
  REVIEWING: { label: "审核中", bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-500" },
  PUBLISHING: { label: "发布中", bg: "bg-violet-50", text: "text-violet-600", dot: "bg-violet-500" },
  PUBLISHED: { label: "已发布", bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-500" },
  FAILED: { label: "失败", bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500" },
};

const publishStatusIcon: Record<PublishStatus, { icon: typeof CheckCircle2; color: string }> = {
  PENDING: { icon: Clock, color: "text-gray-400" },
  PUBLISHING: { icon: Loader2, color: "text-violet-500" },
  PUBLISHED: { icon: CheckCircle2, color: "text-emerald-500" },
  FAILED: { icon: XCircle, color: "text-red-500" },
};

const PLATFORMS = [
  { key: "bilibili", name: "哔哩哔哩", initial: "B", color: "from-[#00A1D6] to-[#0091c2]" },
  { key: "douyin", name: "抖音", initial: "抖", color: "from-[#1a1a1a] to-[#333333]" },
  { key: "xiaohongshu", name: "小红书", initial: "小", color: "from-[#FE2C55] to-[#e0264c]" },
  { key: "youtube", name: "YouTube", initial: "Y", color: "from-[#FF0000] to-[#cc0000]" },
  { key: "weixin-mp", name: "微信公众号", initial: "公", color: "from-[#07C160] to-[#06a050]" },
  { key: "weixin-channels", name: "微信视频号", initial: "视", color: "from-[#07C160] to-[#06a050]" },
  { key: "kuaishou", name: "快手", initial: "快", color: "from-[#FF4906] to-[#e04105]" },
  { key: "zhihu", name: "知乎", initial: "知", color: "from-[#0066FF] to-[#0055dd]" },
  { key: "weibo", name: "微博", initial: "微", color: "from-[#E6162D] to-[#cc1326]" },
  { key: "toutiao", name: "头条号", initial: "头", color: "from-[#F85959] to-[#e04e4e]" },
];

export default function ContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contentId = params.id as string;

  const [item, setItem] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Edit form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");

  // Publish state
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);

  // Adapt state
  const [adapting, setAdapting] = useState<string | null>(null);
  const [adaptResult, setAdaptResult] = useState<Record<string, { title: string; body: string; tags: string[] }>>({});

  const fetchItem = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/content/${contentId}`);
      if (res.ok) {
        const found = await res.json();
        setItem(found);
        setTitle(found.title);
        setBody(found.body || "");
        setTags(found.tags?.join(", ") || "");
        setMediaUrl(found.mediaUrl || "");
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [contentId]);

  // Fetch connected platforms
  useEffect(() => {
    async function loadPlatforms() {
      try {
        const res = await fetch("/api/data?days=1");
        const data = await res.json();
        const connected = (data.platforms || [])
          .filter((p: { status: string }) => p.status === "CONNECTED")
          .map((p: { platformKey: string }) => p.platformKey);
        setConnectedPlatforms(connected);
      } catch {
        // ignore
      }
    }
    loadPlatforms();
  }, []);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);
    try {
      const res = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          title,
          body: body || undefined,
          mediaUrl: mediaUrl || undefined,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setItem({ ...item, ...updated, publishRecords: item.publishRecords });
      }
    } catch {
      // ignore
    }
    setSaving(false);
  };

  const togglePlatform = (key: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handlePublish = async () => {
    if (!item || selectedPlatforms.length === 0) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/content/${item.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platforms: selectedPlatforms }),
      });
      if (res.ok) {
        // Refresh to get updated publish records
        setTimeout(fetchItem, 1000);
        setSelectedPlatforms([]);
      }
    } catch {
      // ignore
    }
    setPublishing(false);
  };

  const handleAdapt = async (platform: string) => {
    if (!item) return;
    setAdapting(platform);
    try {
      const res = await fetch(`/api/content/${item.id}/adapt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const data = await res.json();
      if (data.adapted) {
        setAdaptResult((prev) => ({ ...prev, [platform]: data.adapted }));
      }
    } catch {
      // ignore
    }
    setAdapting(null);
  };

  const applyAdaptation = (platform: string) => {
    const adapted = adaptResult[platform];
    if (!adapted) return;
    setTitle(adapted.title || title);
    setBody(adapted.body || body);
    if (adapted.tags?.length) {
      setTags(adapted.tags.join(", "));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-24">
        <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-600">内容未找到</h2>
        <Button variant="outline" className="mt-4 rounded-xl" onClick={() => router.push("/content")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> 返回内容列表
        </Button>
      </div>
    );
  }

  const tc = typeConfig[item.contentType];
  const sc = statusConfig[item.status];
  const TypeIcon = tc.icon;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="rounded-xl text-gray-500" onClick={() => router.push("/content")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> 返回
        </Button>
        <div className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-lg ${tc.bg} flex items-center justify-center`}>
            <TypeIcon className={`h-4 w-4 ${tc.color}`} />
          </div>
          <span className="text-sm text-gray-500">{tc.label}</span>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
          {sc.label}
        </span>
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="rounded-xl border-gray-200 text-gray-600" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
          保存
        </Button>
      </div>

      {/* Edit form */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">标题</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl border-gray-200" placeholder="内容标题" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">正文</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm min-h-[160px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="内容正文..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">媒体 URL</label>
            <Input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} className="rounded-xl border-gray-200" placeholder="视频/图片链接" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">标签</label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} className="rounded-xl border-gray-200" placeholder="用逗号分隔" />
          </div>
        </div>
        <div className="text-xs text-gray-400">
          创建于 {new Date(item.createdAt).toLocaleString("zh-CN")} | 更新于 {new Date(item.updatedAt).toLocaleString("zh-CN")}
        </div>
      </div>

      {/* Publish panel */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">发布到平台</h3>
        <p className="text-sm text-gray-500">选择要发布的平台（仅显示已连接的平台）</p>

        {connectedPlatforms.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">暂无已连接的平台</p>
            <Button variant="outline" size="sm" className="mt-2 rounded-xl" onClick={() => router.push("/platforms")}>
              前往连接平台
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {PLATFORMS.filter((p) => connectedPlatforms.includes(p.key)).map((p) => {
                const selected = selectedPlatforms.includes(p.key);
                const alreadyPublished = item.publishRecords?.some(
                  (r) => r.platform === p.key && r.status === "PUBLISHED"
                );
                return (
                  <button
                    key={p.key}
                    onClick={() => togglePlatform(p.key)}
                    disabled={alreadyPublished}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-all ${
                      alreadyPublished
                        ? "border-emerald-200 bg-emerald-50 text-emerald-600 cursor-default"
                        : selected
                        ? "border-blue-300 bg-blue-50 text-blue-700 shadow-sm"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <div className={`h-6 w-6 rounded-md bg-gradient-to-br ${p.color} flex items-center justify-center text-white text-xs font-bold`}>
                      {p.initial}
                    </div>
                    <span className="truncate">{p.name}</span>
                    {alreadyPublished && <CheckCircle2 className="h-3.5 w-3.5 ml-auto text-emerald-500" />}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-gray-400">
                {selectedPlatforms.length > 0
                  ? `已选择 ${selectedPlatforms.length} 个平台`
                  : "请选择要发布的平台"}
              </span>
              <Button
                size="sm"
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
                onClick={handlePublish}
                disabled={publishing || selectedPlatforms.length === 0}
              >
                {publishing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <Send className="h-4 w-4 mr-1.5" />
                )}
                发布到选中平台
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Content Adaptation */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">内容适配</h3>
        <p className="text-sm text-gray-500">
          使用 AI 将内容适配为各平台的最佳格式（标题长度、正文风格、标签数量等）
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {PLATFORMS.map((p) => (
            <div key={p.key} className="space-y-2">
              <button
                onClick={() => handleAdapt(p.key)}
                disabled={adapting === p.key}
                className="w-full flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:border-blue-300 hover:bg-blue-50/50 transition-all"
              >
                <div className={`h-5 w-5 rounded bg-gradient-to-br ${p.color} flex items-center justify-center text-white text-[10px] font-bold`}>
                  {p.initial}
                </div>
                {adapting === p.key ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <span className="truncate">{p.name}</span>
                )}
              </button>
              {adaptResult[p.key] && (
                <div className="text-xs bg-gray-50 rounded-lg p-2 space-y-1">
                  <div className="font-medium text-gray-700 truncate">
                    {adaptResult[p.key].title}
                  </div>
                  <div className="text-gray-400 line-clamp-2">
                    {adaptResult[p.key].body?.substring(0, 100)}...
                  </div>
                  <button
                    onClick={() => applyAdaptation(p.key)}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    应用此适配
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Publish records */}
      {item.publishRecords && item.publishRecords.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">发布记录</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {item.publishRecords.map((record) => {
              const psi = publishStatusIcon[record.status];
              const StatusIcon = psi.icon;
              const platInfo = PLATFORMS.find((p) => p.key === record.platform);
              return (
                <div key={record.id} className="flex items-center gap-4 px-6 py-3">
                  <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${platInfo?.color || "from-gray-400 to-gray-500"} flex items-center justify-center text-white text-xs font-bold`}>
                    {platInfo?.initial || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{platInfo?.name || record.platform}</div>
                    <div className="text-xs text-gray-400">
                      {record.publishedAt ? new Date(record.publishedAt).toLocaleString("zh-CN") : new Date(record.createdAt).toLocaleString("zh-CN")}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {record.status === "PUBLISHED" && (
                      <>
                        <span>{record.views} 浏览</span>
                        <span>{record.likes} 赞</span>
                        <span>{record.comments} 评论</span>
                      </>
                    )}
                    {record.errorMessage && (
                      <span className="text-red-500 truncate max-w-[200px]" title={record.errorMessage}>
                        {record.errorMessage}
                      </span>
                    )}
                  </div>
                  <StatusIcon className={`h-4 w-4 ${psi.color} ${record.status === "PUBLISHING" ? "animate-spin" : ""}`} />
                  {record.platformUrl && (
                    <a href={record.platformUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
