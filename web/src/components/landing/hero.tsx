import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Sparkles, Zap, Globe, BarChart3 } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/80 via-white to-white">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-br from-blue-100/60 via-indigo-100/40 to-purple-100/30 rounded-full blur-3xl -z-10" />
      <div className="absolute top-40 -left-20 w-72 h-72 bg-sky-100/50 rounded-full blur-3xl -z-10" />
      <div className="absolute top-20 -right-20 w-72 h-72 bg-violet-100/50 rounded-full blur-3xl -z-10" />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-20 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm text-blue-700 mb-8 shadow-sm">
          <Sparkles className="h-3.5 w-3.5" />
          <span className="font-medium">AI 驱动的自媒体创作平台</span>
        </div>

        {/* Heading */}
        <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl leading-[1.1]">
          一站式
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
            自媒体创作
          </span>
          <br />
          让内容触达每个角落
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-500 leading-relaxed">
          集成 20+ AI 工具，覆盖 10 大主流平台。从选题灵感到一键发布，
          AI 助手帮你完成 80% 的重复工作，让你专注创意本身。
        </p>

        {/* CTA */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register">
            <Button
              size="lg"
              className="gap-2 rounded-full px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 text-base h-12"
            >
              免费开始使用
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="#features">
            <Button
              variant="outline"
              size="lg"
              className="gap-2 rounded-full px-8 border-gray-300 text-gray-700 hover:bg-gray-50 text-base h-12"
            >
              <Play className="h-4 w-4" />
              了解更多
            </Button>
          </Link>
        </div>

        {/* Stats row */}
        <div className="mt-20 grid grid-cols-3 gap-8 max-w-xl mx-auto">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 mb-3">
              <Globe className="h-5 w-5" />
            </div>
            <div className="text-3xl font-bold text-gray-900">10</div>
            <div className="text-sm text-gray-500 mt-0.5">支持平台</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-100 text-violet-600 mb-3">
              <Zap className="h-5 w-5" />
            </div>
            <div className="text-3xl font-bold text-gray-900">20+</div>
            <div className="text-sm text-gray-500 mt-0.5">AI 工具</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 mb-3">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="text-3xl font-bold text-gray-900">60+</div>
            <div className="text-sm text-gray-500 mt-0.5">自动化技能</div>
          </div>
        </div>

        {/* Visual demo placeholder */}
        <div className="mt-16 mx-auto max-w-5xl">
          <div className="relative rounded-2xl border border-gray-200 bg-white/80 backdrop-blur shadow-2xl shadow-gray-200/50 overflow-hidden">
            <div className="aspect-[16/9] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
              <div className="text-center px-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white mb-4 shadow-lg">
                  <Sparkles className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  智能创作工作台
                </h3>
                <p className="text-sm text-gray-400 max-w-md mx-auto">
                  从选题 → 创作 → 适配 → 发布 → 数据追踪，全流程 AI 辅助
                </p>
              </div>
            </div>
            {/* Floating badges */}
            <div className="absolute top-6 left-6 flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-md border border-gray-100">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              实时同步
            </div>
            <div className="absolute top-6 right-6 flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-md border border-gray-100">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              AI 增强
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
