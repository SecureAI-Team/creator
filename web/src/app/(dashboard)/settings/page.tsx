"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Key, Bell, User, Bot, Loader2, Copy, Check } from "lucide-react";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [timezone, setTimezone] = useState("Asia/Shanghai");
  const [notificationLevel, setNotificationLevel] = useState("important");
  const [dashscopeKey, setDashscopeKey] = useState("");
  const [telegramBound, setTelegramBound] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState("");
  const [bindCode, setBindCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/users/settings");
        const data = await res.json();
        if (data.user) {
          setName(data.user.name || "");
          setEmail(data.user.email || "");
        }
        if (data.preferences) {
          setTimezone(data.preferences.timezone || "Asia/Shanghai");
          setNotificationLevel(data.preferences.notificationLevel || "important");
          if (data.preferences.dashscopeApiKey) setDashscopeKey("••••••••");
        }
        if (data.telegram) {
          setTelegramBound(true);
          setTelegramUsername(data.telegram.telegramUsername || "");
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/users/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          timezone,
          notificationLevel,
          dashscopeKey: dashscopeKey === "••••••••" ? undefined : dashscopeKey || undefined,
        }),
      });
      if (res.ok) {
        setMessage("设置已保存");
      } else {
        setMessage("保存失败");
      }
    } catch {
      setMessage("保存失败");
    }
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleGenerateBindCode = async () => {
    try {
      const res = await fetch("/api/users/telegram-bind", {
        method: "POST",
      });
      const data = await res.json();
      if (data.bindCode) {
        setBindCode(data.bindCode);
      }
    } catch {
      // ignore
    }
  };

  const handleUnbind = async () => {
    try {
      await fetch("/api/users/telegram-bind", { method: "DELETE" });
      setTelegramBound(false);
      setTelegramUsername("");
      setBindCode("");
    } catch {
      // ignore
    }
  };

  const copyBindCode = async () => {
    await navigator.clipboard.writeText(bindCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">设置</h1>
        <p className="text-muted-foreground mt-1">管理你的账号和偏好设置</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">个人信息</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">名称</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="你的名字" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">邮箱</label>
            <Input value={email} disabled placeholder="your@email.com" type="email" />
            <p className="text-xs text-muted-foreground mt-1">邮箱不可更改</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">时区</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="Asia/Shanghai">北京时间 (UTC+8)</option>
              <option value="Asia/Tokyo">东京时间 (UTC+9)</option>
              <option value="America/New_York">美东时间 (UTC-5)</option>
              <option value="America/Los_Angeles">美西时间 (UTC-8)</option>
              <option value="Europe/London">伦敦时间 (UTC+0)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">通知设置</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { value: "all", label: "全部通知", desc: "接收所有类型的通知" },
              { value: "important", label: "仅重要通知", desc: "发布完成、登录过期等" },
              { value: "errors", label: "仅错误", desc: "只在出错时通知" },
            ].map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  notificationLevel === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <input
                  type="radio"
                  name="notification"
                  value={opt.value}
                  checked={notificationLevel === opt.value}
                  onChange={(e) => setNotificationLevel(e.target.value)}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">API 密钥</CardTitle>
          </div>
          <CardDescription>用于 AI 模型调用，密钥将加密存储</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              阿里云 DashScope API Key
            </label>
            <Input
              value={dashscopeKey}
              onChange={(e) => setDashscopeKey(e.target.value)}
              placeholder="sk-..."
              type="password"
            />
            <p className="text-xs text-muted-foreground mt-1">
              获取方式: <a href="https://dashscope.console.aliyun.com/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">DashScope 控制台</a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Telegram */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Telegram 绑定</CardTitle>
          </div>
          <CardDescription>绑定后可通过 Telegram 与 AI 助手对话</CardDescription>
        </CardHeader>
        <CardContent>
          {telegramBound ? (
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-green-600 font-medium">已绑定</span>
                {telegramUsername && (
                  <span className="text-muted-foreground ml-2">@{telegramUsername}</span>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={handleUnbind}>
                解绑
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">
                发送绑定码到 Telegram Bot 即可完成绑定
              </p>
              {bindCode ? (
                <div className="flex items-center justify-center gap-2">
                  <code className="px-4 py-2 bg-muted rounded-lg text-lg font-mono font-bold">
                    {bindCode}
                  </code>
                  <Button variant="ghost" size="sm" onClick={copyBindCode}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={handleGenerateBindCode}>
                  生成绑定码
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center justify-end gap-4">
        {message && (
          <span className={`text-sm ${message.includes("失败") ? "text-red-500" : "text-green-500"}`}>
            {message}
          </span>
        )}
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "保存中..." : "保存设置"}
        </Button>
      </div>
    </div>
  );
}
