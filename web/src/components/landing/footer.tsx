import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                C
              </div>
              <span className="text-lg font-bold">创作助手</span>
            </div>
            <p className="text-sm text-muted-foreground">
              AI 驱动的自媒体创作平台，让内容创作更高效。
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">产品</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#features" className="hover:text-foreground">功能特性</Link></li>
              <li><Link href="#platforms" className="hover:text-foreground">支持平台</Link></li>
              <li><Link href="#tools" className="hover:text-foreground">AI 工具</Link></li>
              <li><Link href="#pricing" className="hover:text-foreground">价格方案</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">支持</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/docs" className="hover:text-foreground">文档</Link></li>
              <li><Link href="/docs/deploy" className="hover:text-foreground">部署指南</Link></li>
              <li><a href="https://github.com/SecureAI-Team/creator" className="hover:text-foreground" target="_blank" rel="noopener noreferrer">GitHub</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">社区</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="https://t.me/creatorassistant" className="hover:text-foreground" target="_blank" rel="noopener noreferrer">Telegram 群</a></li>
              <li><a href="https://github.com/SecureAI-Team/creator/issues" className="hover:text-foreground" target="_blank" rel="noopener noreferrer">问题反馈</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} 创作助手. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
