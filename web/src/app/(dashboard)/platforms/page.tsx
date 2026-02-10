"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, RefreshCw, MonitorPlay, Loader2 } from "lucide-react";

const PLATFORMS = [
  { key: "bilibili", name: "哔哩哔哩", color: "#00A1D6", url: "https://member.bilibili.com", types: ["视频", "图文"] },
  { key: "douyin", name: "抖音", color: "#000000", url: "https://creator.douyin.com", types: ["短视频"] },
  { key: "xiaohongshu", name: "小红书", color: "#FE2C55", url: "https://creator.xiaohongshu.com", types: ["图文", "视频"] },
  { key: "youtube", name: "YouTube", color: "#FF0000", url: "https://studio.youtube.com", types: ["视频"] },
  { key: "weixin-mp", name: "微信公众号", color: "#07C160", url: "https://mp.weixin.qq.com", types: ["图文"] },
  { key: "weixin-channels", name: "微信视频号", color: "#07C160", url: "https://channels.weixin.qq.com", types: ["视频"] },
  { key: "kuaishou", name: "快手", color: "#FF4906", url: "https://cp.kuaishou.com", types: ["短视频"] },
  { key: "zhihu", name: "知乎", color: "#0066FF", url: "https://www.zhihu.com/creator", types: ["图文", "视频"] },
  { key: "weibo", name: "微博", color: "#E6162D", url: "https://weibo.com", types: ["图文", "视频"] },
  { key: "toutiao", name: "头条号", color: "#F85959", url: "https://mp.toutiao.com", types: ["图文", "视频"] },
];

type ConnectionStatus = "CONNECTED" | "EXPIRED" | "DISCONNECTED";

interface PlatformState {
  status: ConnectionStatus;
  lastChecked?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  CONNECTED: { label: "已连接", className: "bg-green-100 text-green-700" },
  EXPIRED: { label: "已过期", className: "bg-yellow-100 text-yellow-700" },
  DISCONNECTED: { label: "未连接", className: "bg-gray-100 text-gray-500" },
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
      await fetch("/api/platforms/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: key }),
      });
      window.open("/vnc?platform=" + key, "_blank", "width=1300,height=850");
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
        [key]: {
          status: data.status,
          lastChecked: data.lastChecked,
        },
      }));
    } catch {
      // ignore
    }
    setCheckLoading(null);
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
        <h1 className="text-3xl font-bold">平台管理</h1>
        <p className="text-muted-foreground mt-1">
          管理你的内容平台连接。点击「登录」通过远程浏览器完成平台认证。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLATFORMS.map((platform) => {
          const state = getStatus(platform.key);
          const sc = statusConfig[state.status] || statusConfig.DISCONNECTED;
          return (
            <Card key={platform.key} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: platform.color }}
                    >
                      {platform.name[0]}
                    </div>
                    <div>
                      <CardTitle className="text-base">{platform.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {platform.types.join(" / ")}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={sc.className} variant="secondary">
                    {sc.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {state.lastChecked && (
                  <p className="text-xs text-muted-foreground mb-3">
                    上次检查: {new Date(state.lastChecked).toLocaleString("zh-CN")}
                  </p>
                )}
                <div className="flex gap-2">
                  {state.status === "CONNECTED" ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleCheck(platform.key)}
                        disabled={checkLoading === platform.key}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${checkLoading === platform.key ? "animate-spin" : ""}`} />
                        检查
                      </Button>
                      <a href={platform.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleLogin(platform.key)}
                      disabled={loginLoading === platform.key}
                    >
                      <MonitorPlay className="h-3.5 w-3.5 mr-1.5" />
                      {loginLoading === platform.key ? "正在打开..." : "登录"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
