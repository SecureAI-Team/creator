import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold text-gray-900">创作助手</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              AI 驱动的自媒体创作平台，
              <br />
              让内容创作更高效。
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">产品</h4>
            <ul className="space-y-2.5 text-sm text-gray-500">
              <li>
                <Link
                  href="#features"
                  className="hover:text-gray-900 transition-colors"
                >
                  功能特性
                </Link>
              </li>
              <li>
                <Link
                  href="#platforms"
                  className="hover:text-gray-900 transition-colors"
                >
                  支持平台
                </Link>
              </li>
              <li>
                <Link
                  href="#tools"
                  className="hover:text-gray-900 transition-colors"
                >
                  AI 工具
                </Link>
              </li>
              <li>
                <Link
                  href="#pricing"
                  className="hover:text-gray-900 transition-colors"
                >
                  价格方案
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">支持</h4>
            <ul className="space-y-2.5 text-sm text-gray-500">
              <li>
                <Link
                  href="/docs"
                  className="hover:text-gray-900 transition-colors"
                >
                  文档
                </Link>
              </li>
              <li>
                <Link
                  href="/download"
                  className="hover:text-gray-900 transition-colors"
                >
                  下载客户端
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/SecureAI-Team/creator"
                  className="hover:text-gray-900 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">社区</h4>
            <ul className="space-y-2.5 text-sm text-gray-500">
              <li>
                <a
                  href="https://t.me/creatorassistant"
                  className="hover:text-gray-900 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Telegram 群
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/SecureAI-Team/creator/issues"
                  className="hover:text-gray-900 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  问题反馈
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} 创作助手. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
