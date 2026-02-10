import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary/5 items-center justify-center p-12">
        <div className="max-w-md">
          <Link href="/" className="flex items-center gap-2 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              C
            </div>
            <span className="text-2xl font-bold">创作助手</span>
          </Link>
          <h2 className="text-3xl font-bold mb-4">
            AI 驱动的自媒体创作平台
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            集成 20+ AI 工具，覆盖 10 大平台。从选题到发布，让你专注于创意本身。
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary" />
              10 大平台一键发布
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary" />
              20+ AI 工具
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary" />
              全平台数据分析
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary" />
              智能评论管理
            </div>
          </div>
        </div>
      </div>
      {/* Right side - form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
