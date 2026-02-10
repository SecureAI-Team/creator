"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MonitorPlay, ArrowLeft, Maximize2, Minimize2 } from "lucide-react";

function VNCContent() {
  const searchParams = useSearchParams();
  const platform = searchParams.get("platform");
  const tool = searchParams.get("tool");
  const [fullscreen, setFullscreen] = useState(false);

  const target = platform || tool || "unknown";
  const targetLabel = platform
    ? `平台登录: ${platform}`
    : tool
      ? `工具登录: ${tool}`
      : "远程浏览器";

  // VNC URL: noVNC connects to the user's VNC session on the server
  // In production, this URL is derived from the user's allocated VNC port
  const vncUrl = `/vnc-proxy/vnc.html?autoconnect=true&resize=scale&quality=6&target=${encodeURIComponent(target)}`;

  return (
    <div className={`space-y-4 ${fullscreen ? "fixed inset-0 z-50 bg-background p-4" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href={platform ? "/platforms" : "/tools"}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回
            </Button>
          </a>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <MonitorPlay className="h-5 w-5 text-primary" />
              {targetLabel}
            </h1>
            <p className="text-sm text-muted-foreground">
              在远程浏览器中完成登录操作，登录后关闭此窗口即可
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFullscreen((f) => !f)}
        >
          {fullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Tips */}
      {!fullscreen && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">操作提示</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>1. 在下方远程浏览器中正常登录你的 {platform || tool} 账号</li>
              <li>2. 登录成功后，系统会自动保存你的登录状态</li>
              <li>3. 如遇验证码，请在远程浏览器中正常完成验证</li>
              <li>4. 完成后返回平台/工具管理页面确认状态</li>
            </ul>
          </CardContent>
        </Card>
      )}

      {/* VNC iframe */}
      <Card className={fullscreen ? "flex-1" : ""}>
        <CardContent className="p-0">
          <div
            className={`relative bg-black rounded-lg overflow-hidden ${
              fullscreen ? "h-[calc(100vh-120px)]" : "h-[600px]"
            }`}
          >
            <iframe
              src={vncUrl}
              className="w-full h-full border-0"
              title="远程浏览器"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
              远程浏览器 · {target}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VNCPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <MonitorPlay className="h-8 w-8 animate-pulse text-muted-foreground" />
        </div>
      }
    >
      <VNCContent />
    </Suspense>
  );
}
