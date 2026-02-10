"use client";

import { useState, useEffect } from "react";
import {
  FileText, Video, Image, Music, Settings2, ExternalLink, Loader2, Sparkles,
} from "lucide-react";

interface Tool {
  id: string;
  name: string;
  category: string;
  url: string;
  description?: string;
  enabled: boolean;
}

type Category = {
  key: string;
  label: string;
  icon: typeof FileText;
  iconBg: string;
  iconColor: string;
};

const categories: Category[] = [
  { key: "text", label: "文本生成", icon: FileText, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
  { key: "video", label: "视频生成", icon: Video, iconBg: "bg-violet-50", iconColor: "text-violet-600" },
  { key: "image", label: "图片生成", icon: Image, iconBg: "bg-pink-50", iconColor: "text-pink-600" },
  { key: "audio", label: "音频/TTS", icon: Music, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
  { key: "other", label: "综合工具", icon: Settings2, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
];

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tools")
      .then((r) => r.json())
      .then((d) => setTools(d.tools || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (id: string) => {
    setToggling(id);
    try {
      const tool = tools.find((t) => t.id === id);
      if (!tool) return;
      const res = await fetch("/api/tools", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled: !tool.enabled }),
      });
      const updated = await res.json();
      setTools((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, enabled: updated.tool?.enabled ?? !t.enabled } : t
        )
      );
    } catch { /* ignore */ }
    setToggling(null);
  };

  const getCategoryTools = (category: string) =>
    tools.filter((t) => t.category === category);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI 工具</h1>
        <p className="text-gray-500 text-sm mt-1">
          管理你常用的 AI 内容生成工具。启用后可在创作流程中使用。
        </p>
      </div>

      {categories.map((cat) => {
        const catTools = getCategoryTools(cat.key);
        if (catTools.length === 0) return null;
        return (
          <div key={cat.key} className="space-y-3">
            {/* Category header */}
            <div className="flex items-center gap-2.5">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${cat.iconBg}`}>
                <cat.icon className={`h-4 w-4 ${cat.iconColor}`} />
              </div>
              <h2 className="font-semibold text-gray-900">{cat.label}</h2>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {catTools.length} 个工具
              </span>
            </div>

            {/* Tool cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {catTools.map((tool) => (
                <div
                  key={tool.id}
                  className={`rounded-2xl border p-4 transition-all ${
                    tool.enabled
                      ? "border-blue-200 bg-blue-50/30"
                      : "border-gray-100 bg-white"
                  } hover:shadow-md hover:shadow-gray-100/80`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-xs font-bold shadow-sm">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{tool.name}</div>
                        {tool.url && (
                          <a
                            href={tool.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-400 hover:text-blue-500 flex items-center gap-0.5"
                          >
                            访问 <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    {/* Toggle switch */}
                    <button
                      onClick={() => handleToggle(tool.id)}
                      disabled={toggling === tool.id}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        tool.enabled ? "bg-blue-600" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform absolute top-0.5 ${
                          tool.enabled ? "translate-x-5.5 left-0.5" : "left-0.5"
                        }`}
                        style={{
                          transform: tool.enabled
                            ? "translateX(20px)"
                            : "translateX(0px)",
                        }}
                      />
                    </button>
                  </div>
                  {tool.description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {tool.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {tools.length === 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 mx-auto mb-4">
            <Settings2 className="h-7 w-7 text-gray-300" />
          </div>
          <h3 className="font-medium text-gray-600 mb-1">暂无工具</h3>
          <p className="text-sm text-gray-400">请联系管理员添加 AI 工具配置</p>
        </div>
      )}
    </div>
  );
}
