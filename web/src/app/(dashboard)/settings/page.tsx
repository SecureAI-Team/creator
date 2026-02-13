"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  User, Globe, Key, MessageCircle, Bot, Shield, Loader2, Check, Copy, Monitor,
  Plus, Trash2, Users,
} from "lucide-react";
import { useSession, signIn } from "next-auth/react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UserPreferences {
  language: string;
  timezone: string;
  defaultPlatforms: string[];
  publishMode: string;
  notifyVia: string[];
}

interface TelegramState {
  bound: boolean;
  telegramUsername?: string;
  bindCode?: string;
  instruction?: string;
}

interface WeChatState {
  bound: boolean;
  providerAccountId?: string;
}

interface PlatformAccount {
  id: string;
  platformKey: string;
  accountId: string;
  accountName: string | null;
  status: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  bilibili: "B站",
  "weixin-mp": "微信公众号",
  douyin: "抖音",
  xiaohongshu: "小红书",
  kuaishou: "快手",
  zhihu: "知乎",
  youtube: "YouTube",
  weibo: "微博",
  toutiao: "头条",
  "weixin-channels": "视频号",
};

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                    */
/* ------------------------------------------------------------------ */

function Section({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
  children,
}: {
  icon: typeof User;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50 bg-gray-50/30">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
          <p className="text-xs text-gray-400">{description}</p>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Settings Page                                                      */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const { data: session } = useSession();
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [telegram, setTelegram] = useState<TelegramState | null>(null);
  const [wechat, setWechat] = useState<WeChatState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tgLoading, setTgLoading] = useState(false);
  const [wxLoading, setWxLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [useLocalOpenClaw, setUseLocalOpenClaw] = useState(true);
  const [desktopReady, setDesktopReady] = useState(false);
  const [dashscopeKey, setDashscopeKey] = useState("");
  const [dashscopeKeyStatus, setDashscopeKeyStatus] = useState<{ dashscope: boolean; dashscopeFromEnv: boolean } | null>(null);
  const [savingKey, setSavingKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAcctPlatform, setNewAcctPlatform] = useState("weixin-mp");
  const [newAcctId, setNewAcctId] = useState("");
  const [newAcctName, setNewAcctName] = useState("");
  const [addingAccount, setAddingAccount] = useState(false);

  /* Load desktop config (when in Electron) */
  useEffect(() => {
    const api = typeof window !== "undefined" ? (window as Window & { creatorDesktop?: { getConfig?: () => Promise<{ useLocalOpenClaw?: boolean }>; getApiKeyStatus?: () => Promise<{ dashscope: boolean; dashscopeFromEnv: boolean }> } }).creatorDesktop : undefined;
    if (!api?.getConfig) return;
    api.getConfig().then((cfg: { useLocalOpenClaw?: boolean }) => {
      setUseLocalOpenClaw(cfg?.useLocalOpenClaw ?? true);
      setDesktopReady(true);
    });
    if (api?.getApiKeyStatus) {
      api.getApiKeyStatus().then(setDashscopeKeyStatus);
    }
  }, []);

  const handleSaveDashscopeKey = async () => {
    const api = (window as Window & { creatorDesktop?: { setApiKey?: (provider: string, key: string) => Promise<boolean>; getApiKeyStatus?: () => Promise<{ dashscope: boolean; dashscopeFromEnv: boolean }> } }).creatorDesktop;
    if (!api?.setApiKey) return;
    setSavingKey(true);
    try {
      await api.setApiKey("dashscope", dashscopeKey);
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 2000);
      setDashscopeKey("");
      if (api.getApiKeyStatus) {
        setDashscopeKeyStatus(await api.getApiKeyStatus());
      }
    } finally {
      setSavingKey(false);
    }
  };

  const handleToggleLocal = async (v: boolean) => {
    setUseLocalOpenClaw(v);
    const api = (window as Window & { creatorDesktop?: { updateSettings?: (s: object) => Promise<boolean> } }).creatorDesktop;
    if (api?.updateSettings) await api.updateSettings({ useLocalOpenClaw: v });
  };

  /* Load everything */
  useEffect(() => {
    async function load() {
      try {
        const [prefsRes, tgRes, wxRes, acctRes] = await Promise.all([
          fetch("/api/users/settings"),
          fetch("/api/users/telegram-bind", { method: "POST" }).catch(() => null),
          fetch("/api/users/wechat-bind").catch(() => null),
          fetch("/api/accounts").catch(() => null),
        ]);
        const prefsData = await prefsRes.json();
        const loaded = prefsData.preferences || {};
        setPrefs({
          language: loaded.language || "zh-CN",
          timezone: loaded.timezone || "Asia/Shanghai",
          defaultPlatforms: loaded.defaultPlatforms || [],
          publishMode: loaded.publishMode || "manual",
          notifyVia: loaded.notifyVia || ["telegram"],
        });

        if (tgRes?.ok) {
          const tgData = await tgRes.json();
          setTelegram(tgData);
        }

        if (wxRes?.ok) {
          const wxData = await wxRes.json();
          setWechat(wxData);
        }

        if (acctRes?.ok) {
          const acctData = await acctRes.json();
          setAccounts(acctData.accounts || []);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  /* Save preferences */
  const handleSave = async () => {
    if (!prefs) return;
    setSaving(true);
    try {
      await fetch("/api/users/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: prefs }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
    setSaving(false);
  };

  /* Telegram bind */
  const handleTelegramBind = async () => {
    setTgLoading(true);
    try {
      const res = await fetch("/api/users/telegram-bind", { method: "POST" });
      const data = await res.json();
      setTelegram(data);
    } catch { /* ignore */ }
    setTgLoading(false);
  };

  const handleTelegramUnbind = async () => {
    if (!confirm("确定要解绑 Telegram 吗？")) return;
    setTgLoading(true);
    try {
      await fetch("/api/users/telegram-bind", { method: "DELETE" });
      setTelegram({ bound: false });
    } catch { /* ignore */ }
    setTgLoading(false);
  };

  /* WeChat bind */
  const handleWeChatBind = () => {
    // Trigger NextAuth WeChat OAuth flow via signIn()
    signIn("wechat", { callbackUrl: "/settings" });
  };

  const handleWeChatUnbind = async () => {
    if (!confirm("确定要解绑微信吗？")) return;
    setWxLoading(true);
    try {
      await fetch("/api/users/wechat-bind", { method: "DELETE" });
      setWechat({ bound: false });
    } catch { /* ignore */ }
    setWxLoading(false);
  };

  /* Platform accounts */
  const handleAddAccount = async () => {
    if (!newAcctId.trim()) return;
    setAddingAccount(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformKey: newAcctPlatform,
          accountId: newAcctId.trim(),
          accountName: newAcctName.trim() || newAcctId.trim(),
        }),
      });
      if (res.ok) {
        const acctRes = await fetch("/api/accounts");
        if (acctRes.ok) {
          const data = await acctRes.json();
          setAccounts(data.accounts || []);
        }
        setNewAcctId("");
        setNewAcctName("");
        setShowAddAccount(false);
      }
    } catch { /* ignore */ }
    setAddingAccount(false);
  };

  const handleDeleteAccount = async (platformKey: string, accountId: string) => {
    if (!confirm(`确定要删除 ${PLATFORM_LABELS[platformKey] || platformKey} 的账号「${accountId}」吗？`)) return;
    try {
      await fetch("/api/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platformKey, accountId }),
      });
      setAccounts(accounts.filter((a) => !(a.platformKey === platformKey && a.accountId === accountId)));
    } catch { /* ignore */ }
  };

  /* Copy helper */
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">设置</h1>
        <p className="text-gray-500 text-sm mt-1">管理你的个人偏好和账户连接</p>
      </div>

      {/* ---------- Local Mode (Desktop only) ---------- */}
      {desktopReady && (
        <Section icon={Monitor} iconBg="bg-violet-50" iconColor="text-violet-600" title="本地模式" description="使用本地 OpenClaw，浏览器在本地可见，无需 VNC">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">默认使用本地 OpenClaw</div>
              <div className="text-xs text-gray-500 mt-0.5">开启后，平台登录等操作将在本地浏览器中完成</div>
            </div>
            <button
              onClick={() => handleToggleLocal(!useLocalOpenClaw)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                useLocalOpenClaw ? "bg-violet-500" : "bg-gray-200"
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  useLocalOpenClaw ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>
        </Section>
      )}

      {/* ---------- Profile ---------- */}
      <Section icon={User} iconBg="bg-blue-50" iconColor="text-blue-600" title="个人信息" description="基本账户信息">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">用户名</label>
            <Input value={session?.user?.name || ""} readOnly className="rounded-xl border-gray-200 bg-gray-50 text-gray-600" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">邮箱</label>
            <Input value={session?.user?.email || ""} readOnly className="rounded-xl border-gray-200 bg-gray-50 text-gray-600" />
          </div>
        </div>
      </Section>

      {/* ---------- Preferences ---------- */}
      <Section icon={Globe} iconBg="bg-emerald-50" iconColor="text-emerald-600" title="偏好设置" description="内容创作和发布偏好">
        {prefs && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">语言</label>
              <select
                value={prefs.language}
                onChange={(e) => setPrefs({ ...prefs, language: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="zh-CN">简体中文</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">时区</label>
              <select
                value={prefs.timezone}
                onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
                <option value="America/New_York">America/New_York (UTC-5)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (UTC-8)</option>
                <option value="Europe/London">Europe/London (UTC+0)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">发布模式</label>
              <div className="flex gap-3">
                {[
                  { value: "manual", label: "手动审核", desc: "每次发布前人工确认" },
                  { value: "auto", label: "自动发布", desc: "AI 创作后自动发布" },
                ].map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setPrefs({ ...prefs, publishMode: mode.value })}
                    className={`flex-1 p-3 rounded-xl border text-left transition-all ${
                      prefs.publishMode === mode.value
                        ? "border-blue-300 bg-blue-50/50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className={`text-sm font-medium ${prefs.publishMode === mode.value ? "text-blue-600" : "text-gray-700"}`}>
                      {mode.label}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{mode.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : saved ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : null}
                {saved ? "已保存" : saving ? "保存中..." : "保存偏好"}
              </Button>
            </div>
          </div>
        )}
      </Section>

      {/* ---------- Platform Accounts ---------- */}
      <Section icon={Users} iconBg="bg-purple-50" iconColor="text-purple-600" title="平台账号" description="管理多个平台的不同账号">
        <div className="space-y-3">
          {/* Existing accounts */}
          {accounts.length === 0 && (
            <p className="text-sm text-gray-400">暂无已添加的账号，点击下方按钮添加</p>
          )}
          {accounts.map((acct) => (
            <div key={acct.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded-lg border border-gray-100">
                  {PLATFORM_LABELS[acct.platformKey] || acct.platformKey}
                </span>
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {acct.accountName || acct.accountId}
                  </span>
                  {acct.accountId !== "default" && (
                    <span className="text-xs text-gray-400 ml-2">ID: {acct.accountId}</span>
                  )}
                </div>
              </div>
              {acct.accountId !== "default" && (
                <button
                  onClick={() => handleDeleteAccount(acct.platformKey, acct.accountId)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}

          {/* Add account form */}
          {showAddAccount ? (
            <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/30 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">平台</label>
                <select
                  value={newAcctPlatform}
                  onChange={(e) => setNewAcctPlatform(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  {Object.entries(PLATFORM_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">账号 ID（英文标识，用于区分）</label>
                <Input
                  placeholder="例如: geo-radar, personal"
                  value={newAcctId}
                  onChange={(e) => setNewAcctId(e.target.value)}
                  className="rounded-xl border-gray-200 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">显示名称</label>
                <Input
                  placeholder="例如: GEO雷达, 个人号"
                  value={newAcctName}
                  onChange={(e) => setNewAcctName(e.target.value)}
                  className="rounded-xl border-gray-200 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleAddAccount}
                  disabled={addingAccount || !newAcctId.trim()}
                  className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm"
                  size="sm"
                >
                  {addingAccount && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                  添加
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-gray-200 text-sm"
                  onClick={() => setShowAddAccount(false)}
                >
                  取消
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50"
              onClick={() => setShowAddAccount(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              添加账号
            </Button>
          )}
        </div>
      </Section>

      {/* ---------- Telegram Binding ---------- */}
      <Section icon={Bot} iconBg="bg-sky-50" iconColor="text-sky-600" title="Telegram 绑定" description="绑定后可通过 Telegram Bot 接收通知和操控助手">
        {telegram?.bound && telegram.telegramUsername ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50">
                <Bot className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  @{telegram.telegramUsername}
                </div>
                <div className="text-xs text-emerald-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  已绑定
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTelegramUnbind}
              disabled={tgLoading}
              className="rounded-xl border-gray-200 text-red-500 hover:bg-red-50 hover:border-red-200"
            >
              解绑
            </Button>
          </div>
        ) : telegram?.bindCode ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">{telegram.instruction}</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-100 rounded-xl px-4 py-2.5 text-sm font-mono text-gray-900">
                /bind {telegram.bindCode}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(`/bind ${telegram.bindCode}`)}
                className="rounded-xl border-gray-200"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-gray-400" />}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={handleTelegramBind}
            disabled={tgLoading}
            className="rounded-xl bg-sky-500 hover:bg-sky-600 text-white"
          >
            {tgLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            获取绑定码
          </Button>
        )}
      </Section>

      {/* ---------- WeChat Binding ---------- */}
      <Section icon={MessageCircle} iconBg="bg-green-50" iconColor="text-green-600" title="微信绑定" description="绑定后可通过微信登录和接收消息推送">
        {wechat?.bound ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
                <MessageCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  微信账号
                </div>
                <div className="text-xs text-emerald-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  已绑定{wechat.providerAccountId ? ` (${wechat.providerAccountId.slice(0, 8)}...)` : ""}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleWeChatUnbind}
              disabled={wxLoading}
              className="rounded-xl border-gray-200 text-red-500 hover:bg-red-50 hover:border-red-200"
            >
              {wxLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              解绑
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              绑定微信后，你可以使用微信扫码快捷登录，并接收创作进度通知。
            </p>
            <Button
              onClick={handleWeChatBind}
              disabled={wxLoading}
              className="rounded-xl bg-green-500 hover:bg-green-600 text-white"
            >
              {wxLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <MessageCircle className="h-4 w-4 mr-2" />
              绑定微信
            </Button>
            <p className="text-xs text-gray-400">
              需要微信开放平台应用配置完成后方可使用。点击后将跳转到微信扫码授权页面。
            </p>
          </div>
        )}
      </Section>

      {/* ---------- API Keys ---------- */}
      <Section icon={Key} iconBg="bg-amber-50" iconColor="text-amber-600" title="AI 模型密钥" description="本地引擎使用的 AI 模型 API Key">
        <div className="space-y-4">
          {/* DashScope / Qwen */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              DashScope API Key（通义千问）
            </label>
            <p className="text-xs text-gray-400 mb-2">
              用于本地 OpenClaw 引擎调用 Qwen 模型。从{" "}
              <a href="https://dashscope.console.aliyun.com/apiKey" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                阿里云 DashScope 控制台
              </a>{" "}
              获取。
            </p>
            {desktopReady ? (
              <>
                <div className="flex items-center gap-2">
                  <Input
                    type="password"
                    placeholder="sk-..."
                    value={dashscopeKey}
                    onChange={(e) => setDashscopeKey(e.target.value)}
                    className="rounded-xl border-gray-200 font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 shrink-0"
                    onClick={handleSaveDashscopeKey}
                    disabled={savingKey || !dashscopeKey.trim()}
                  >
                    {savingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : keySaved ? <Check className="h-4 w-4 text-green-500" /> : "保存"}
                  </Button>
                </div>
                {dashscopeKeyStatus && (
                  <p className="text-xs mt-1.5">
                    {dashscopeKeyStatus.dashscope ? (
                      <span className="text-green-600">✓ 已配置（保存在客户端）</span>
                    ) : dashscopeKeyStatus.dashscopeFromEnv ? (
                      <span className="text-green-600">✓ 已配置（系统环境变量）</span>
                    ) : (
                      <span className="text-amber-600">✗ 未配置 — 本地引擎无法调用 AI 模型</span>
                    )}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-gray-400">仅在桌面客户端中可配置</p>
            )}
          </div>
        </div>
      </Section>

      {/* ---------- Security ---------- */}
      <Section icon={Shield} iconBg="bg-red-50" iconColor="text-red-500" title="安全" description="密码和账户安全设置">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">修改密码</label>
            <div className="flex gap-2">
              <Input type="password" placeholder="当前密码" className="rounded-xl border-gray-200" />
              <Input type="password" placeholder="新密码" className="rounded-xl border-gray-200" />
              <Button variant="outline" className="rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 shrink-0">
                更新
              </Button>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
