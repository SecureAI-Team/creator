import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_60%,rgba(99,102,241,0.12),transparent)]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <Badge variant="secondary" className="mb-6 gap-1.5 py-1 px-3">
          <Sparkles className="h-3.5 w-3.5" />
          AI 驱动的自媒体创作平台
        </Badge>

        <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          一站式
          <span className="text-primary">自媒体创作</span>
          <br />
          让内容触达每个角落
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
          集成 20+ AI 工具，覆盖 10 大平台。从选题到发布，
          AI 助手帮你完成 80% 的工作，让你专注于创意本身。
        </p>

        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/register">
            <Button size="lg" className="gap-2">
              免费开始使用
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="#features">
            <Button variant="outline" size="lg">
              了解更多
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
          <div>
            <div className="text-3xl font-bold text-primary">10</div>
            <div className="text-sm text-muted-foreground mt-1">支持平台</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary">20+</div>
            <div className="text-sm text-muted-foreground mt-1">AI 工具</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary">60+</div>
            <div className="text-sm text-muted-foreground mt-1">自动化技能</div>
          </div>
        </div>
      </div>
    </section>
  );
}
