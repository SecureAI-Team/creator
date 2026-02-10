"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Globe,
  FileText,
  BarChart3,
  Wrench,
  MessageSquare,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";

const navItems = [
  { href: "/overview", label: "概览", icon: LayoutDashboard },
  { href: "/platforms", label: "平台管理", icon: Globe },
  { href: "/content", label: "内容管理", icon: FileText },
  { href: "/data", label: "数据分析", icon: BarChart3 },
  { href: "/tools", label: "AI 工具", icon: Wrench },
  { href: "/chat", label: "AI 对话", icon: MessageSquare },
  { href: "/settings", label: "设置", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex flex-col bg-white border-r border-gray-100 h-screen sticky top-0 transition-all duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 p-4 border-b border-gray-100">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm shrink-0">
          <Sparkles className="h-4 w-4" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold text-gray-900">创作助手</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 ${
                isActive
                  ? "bg-blue-50 text-blue-600 font-medium shadow-sm"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="p-3 border-t border-gray-100 space-y-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-600 w-full transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5 shrink-0" />
              收起侧栏
            </>
          )}
        </button>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-400 hover:bg-red-50 hover:text-red-500 w-full transition-colors"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && "退出登录"}
        </button>
      </div>
    </aside>
  );
}
