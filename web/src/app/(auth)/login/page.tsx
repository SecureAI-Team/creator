"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2 } from "lucide-react";

type LoginTab = "email" | "phone";

export default function LoginPage() {
  const [tab, setTab] = useState<LoginTab>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [smsSent, setSmsSent] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("邮箱或密码错误");
    } else {
      window.location.href = "/overview";
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("phone-sms", {
      phone,
      code: smsCode,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("验证码错误或已过期");
    } else {
      window.location.href = "/overview";
    }
  };

  const sendSms = async () => {
    const res = await fetch("/api/auth/send-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    if (res.ok) setSmsSent(true);
  };

  return (
    <div>
      {/* Mobile logo */}
      <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
          <Sparkles className="h-4 w-4" />
        </div>
        <span className="text-lg font-bold text-gray-900">创作助手</span>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">欢迎回来</h1>
        <p className="text-sm text-gray-500 mt-1">选择你喜欢的方式登录</p>
      </div>

      <div className="space-y-5">
        {/* OAuth buttons */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: "github", label: "GitHub", emoji: "🐙" },
            { id: "google", label: "Google", emoji: "🔍" },
            { id: "wechat", label: "微信", emoji: "💬" },
          ].map((provider) => (
            <button
              key={provider.id}
              onClick={() =>
                signIn(provider.id, { callbackUrl: "/overview" })
              }
              className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              <span>{provider.emoji}</span>
              {provider.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-gray-400">或</span>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-gray-100 p-1">
          <button
            className={`flex-1 py-2 text-sm rounded-lg transition-all ${
              tab === "email"
                ? "bg-white shadow-sm font-medium text-gray-900"
                : "text-gray-500"
            }`}
            onClick={() => setTab("email")}
          >
            邮箱密码
          </button>
          <button
            className={`flex-1 py-2 text-sm rounded-lg transition-all ${
              tab === "phone"
                ? "bg-white shadow-sm font-medium text-gray-900"
                : "text-gray-500"
            }`}
            onClick={() => setTab("phone")}
          >
            手机验证码
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600 text-center">
            {error}
          </div>
        )}

        {tab === "email" ? (
          <form onSubmit={handleEmailLogin} className="space-y-3.5">
            <Input
              type="email"
              placeholder="邮箱地址"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-xl border-gray-200 py-2.5"
            />
            <Input
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="rounded-xl border-gray-200 py-2.5"
            />
            <Button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm py-2.5"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {loading ? "登录中..." : "登录"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handlePhoneLogin} className="space-y-3.5">
            <div className="flex gap-2">
              <Input
                type="tel"
                placeholder="手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 rounded-xl border-gray-200 py-2.5"
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={sendSms}
                disabled={smsSent || phone.length !== 11}
                className="rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 shrink-0"
              >
                {smsSent ? "已发送" : "发送验证码"}
              </Button>
            </div>
            <Input
              type="text"
              placeholder="6 位验证码"
              value={smsCode}
              onChange={(e) => setSmsCode(e.target.value)}
              maxLength={6}
              required
              className="rounded-xl border-gray-200 py-2.5"
            />
            <Button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm py-2.5"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {loading ? "登录中..." : "登录"}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500">
          还没有账号？{" "}
          <Link
            href="/register"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            免费注册
          </Link>
        </p>
      </div>
    </div>
  );
}
