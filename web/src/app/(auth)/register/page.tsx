"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    if (password.length < 6) {
      setError("密码至少 6 位");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "注册失败");
        setLoading(false);
        return;
      }

      // Auto-login after registration
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("注册成功但登录失败，请手动登录");
      } else {
        window.location.href = "/onboarding";
      }
    } catch {
      setError("网络错误，请稍后重试");
    }
    setLoading(false);
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
        <h1 className="text-2xl font-bold text-gray-900">创建账号</h1>
        <p className="text-sm text-gray-500 mt-1">开始你的 AI 创作之旅</p>
      </div>

      <div className="space-y-5">
        {/* OAuth shortcuts */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: "github", label: "GitHub", emoji: "🐙" },
            { id: "google", label: "Google", emoji: "🔍" },
            { id: "wechat", label: "微信", emoji: "💬" },
          ].map((provider) => (
            <button
              key={provider.id}
              onClick={() =>
                signIn(provider.id, { callbackUrl: "/onboarding" })
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
            <span className="bg-white px-3 text-gray-400">
              或使用邮箱注册
            </span>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-3.5">
          <Input
            type="text"
            placeholder="你的名字"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="rounded-xl border-gray-200 py-2.5"
          />
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
            placeholder="设置密码（至少 6 位）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="rounded-xl border-gray-200 py-2.5"
          />
          <Input
            type="password"
            placeholder="确认密码"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="rounded-xl border-gray-200 py-2.5"
          />
          <Button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm py-2.5"
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {loading ? "注册中..." : "创建账号"}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500">
          已有账号？{" "}
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            登录
          </Link>
        </p>
      </div>
    </div>
  );
}
