"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MonitorPlay, Loader2 } from "lucide-react";

const TOOL_CATEGORIES = [
  {
    label: "文本生成",
    tools: [
      { key: "chatgpt", name: "ChatGPT Deep Thinking", url: "https://chat.openai.com" },
      { key: "claude", name: "Claude", url: "https://claude.ai" },
      { key: "deepseek", name: "DeepSeek", url: "https://chat.deepseek.com" },
      { key: "gemini", name: "Gemini", url: "https://gemini.google.com" },
      { key: "kimi", name: "Kimi", url: "https://kimi.moonshot.cn" },
      { key: "qwen-web", name: "通义千问 Web", url: "https://tongyi.aliyun.com/qianwen/" },
    ],
  },
  {
    label: "视频生成",
    tools: [
      { key: "notebooklm", name: "NotebookLM Studio", url: "https://notebooklm.google.com" },
      { key: "kling", name: "可灵 AI", url: "https://klingai.kuaishou.com" },
      { key: "jimeng", name: "即梦 AI", url: "https://jimeng.jianying.com" },
      { key: "sora", name: "Sora", url: "https://sora.com" },
      { key: "runway", name: "Runway", url: "https://app.runwayml.com" },
    ],
  },
  {
    label: "图片生成",
    tools: [
      { key: "midjourney", name: "Midjourney", url: "https://www.midjourney.com" },
      { key: "dalle", name: "DALL-E", url: "https://chat.openai.com" },
      { key: "tongyi-wanxiang", name: "通义万相", url: "https://tongyi.aliyun.com/wanxiang/" },
    ],
  },
  {
    label: "音频/TTS",
    tools: [
      { key: "suno", name: "Suno AI", url: "https://suno.com" },
      { key: "elevenlabs", name: "ElevenLabs", url: "https://elevenlabs.io" },
      { key: "fishaudio", name: "Fish Audio", url: "https://fish.audio" },
    ],
  },
  {
    label: "数字人/Avatar",
    tools: [
      { key: "heygen", name: "HeyGen", url: "https://app.heygen.com" },
      { key: "chanjing", name: "蝉镜 AI", url: "https://www.chanjing.cc" },
    ],
  },
];

type ToolStatus = "CONNECTED" | "DISCONNECTED";

interface ToolState {
  enabled: boolean;
  status: ToolStatus;
}

export default function ToolsPage() {
  const [tools, setTools] = useState<Record<string, ToolState>>({});
  const [loading, setLoading] = useState(true);

  const loadTools = useCallback(async () => {
    try {
      const res = await fetch("/api/users/tools");
      const data = await res.json();
      const map: Record<string, ToolState> = {};
      for (const t of data.tools || []) {
        map[t.toolKey] = {
          enabled: t.enabled,
          status: (t.status as ToolStatus) || "DISCONNECTED",
        };
      }
      setTools(map);
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTools();
  }, [loadTools]);

  const getToolState = (key: string): ToolState =>
    tools[key] || { enabled: false, status: "DISCONNECTED" };

  const toggleTool = async (key: string) => {
    const current = getToolState(key);
    const newEnabled = !current.enabled;

    // Optimistic update
    setTools((prev) => ({
      ...prev,
      [key]: { ...current, enabled: newEnabled },
    }));

    try {
      await fetch("/api/users/tools", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolKey: key, enabled: newEnabled }),
      });
    } catch {
      // Revert on error
      setTools((prev) => ({
        ...prev,
        [key]: current,
      }));
    }
  };

  const handleLogin = (key: string) => {
    window.open("/vnc?tool=" + key, "_blank", "width=1300,height=850");
  };

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
        <h1 className="text-3xl font-bold">AI 工具</h1>
        <p className="text-muted-foreground mt-1">
          管理你的 AI 创作工具。启用的工具需要先完成浏览器登录。
        </p>
      </div>

      {TOOL_CATEGORIES.map((category) => (
        <div key={category.label}>
          <h2 className="text-lg font-semibold mb-4">{category.label}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {category.tools.map((tool) => {
              const state = getToolState(tool.key);
              return (
                <Card
                  key={tool.key}
                  className={state.enabled ? "" : "opacity-60"}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{tool.name}</CardTitle>
                      <button
                        onClick={() => toggleTool(tool.key)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          state.enabled ? "bg-primary" : "bg-muted"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                            state.enabled ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                    <CardDescription className="text-xs truncate">
                      {tool.url}
                    </CardDescription>
                  </CardHeader>
                  {state.enabled && (
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="secondary"
                          className={
                            state.status === "CONNECTED"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }
                        >
                          {state.status === "CONNECTED" ? "已登录" : "未登录"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLogin(tool.key)}
                        >
                          <MonitorPlay className="h-3.5 w-3.5 mr-1.5" />
                          {state.status === "CONNECTED" ? "重新登录" : "登录"}
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
