"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw, MonitorPlay, Loader2 } from "lucide-react";

const PLATFORMS = [
  { key: "bilibili", name: "哔哩哔哩", initial: "B", color: "from-[#00A1D6] to-[#0091c2]", url: "https://member.bilibili.com", types: ["视频", "图文"] },
  { key: "douyin", name: "抖音", initial: "抖", color: "from-[#1a1a1a] to-[#333333]", url: "https://creator.douyin.com", types: ["短视频"] },
  { key: "xiaohongshu", name: "小红书", initial: "小", color: "from-[#FE2C55] to-[#e0264c]", url: "https://creator.xiaohongshu.com", types: ["图文", "视频"] },
  { key: "youtube", name: "YouTube", initial: "Y", color: "from-[#FF0000] to-[#cc0000]", url: "https://studio.youtube.com", types: ["视频"] },
  { key: "weixin-mp", name: "微信公众号", initial: "公", color: "from-[#07C160] to-[#06a050]", url: "https://mp.weixin.qq.com", types: ["图文"] },
  { key: "weixin-channels", name: "微信视频号", initial: "视", color: "from-[#07C160] to-[#06a050]", url: "https://channels.weixin.qq.com", types: ["视频"] },
  { key: "kuaishou", name: "快手", initial: "快", color: "from-[#FF4906] to-[#e04105]", url: "https://cp.kuaishou.com", types: ["短视频"] },
  { key: "zhihu", name: "知乎", initial: "知", color: "from-[#0066FF] to-[#0055dd]", url: "https://www.zhihu.com/creator", types: ["图文", "视频"] },
  { key: "weibo", name: "微博", initial: "微", color: "from-[#E6162D] to-[#cc1326]", url: "https://weibo.com", types: ["图文", "视频"] },
  { key: "toutiao", name: "头条号", initial: "头", color: "from-[#F85959] to-[#e04e4e]", url: "https://mp.toutiao.com", types: ["图文", "视频"] },
];

type ConnectionStatus = "CONNECTED" | "EXPIRED" | "DISCONNECTED";

interface PlatformState {
  status: ConnectionStatus;
  lastChecked?: string;
}

const statusConfig: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  CONNECTED: { label: "已连接", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  EXPIRED: { label: "已过期", dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700" },
  DISCONNECTED: { label: "未连接", dot: "bg-gray-300", bg: "bg-gray-100", text: "text-gray-500" },
};

export default function PlatformsPage() {
  const [connections, setConnections] = useState<Record<string, PlatformState>>({});
  const [loginLoading, setLoginLoading] = useState<string | null>(null);
  const [checkLoading, setCheckLoading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPlatforms() {
      try {
        const res = await fetch("/api/data?days=1");
        const data = await res.json();
        if (data.platforms) {
          const map: Record<string, PlatformState> = {};
          for (const p of data.platforms) {
            map[p.platformKey] = {
              status: p.status as ConnectionStatus,
              lastChecked: p.lastChecked,
            };
          }
          setConnections(map);
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    loadPlatforms();
  }, []);

  const getStatus = (key: string): PlatformState =>
    connections[key] || { status: "DISCONNECTED" };

  const handleLogin = async (key: string) => {
    setLoginLoading(key);
    try {
      const agentRes = await fetch("/api/agent");
      const agentData = agentRes.ok ? await agentRes.json() : {};
      const hasBridge = !!agentData?.hasBridge;

      const loginRes = await fetch("/api/platforms/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: key }),
      });
      const loginData = loginRes.ok ? await loginRes.json() : {};
      const message = loginData?.message || "请完成登录";

      if (hasBridge) {
        // Local mode: show message and open platform URL in system browser so user can log in
        const platform = PLATFORMS.find((p) => p.key === key);
        const platformUrl = platform?.url;
        if (platformUrl) {
          const api = (window as Window & { creatorDesktop?: { openExternal?: (url: string) => void } }).creatorDesktop;
          if (api?.openExternal) api.openExternal(platformUrl);
          else window.open(platformUrl, "_blank");
        }
        alert(message);
      } else {
        window.open("/vnc?platform=" + key, "_blank", "width=1300,height=850");
      }
    } catch {
      // ignore
    }
    setLoginLoading(null);
  };

  const handleCheck = async (key: string) => {
    setCheckLoading(key);
    try {
      const res = await fetch(`/api/platforms/${key}/check`);
      const data = await res.json();
      setConnections((prev) => ({
        ...prev,
        [key]: { status: data.status, lastChecked: data.lastChecked },
      }));
    } catch {
      // ignore
    }
    setCheckLoading(null);
  };

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
        <h1 className="text-2xl font-bold text-gray-900">平台管理</h1>
        <p className="text-gray-500 text-sm mt-1">
          管理你的内容平台连接。点击「登录」通过远程浏览器完成平台认证。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLATFORMS.map((platform) => {
          const state = getStatus(platform.key);
          const sc = statusConfig[state.status] || statusConfig.DISCONNECTED;
          return (
            <div
              key={platform.key}
              className="rounded-2xl border border-gray-100 bg-white p-5 transition-all hover:shadow-md hover:shadow-gray-100/80"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-11 w-11 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center text-white font-bold text-sm shadow-sm`}
                  >
                    {platform.initial}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {platform.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {platform.types.join(" / ")}
                    </div>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                  {sc.label}
                </span>
              </div>

              {state.lastChecked && (
                <p className="text-xs text-gray-400 mb-3">
                  上次检查:{" "}
                  {new Date(state.lastChecked).toLocaleString("zh-CN")}
                </p>
              )}

              <div className="flex gap-2">
                {state.status === "CONNECTED" ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50"
                      onClick={() => handleCheck(platform.key)}
                      disabled={checkLoading === platform.key}
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 mr-1.5 ${
                          checkLoading === platform.key ? "animate-spin" : ""
                        }`}
                      />
                      检查
                    </Button>
                    <a
                      href={platform.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  </>
                ) : (
                  <Button
                    size="sm"
                    className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
                    onClick={() => handleLogin(platform.key)}
                    disabled={loginLoading === platform.key}
                  >
                    <MonitorPlay className="h-3.5 w-3.5 mr-1.5" />
                    {loginLoading === platform.key ? "正在打开..." : "登录"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
