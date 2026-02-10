import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-white" style={{ colorScheme: "light" }}>
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 items-center justify-center p-12">
        <div className="max-w-md">
          <Link href="/" className="flex items-center gap-2.5 mb-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold text-gray-900">创作助手</span>
          </Link>
          <h2 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
            AI 驱动的
            <br />
            自媒体创作平台
          </h2>
          <p className="text-gray-500 text-lg leading-relaxed">
            集成 20+ AI 工具，覆盖 10 大平台。从选题到发布，让你专注于创意本身。
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
            {[
              "10 大平台一键发布",
              "20+ AI 工具",
              "全平台数据分析",
              "智能评论管理",
            ].map((text) => (
              <div key={text} className="flex items-center gap-2 text-gray-600">
                <span className="h-2 w-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Right side - form */}
      <div className="flex flex-1 items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
