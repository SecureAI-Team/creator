import { FileQuestion } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md mx-auto px-6">
        <FileQuestion className="h-20 w-20 mx-auto text-muted-foreground opacity-50" />
        <div>
          <h1 className="text-6xl font-bold text-foreground">404</h1>
          <p className="text-xl text-muted-foreground mt-2">页面未找到</p>
        </div>
        <p className="text-muted-foreground">
          你访问的页面不存在或已被移除。请检查链接是否正确。
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            返回首页
          </Link>
          <Link
            href="/overview"
            className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            前往控制台
          </Link>
        </div>
      </div>
    </div>
  );
}
