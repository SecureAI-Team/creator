"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
    <Card className="border-0 shadow-none lg:border lg:shadow-sm">
      <CardHeader className="text-center">
        <div className="lg:hidden flex items-center justify-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            C
          </div>
          <span className="text-lg font-bold">创作助手</span>
        </div>
        <CardTitle className="text-2xl">登录</CardTitle>
        <CardDescription>选择你喜欢的方式登录</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* OAuth buttons */}
        <div className="grid grid-cols-3 gap-3">
          <Button variant="outline" onClick={() => signIn("github", { callbackUrl: "/overview" })}>
            GitHub
          </Button>
          <Button variant="outline" onClick={() => signIn("google", { callbackUrl: "/overview" })}>
            Google
          </Button>
          <Button variant="outline" onClick={() => signIn("wechat", { callbackUrl: "/overview" })}>
            微信
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">或</span>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-lg bg-muted p-1">
          <button
            className={`flex-1 py-2 text-sm rounded-md transition-colors ${
              tab === "email" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"
            }`}
            onClick={() => setTab("email")}
          >
            邮箱密码
          </button>
          <button
            className={`flex-1 py-2 text-sm rounded-md transition-colors ${
              tab === "phone" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"
            }`}
            onClick={() => setTab("phone")}
          >
            手机验证码
          </button>
        </div>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        {tab === "email" ? (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <Input
              type="email"
              placeholder="邮箱地址"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "登录中..." : "登录"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handlePhoneLogin} className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="tel"
                placeholder="手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1"
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={sendSms}
                disabled={smsSent || phone.length !== 11}
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
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "登录中..." : "登录"}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          还没有账号？{" "}
          <Link href="/register" className="text-primary hover:underline font-medium">
            免费注册
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
