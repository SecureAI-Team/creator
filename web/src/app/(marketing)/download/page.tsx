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
  ExternalLink,
  CheckCircle2,
  ArrowRight,
  Apple,
  Package,
  Loader2,
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

const GITHUB_REPO = "SecureAI-Team/creator";
const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;

interface ReleaseInfo {
  version: string;
  windowsUrl: string | null;
  macosUrl: string | null;
  extensionUrl: string | null;
  htmlUrl: string;
}

async function fetchLatestRelease(): Promise<ReleaseInfo | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      { headers: { Accept: "application/vnd.github+json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const assets: { name: string; browser_download_url: string }[] =
      data.assets || [];

    return {
      version: data.tag_name || data.name || "",
      windowsUrl:
        assets.find((a) => a.name.endsWith(".exe"))?.browser_download_url ??
        null,
      macosUrl:
        assets.find((a) => a.name.endsWith(".dmg"))?.browser_download_url ??
        null,
      extensionUrl:
        assets.find((a) => a.name.endsWith(".zip"))?.browser_download_url ??
        null,
      htmlUrl: data.html_url || GITHUB_RELEASES_URL,
    };
  } catch {
    return null;
  }
}

export default function DownloadPage() {
  const [os, setOs] = useState<OS>("other");
  const [pwaPrompt, setPwaPrompt] = useState<Event | null>(null);
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [loadingRelease, setLoadingRelease] = useState(true);

  useEffect(() => {
    setOs(detectOS());
    fetchLatestRelease().then((r) => {
      setRelease(r);
      setLoadingRelease(false);
    });

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

  const versionBadge = release?.version ? (
    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
      {release.version}
    </span>
  ) : null;

  return (
    <div
      className="relative overflow-hidden bg-white"
      style={{ colorScheme: "light" }}
    >
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-purple-50/30 rounded-full blur-3xl -z-10" />

      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1 text-sm font-medium text-blue-700 mb-6">
            <Download className="h-3.5 w-3.5" />
            客户端下载
            {versionBadge}
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl mb-4">
            选择你喜欢的方式
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            桌面应用、浏览器扩展和 PWA 都连接到同一个服务器，数据实时同步。
          </p>
        </div>

        {/* Download cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-20">
          {/* Desktop App */}
          <div
            className={`relative rounded-2xl border p-8 transition-all duration-300 hover:shadow-lg ${
              os === "windows" || os === "macos"
                ? "border-blue-200 bg-white shadow-lg shadow-blue-100/50 ring-1 ring-blue-100"
                : "border-gray-100 bg-white hover:shadow-gray-100/80"
            }`}
          >
            {(os === "windows" || os === "macos") && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-medium px-4 py-1 rounded-full shadow-sm">
                推荐
              </div>
            )}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Monitor className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  桌面应用
                </h2>
                <p className="text-sm text-gray-400">Windows / macOS</p>
              </div>
            </div>

            <ul className="space-y-2.5 mb-6 text-sm text-gray-500">
              {[
                "系统托盘常驻，随时快速访问",
                "原生通知推送（过期、完成等）",
                "自动更新，始终最新版本",
                "记忆窗口大小和位置",
              ].map((text) => (
                <li key={text} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  {text}
                </li>
              ))}
            </ul>

            <div className="space-y-2">
              {/* Windows */}
              {loadingRelease ? (
                <Button
                  className="w-full justify-center gap-2 rounded-xl h-10"
                  variant="outline"
                  disabled
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  加载中...
                </Button>
              ) : release?.windowsUrl ? (
                <a href={release.windowsUrl}>
                  <Button
                    className={`w-full justify-center gap-2 rounded-xl h-10 ${
                      os === "windows"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                        : ""
                    }`}
                    variant={os === "windows" ? "default" : "outline"}
                  >
                    <Package className="h-4 w-4" />
                    Windows (.exe)
                    {release.version && (
                      <span className="text-[10px] opacity-70">
                        {release.version}
                      </span>
                    )}
                  </Button>
                </a>
              ) : (
                <a
                  href={GITHUB_RELEASES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    className="w-full justify-center gap-2 rounded-xl h-10"
                    variant="outline"
                    disabled={!release}
                  >
                    <Package className="h-4 w-4" />
                    Windows (.exe){" "}
                    {!release && (
                      <span className="text-[10px] text-gray-400">
                        尚未发布
                      </span>
                    )}
                  </Button>
                </a>
              )}

              {/* macOS */}
              {loadingRelease ? (
                <Button
                  className="w-full justify-center gap-2 rounded-xl h-10 mt-2"
                  variant="outline"
                  disabled
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  加载中...
                </Button>
              ) : release?.macosUrl ? (
                <a href={release.macosUrl}>
                  <Button
                    className={`w-full justify-center gap-2 rounded-xl h-10 mt-2 ${
                      os === "macos"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                        : ""
                    }`}
                    variant={os === "macos" ? "default" : "outline"}
                  >
                    <Apple className="h-4 w-4" />
                    macOS (.dmg)
                    {release.version && (
                      <span className="text-[10px] opacity-70">
                        {release.version}
                      </span>
                    )}
                  </Button>
                </a>
              ) : (
                <a
                  href={GITHUB_RELEASES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    className="w-full justify-center gap-2 rounded-xl h-10 mt-2"
                    variant="outline"
                    disabled={!release}
                  >
                    <Apple className="h-4 w-4" />
                    macOS (.dmg){" "}
                    {!release && (
                      <span className="text-[10px] text-gray-400">
                        尚未发布
                      </span>
                    )}
                  </Button>
                </a>
              )}
            </div>

            <p className="text-xs text-gray-400 mt-3 text-center">
              需要 Windows 10+ / macOS 12+ &middot;{" "}
              <a
                href={release?.htmlUrl || GITHUB_RELEASES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                所有版本
              </a>
            </p>
          </div>

          {/* Browser Extension */}
          <div
            className={`relative rounded-2xl border p-8 transition-all duration-300 hover:shadow-lg ${
              os === "other" || os === "linux"
                ? "border-blue-200 bg-white shadow-lg shadow-blue-100/50 ring-1 ring-blue-100"
                : "border-gray-100 bg-white hover:shadow-gray-100/80"
            }`}
          >
            {(os === "other" || os === "linux") && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-medium px-4 py-1 rounded-full shadow-sm">
                推荐
              </div>
            )}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Chrome className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  浏览器扩展
                </h2>
                <p className="text-sm text-gray-400">Chrome / Edge</p>
              </div>
            </div>

            <ul className="space-y-2.5 mb-6 text-sm text-gray-500">
              {[
                "浏览任意平台时一键操作",
                "侧边栏 AI 对话面板",
                "自动识别当前平台页面",
                "页面内容智能提取分析",
              ].map((text) => (
                <li key={text} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  {text}
                </li>
              ))}
            </ul>

            <div className="space-y-2">
              <Button
                className="w-full justify-center gap-2 rounded-xl h-10"
                variant="outline"
                disabled
              >
                <Globe className="h-4 w-4" />
                Chrome 商店（即将上线）
              </Button>
              {loadingRelease ? (
                <Button
                  className="w-full justify-center gap-2 rounded-xl h-10 mt-2"
                  variant="outline"
                  disabled
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  加载中...
                </Button>
              ) : release?.extensionUrl ? (
                <a href={release.extensionUrl}>
                  <Button className="w-full justify-center gap-2 rounded-xl h-10 mt-2" variant="outline">
                    <Download className="h-4 w-4" />
                    下载 .zip 手动安装
                    {release.version && (
                      <span className="text-[10px] opacity-50">
                        {release.version}
                      </span>
                    )}
                  </Button>
                </a>
              ) : (
                <Button
                  className="w-full justify-center gap-2 rounded-xl h-10 mt-2"
                  variant="outline"
                  disabled={!release}
                >
                  <Download className="h-4 w-4" />
                  下载 .zip 手动安装{" "}
                  {!release && (
                    <span className="text-[10px] text-gray-400">尚未发布</span>
                  )}
                </Button>
              )}
            </div>

            <details className="mt-4">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 transition-colors">
                手动安装步骤 &rarr;
              </summary>
              <ol className="text-xs text-gray-500 mt-2 space-y-1.5 list-decimal list-inside bg-gray-50 rounded-xl p-3">
                <li>从上方下载 .zip 文件并解压</li>
                <li>
                  打开 Chrome/Edge，进入{" "}
                  <code className="bg-gray-200 px-1 py-0.5 rounded text-[11px]">
                    chrome://extensions
                  </code>
                </li>
                <li>开启右上角「开发者模式」</li>
                <li>点击「加载已解压的扩展程序」</li>
                <li>选择解压后的 extension 文件夹</li>
              </ol>
            </details>
          </div>

          {/* PWA */}
          <div className="rounded-2xl border border-gray-100 bg-white p-8 transition-all duration-300 hover:shadow-lg hover:shadow-gray-100/80">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  PWA 网页应用
                </h2>
                <p className="text-sm text-gray-400">任何设备</p>
              </div>
            </div>

            <ul className="space-y-2.5 mb-6 text-sm text-gray-500">
              {[
                "无需安装，浏览器即可使用",
                "可安装到桌面，独立窗口运行",
                "支持离线访问缓存内容",
                "手机、平板均可使用",
              ].map((text) => (
                <li key={text} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  {text}
                </li>
              ))}
            </ul>

            <div className="space-y-2">
              {pwaPrompt ? (
                <Button
                  className="w-full justify-center gap-2 rounded-xl h-10 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                  onClick={handlePwaInstall}
                >
                  <Download className="h-4 w-4" />
                  安装到桌面
                </Button>
              ) : (
                <Link href="/overview">
                  <Button className="w-full justify-center gap-2 rounded-xl h-10 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white">
                    <ExternalLink className="h-4 w-4" />
                    打开网页版
                  </Button>
                </Link>
              )}
            </div>

            <p className="text-xs text-gray-400 mt-3 text-center">
              {pwaPrompt
                ? "点击上方按钮直接安装到桌面"
                : "在 Chrome/Edge 地址栏右侧点击安装图标即可"}
            </p>
          </div>
        </div>

        {/* Comparison table */}
        <div className="rounded-2xl border border-gray-100 overflow-hidden mb-16 bg-white">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-lg text-gray-900">功能对比</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-6 py-3 font-medium text-gray-600">
                    功能
                  </th>
                  <th className="text-center px-6 py-3 font-medium text-gray-600">
                    桌面应用
                  </th>
                  <th className="text-center px-6 py-3 font-medium text-gray-600">
                    浏览器扩展
                  </th>
                  <th className="text-center px-6 py-3 font-medium text-gray-600">
                    PWA
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(
                  [
                    ["完整控制台", true, false, true],
                    ["AI 对话", true, true, true],
                    ["系统托盘", true, false, false],
                    ["原生通知", true, true, false],
                    ["自动更新", true, false, true],
                    ["页面内容分析", false, true, false],
                    ["侧边栏聊天", false, true, false],
                    ["离线缓存", false, false, true],
                    ["手机使用", false, false, true],
                  ] as [string, boolean, boolean, boolean][]
                ).map(([feature, desktop, ext, pwa], i) => (
                  <tr
                    key={i}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-3 text-gray-700">{feature}</td>
                    <td className="text-center px-6 py-3">
                      {desktop ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 inline" />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="text-center px-6 py-3">
                      {ext ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 inline" />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="text-center px-6 py-3">
                      {pwa ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 inline" />
                      ) : (
                        <span className="text-gray-300">—</span>
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
          <p className="text-gray-500 mb-4">已经安装了客户端？</p>
          <Link href="/overview">
            <Button
              variant="outline"
              size="lg"
              className="rounded-full gap-2 border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              前往控制台
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
