"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Monitor,
  Globe,
  Smartphone,
  Download,
  Chrome,
  Apple,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

type OS = "windows" | "macos" | "linux" | "other";

function detectOS(): OS {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "windows";
  if (ua.includes("mac")) return "macos";
  if (ua.includes("linux")) return "linux";
  return "other";
}

const GITHUB_RELEASE_URL =
  "https://github.com/SecureAI-Team/creator/releases/latest";

export default function DownloadPage() {
  const [os, setOs] = useState<OS>("other");
  const [pwaPrompt, setPwaPrompt] = useState<Event | null>(null);

  useEffect(() => {
    setOs(detectOS());

    // Capture PWA install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setPwaPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handlePwaInstall = async () => {
    if (pwaPrompt && "prompt" in pwaPrompt) {
      (pwaPrompt as { prompt: () => void }).prompt();
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">
            下载客户端
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            选择适合你的方式使用创作助手。桌面应用、浏览器扩展和 PWA
            都连接到同一个服务器，数据实时同步。
          </p>
        </div>

        {/* Download cards */}
        <div className="grid gap-8 md:grid-cols-3 mb-16">
          {/* Desktop App */}
          <div
            className={`relative rounded-2xl border p-8 transition-all hover:shadow-lg ${
              os === "windows" || os === "macos"
                ? "border-primary shadow-md ring-2 ring-primary/20"
                : "border-border"
            }`}
          >
            {(os === "windows" || os === "macos") && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                推荐
              </div>
            )}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Monitor className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">桌面应用</h2>
                <p className="text-sm text-muted-foreground">Windows / macOS</p>
              </div>
            </div>

            <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                系统托盘常驻，随时快速访问
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                原生通知推送（平台登录过期、发布完成等）
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                自动更新，始终保持最新版本
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                记忆窗口大小和位置
              </li>
            </ul>

            <div className="space-y-2">
              <a href={`${GITHUB_RELEASE_URL}/download/creator-desktop-win-x64.exe`} target="_blank" rel="noopener noreferrer">
                <Button
                  className="w-full justify-center gap-2"
                  variant={os === "windows" ? "default" : "outline"}
                >
                  <Download className="h-4 w-4" />
                  Windows (.exe)
                </Button>
              </a>
              <a href={`${GITHUB_RELEASE_URL}/download/creator-desktop-mac-arm64.dmg`} target="_blank" rel="noopener noreferrer">
                <Button
                  className="w-full justify-center gap-2 mt-2"
                  variant={os === "macos" ? "default" : "outline"}
                >
                  <Apple className="h-4 w-4" />
                  macOS (.dmg)
                </Button>
              </a>
            </div>

            <p className="text-xs text-muted-foreground mt-3 text-center">
              需要 Windows 10+ / macOS 12+
            </p>
          </div>

          {/* Browser Extension */}
          <div
            className={`relative rounded-2xl border p-8 transition-all hover:shadow-lg ${
              os === "other" || os === "linux"
                ? "border-primary shadow-md ring-2 ring-primary/20"
                : "border-border"
            }`}
          >
            {(os === "other" || os === "linux") && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                推荐
              </div>
            )}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                <Chrome className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">浏览器扩展</h2>
                <p className="text-sm text-muted-foreground">Chrome / Edge</p>
              </div>
            </div>

            <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                浏览任意平台时一键操作
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                侧边栏 AI 对话面板
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                自动识别当前平台页面
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                页面内容智能提取分析
              </li>
            </ul>

            <div className="space-y-2">
              <Button className="w-full justify-center gap-2" variant="outline" disabled>
                <Globe className="h-4 w-4" />
                Chrome 商店（即将上线）
              </Button>
              <a href={`${GITHUB_RELEASE_URL}/download/creator-extension.zip`} target="_blank" rel="noopener noreferrer">
                <Button className="w-full justify-center gap-2 mt-2" variant="outline">
                  <Download className="h-4 w-4" />
                  下载 .zip 手动安装
                </Button>
              </a>
            </div>

            <details className="mt-4">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                手动安装步骤
              </summary>
              <ol className="text-xs text-muted-foreground mt-2 space-y-1 list-decimal list-inside">
                <li>下载并解压 .zip 文件</li>
                <li>
                  打开 Chrome/Edge，进入{" "}
                  <code className="bg-muted px-1 rounded">chrome://extensions</code>
                </li>
                <li>开启右上角「开发者模式」</li>
                <li>点击「加载已解压的扩展程序」</li>
                <li>选择解压后的 extension 文件夹</li>
              </ol>
            </details>
          </div>

          {/* PWA */}
          <div className="rounded-2xl border border-border p-8 transition-all hover:shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 text-green-500">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">PWA 网页应用</h2>
                <p className="text-sm text-muted-foreground">任何设备</p>
              </div>
            </div>

            <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                无需安装，浏览器即可使用
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                可安装到桌面，独立窗口运行
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                支持离线访问缓存内容
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                手机、平板均可使用
              </li>
            </ul>

            <div className="space-y-2">
              {pwaPrompt ? (
                <Button
                  className="w-full justify-center gap-2"
                  onClick={handlePwaInstall}
                >
                  <Download className="h-4 w-4" />
                  安装到桌面
                </Button>
              ) : (
                <Link href="/overview">
                  <Button className="w-full justify-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    打开网页版
                  </Button>
                </Link>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-3 text-center">
              {pwaPrompt
                ? "点击上方按钮安装到桌面"
                : "在 Chrome/Edge 中，地址栏右侧有安装图标"}
            </p>
          </div>
        </div>

        {/* Comparison */}
        <div className="rounded-2xl border border-border overflow-hidden mb-16">
          <div className="bg-muted/50 px-6 py-4 border-b border-border">
            <h3 className="font-semibold text-lg">功能对比</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-6 py-3 font-medium">功能</th>
                  <th className="text-center px-6 py-3 font-medium">桌面应用</th>
                  <th className="text-center px-6 py-3 font-medium">浏览器扩展</th>
                  <th className="text-center px-6 py-3 font-medium">PWA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ["完整控制台", true, false, true],
                  ["AI 对话", true, true, true],
                  ["系统托盘", true, false, false],
                  ["原生通知", true, true, false],
                  ["自动更新", true, false, true],
                  ["页面内容分析", false, true, false],
                  ["侧边栏聊天", false, true, false],
                  ["离线缓存", false, false, true],
                  ["手机使用", false, false, true],
                ].map(([feature, desktop, ext, pwa], i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-6 py-3">{feature as string}</td>
                    <td className="text-center px-6 py-3">
                      {desktop ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 inline" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="text-center px-6 py-3">
                      {ext ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 inline" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="text-center px-6 py-3">
                      {pwa ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 inline" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            已经安装了客户端？
          </p>
          <Link href="/overview">
            <Button variant="outline" size="lg">
              前往控制台
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
