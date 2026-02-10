"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Menu, X, Sparkles } from "lucide-react";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-gray-100">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold text-gray-900">创作助手</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="#features"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            功能特性
          </Link>
          <Link
            href="#platforms"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            支持平台
          </Link>
          <Link
            href="#tools"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            AI 工具
          </Link>
          <Link
            href="#pricing"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            价格方案
          </Link>
          <Link
            href="/download"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            下载客户端
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              登录
            </Button>
          </Link>
          <Link href="/register">
            <Button
              size="sm"
              className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
            >
              免费注册
            </Button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? (
            <X className="h-5 w-5 text-gray-600" />
          ) : (
            <Menu className="h-5 w-5 text-gray-600" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 px-4 py-4 space-y-1 bg-white">
          {[
            { href: "#features", label: "功能特性" },
            { href: "#platforms", label: "支持平台" },
            { href: "#tools", label: "AI 工具" },
            { href: "#pricing", label: "价格方案" },
            { href: "/download", label: "下载客户端" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block text-sm py-2.5 px-3 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="flex gap-3 pt-4 border-t border-gray-100 mt-3">
            <Link href="/login" className="flex-1">
              <Button
                variant="outline"
                className="w-full border-gray-200 text-gray-700"
              >
                登录
              </Button>
            </Link>
            <Link href="/register" className="flex-1">
              <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                免费注册
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
