"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check } from "lucide-react";

const PLATFORMS = [
  { key: "bilibili", name: "哔哩哔哩", color: "#00A1D6" },
  { key: "douyin", name: "抖音", color: "#000000" },
  { key: "xiaohongshu", name: "小红书", color: "#FE2C55" },
  { key: "youtube", name: "YouTube", color: "#FF0000" },
  { key: "weixin-mp", name: "微信公众号", color: "#07C160" },
  { key: "weixin-channels", name: "微信视频号", color: "#07C160" },
  { key: "kuaishou", name: "快手", color: "#FF4906" },
  { key: "zhihu", name: "知乎", color: "#0066FF" },
  { key: "weibo", name: "微博", color: "#E6162D" },
  { key: "toutiao", name: "头条号", color: "#F85959" },
];

const TOOL_CATEGORIES = [
  {
    type: "text",
    label: "文本生成",
    tools: [
      { key: "chatgpt", name: "ChatGPT" },
      { key: "claude", name: "Claude" },
      { key: "deepseek", name: "DeepSeek" },
      { key: "gemini", name: "Gemini" },
      { key: "kimi", name: "Kimi" },
      { key: "qwen-web", name: "通义千问" },
    ],
  },
  {
    type: "video",
    label: "视频生成",
    tools: [
      { key: "notebooklm", name: "NotebookLM" },
      { key: "kling", name: "可灵 AI" },
      { key: "jimeng", name: "即梦 AI" },
      { key: "sora", name: "Sora" },
      { key: "runway", name: "Runway" },
    ],
  },
  {
    type: "image",
    label: "图片生成",
    tools: [
      { key: "midjourney", name: "Midjourney" },
      { key: "dalle", name: "DALL-E" },
      { key: "tongyi-wanxiang", name: "通义万相" },
    ],
  },
  {
    type: "audio",
    label: "音频/TTS",
    tools: [
      { key: "suno", name: "Suno AI" },
      { key: "elevenlabs", name: "ElevenLabs" },
      { key: "fishaudio", name: "Fish Audio" },
    ],
  },
];

const TIMEZONES = [
  { value: "Asia/Shanghai", label: "北京时间 (UTC+8)" },
  { value: "Asia/Tokyo", label: "东京时间 (UTC+9)" },
  { value: "America/New_York", label: "美东时间 (UTC-5)" },
  { value: "America/Los_Angeles", label: "美西时间 (UTC-8)" },
  { value: "Europe/London", label: "伦敦时间 (UTC+0)" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>(["chatgpt"]);
  const [timezone, setTimezone] = useState("Asia/Shanghai");
  const [loading, setLoading] = useState(false);

  const togglePlatform = (key: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const toggleTool = (key: string) => {
    setSelectedTools((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
    );
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await fetch("/api/users/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platforms: selectedPlatforms,
          tools: selectedTools,
          timezone,
        }),
      });
      router.push("/overview");
    } catch {
      // Fallback redirect
      router.push("/overview");
    }
    setLoading(false);
  };

  const steps = [
    // Step 0: Platform selection
    {
      title: "选择你的平台",
      description: "选择你活跃的内容平台，稍后可以在设置中更改",
      content: (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PLATFORMS.map((p) => {
            const selected = selectedPlatforms.includes(p.key);
            return (
              <button
                key={p.key}
                onClick={() => togglePlatform(p.key)}
                className={`flex items-center gap-3 rounded-xl border p-4 transition-all ${
                  selected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: p.color }}
                >
                  {p.name[0]}
                </div>
                <span className="text-sm font-medium">{p.name}</span>
                {selected && (
                  <Check className="h-4 w-4 text-primary ml-auto" />
                )}
              </button>
            );
          })}
        </div>
      ),
    },
    // Step 1: Tool selection
    {
      title: "选择 AI 工具",
      description: "选择你想使用的 AI 创作工具",
      content: (
        <div className="space-y-6">
          {TOOL_CATEGORIES.map((cat) => (
            <div key={cat.type}>
              <h4 className="font-medium text-sm text-muted-foreground mb-3">
                {cat.label}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {cat.tools.map((tool) => {
                  const selected = selectedTools.includes(tool.key);
                  return (
                    <button
                      key={tool.key}
                      onClick={() => toggleTool(tool.key)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all ${
                        selected
                          ? "border-primary bg-primary/5 font-medium"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      {selected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                      {tool.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ),
    },
    // Step 2: Timezone and finish
    {
      title: "基础设置",
      description: "设置你的时区和偏好",
      content: (
        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium mb-2 block">时区</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl bg-primary/5 border border-primary/20 p-6">
            <h4 className="font-semibold mb-4">你的选择概览</h4>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">平台：</span>
                <span className="font-medium">
                  {selectedPlatforms.length > 0
                    ? selectedPlatforms
                        .map((k) => PLATFORMS.find((p) => p.key === k)?.name)
                        .join("、")
                    : "暂未选择"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">AI 工具：</span>
                <span className="font-medium">
                  {selectedTools.length > 0
                    ? selectedTools
                        .map((k) =>
                          TOOL_CATEGORIES.flatMap((c) => c.tools).find(
                            (t) => t.key === k
                          )?.name
                        )
                        .join("、")
                    : "暂未选择"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">时区：</span>
                <span className="font-medium">
                  {TIMEZONES.find((tz) => tz.value === timezone)?.label}
                </span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          {/* Progress */}
          <div className="flex items-center gap-2 mb-4">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-border"
                }`}
              />
            ))}
          </div>
          <div className="text-sm text-muted-foreground mb-1">
            步骤 {step + 1} / {steps.length}
          </div>
          <CardTitle className="text-2xl">{steps[step].title}</CardTitle>
          <CardDescription>{steps[step].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {steps[step].content}

          <div className="flex justify-between mt-8">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
            >
              上一步
            </Button>
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)}>
                下一步
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={loading}>
                {loading ? "正在初始化..." : "开始使用"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
