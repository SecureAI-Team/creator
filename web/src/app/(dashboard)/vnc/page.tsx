"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { MonitorPlay, ArrowLeft, Maximize2, Minimize2, Loader2, Info } from "lucide-react";

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

  const vncUrl = `/vnc/vnc.html?autoconnect=true&resize=scale&quality=6&target=${encodeURIComponent(target)}`;

  return (
    <div
      className={`space-y-4 ${
        fullscreen ? "fixed inset-0 z-50 bg-gray-50 p-4" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href={platform ? "/platforms" : "/tools"}>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回
            </Button>
          </a>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
                <MonitorPlay className="h-4 w-4 text-violet-600" />
              </div>
              {targetLabel}
            </h1>
            <p className="text-sm text-gray-500 ml-10">
              在远程浏览器中完成登录操作，登录后关闭此窗口即可
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFullscreen((f) => !f)}
          className="rounded-xl border-gray-200 text-gray-500 hover:bg-gray-50"
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
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">操作提示</span>
          </div>
          <ul className="text-sm text-blue-600/80 space-y-1 ml-6">
            <li>
              1. 在下方远程浏览器中正常登录你的 {platform || tool} 账号
            </li>
            <li>2. 登录成功后，系统会自动保存你的登录状态</li>
            <li>3. 如遇验证码，请在远程浏览器中正常完成验证</li>
            <li>4. 完成后返回平台/工具管理页面确认状态</li>
          </ul>
        </div>
      )}

      {/* VNC iframe */}
      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
        <div
          className={`relative bg-gray-900 ${
            fullscreen ? "h-[calc(100vh-120px)]" : "h-[600px]"
          }`}
        >
          <iframe
            src={vncUrl}
            className="w-full h-full border-0"
            title="远程浏览器"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-lg">
            远程浏览器 &middot; {target}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VNCPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
        </div>
      }
    >
      <VNCContent />
    </Suspense>
  );
}
