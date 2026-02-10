"use client";

import { useEffect, useState } from "react";
import { Globe, FileText, MessageSquare, Send, Loader2 } from "lucide-react";

interface TgUser {
  name: string;
  platforms: number;
  content: number;
  views: number;
}

export default function TelegramMiniDashboard() {
  const [user, setUser] = useState<TgUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      // Authenticate via Telegram initData
      try {
        const tg = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } })
          .Telegram?.WebApp;
        const initData = tg?.initData;

        if (!initData) {
          setLoading(false);
          return;
        }

        const authRes = await fetch("/api/auth/telegram-miniapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
        });

        if (!authRes.ok) {
          setLoading(false);
          return;
        }

        const authData = await authRes.json();
        setToken(authData.token);

        // Fetch dashboard data
        const dataRes = await fetch("/api/data?days=7", {
          headers: { Authorization: `Bearer ${authData.token}` },
        });
        const data = await dataRes.json();

        const contentRes = await fetch("/api/content?pageSize=1", {
          headers: { Authorization: `Bearer ${authData.token}` },
        });
        const contentData = await contentRes.json();

        setUser({
          name: authData.name || "创作者",
          platforms: (data.platforms || []).filter(
            (p: { status: string }) => p.status === "CONNECTED"
          ).length,
          content: contentData.total || 0,
          views: data.totals?.views || 0,
        });
      } catch {
        // ignore
      }
      setLoading(false);
    }

    init();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="text-4xl mb-4">✦</div>
        <h1 className="text-xl font-bold mb-2">创作助手</h1>
        <p className="text-sm text-muted-foreground mb-6">
          请先在 Web 控制台绑定 Telegram 账号
        </p>
        <a
          href="/settings"
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
        >
          前往绑定
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 space-y-4">
      {/* Header */}
      <div className="text-center py-4">
        <h1 className="text-lg font-bold">你好，{user.name}！</h1>
        <p className="text-xs text-muted-foreground mt-1">以下是你的创作概览</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <Globe className="h-5 w-5 mx-auto text-blue-500 mb-1" />
          <div className="text-lg font-bold">{user.platforms}</div>
          <div className="text-xs text-muted-foreground">平台</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <FileText className="h-5 w-5 mx-auto text-green-500 mb-1" />
          <div className="text-lg font-bold">{user.content}</div>
          <div className="text-xs text-muted-foreground">内容</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <MessageSquare className="h-5 w-5 mx-auto text-purple-500 mb-1" />
          <div className="text-lg font-bold">{formatNum(user.views)}</div>
          <div className="text-xs text-muted-foreground">浏览</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold px-1">快速操作</h2>
        <div className="grid grid-cols-2 gap-3">
          <a
            href="/tg/chat"
            className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 active:bg-muted transition-colors"
          >
            <MessageSquare className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm font-medium">AI 对话</div>
              <div className="text-xs text-muted-foreground">创作 & 问答</div>
            </div>
          </a>
          <a
            href="/tg/publish"
            className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 active:bg-muted transition-colors"
          >
            <Send className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm font-medium">快速发布</div>
              <div className="text-xs text-muted-foreground">发到各平台</div>
            </div>
          </a>
          <a
            href="/tg/data"
            className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 active:bg-muted transition-colors"
          >
            <Globe className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm font-medium">数据概览</div>
              <div className="text-xs text-muted-foreground">跨平台数据</div>
            </div>
          </a>
          <a
            href="/overview"
            className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 active:bg-muted transition-colors"
          >
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm font-medium">完整控制台</div>
              <div className="text-xs text-muted-foreground">打开 Web 版</div>
            </div>
          </a>
        </div>
      </div>

      {/* Token indicator (hidden, for child pages) */}
      {token && <input type="hidden" id="tg-token" value={token} />}
    </div>
  );
}

function formatNum(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + "万";
  if (num >= 1000) return (num / 1000).toFixed(1) + "k";
  return String(num);
}
