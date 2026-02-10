"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            C
          </div>
          <span className="text-lg font-bold">创作助手</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            功能特性
          </Link>
          <Link href="#platforms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            支持平台
          </Link>
          <Link href="#tools" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            AI 工具
          </Link>
          <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            价格方案
          </Link>
          <Link href="/download" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            下载客户端
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">登录</Button>
          </Link>
          <Link href="/register">
            <Button size="sm">免费注册</Button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border px-4 py-4 space-y-3 bg-background">
          <Link href="#features" className="block text-sm py-2" onClick={() => setMobileOpen(false)}>功能特性</Link>
          <Link href="#platforms" className="block text-sm py-2" onClick={() => setMobileOpen(false)}>支持平台</Link>
          <Link href="#tools" className="block text-sm py-2" onClick={() => setMobileOpen(false)}>AI 工具</Link>
          <Link href="#pricing" className="block text-sm py-2" onClick={() => setMobileOpen(false)}>价格方案</Link>
          <Link href="/download" className="block text-sm py-2" onClick={() => setMobileOpen(false)}>下载客户端</Link>
          <div className="flex gap-3 pt-3">
            <Link href="/login" className="flex-1">
              <Button variant="outline" className="w-full">登录</Button>
            </Link>
            <Link href="/register" className="flex-1">
              <Button className="w-full">免费注册</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
