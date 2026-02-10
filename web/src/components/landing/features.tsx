import { Card, CardContent } from "@/components/ui/card";
import {
  Bot,
  BarChart3,
  Upload,
  Palette,
  MessageSquare,
  TrendingUp,
  Zap,
  Shield,
} from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "AI 智能创作",
    description: "ChatGPT、Claude、Gemini 等 AI 工具一键调用，支持文本、视频脚本、音频内容自动生成。",
  },
  {
    icon: Upload,
    title: "多平台一键发布",
    description: "同一内容自动适配 10 大平台格式和规则，标题、标签、封面全部智能优化。",
  },
  {
    icon: BarChart3,
    title: "全平台数据看板",
    description: "跨平台数据汇总分析，播放量、点赞、评论等核心指标一目了然。",
  },
  {
    icon: Palette,
    title: "封面自动生成",
    description: "根据各平台尺寸要求，自动使用 Midjourney、DALL-E 等工具生成高质量封面。",
  },
  {
    icon: MessageSquare,
    title: "评论智能管理",
    description: "跨平台评论监控，AI 自动生成回复建议，提升互动效率。",
  },
  {
    icon: TrendingUp,
    title: "热点实时监控",
    description: "自动抓取各平台热搜榜单，智能匹配创作者领域，推送高价值选题。",
  },
  {
    icon: Zap,
    title: "自动化工作流",
    description: "定时任务自动执行数据拉取、日报生成、内容发布，减少 90% 重复操作。",
  },
  {
    icon: Shield,
    title: "安全可靠",
    description: "独立浏览器环境隔离，平台登录态安全管理，数据全程加密。",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold sm:text-4xl">
            创作者需要的一切，都在这里
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            从选题灵感到内容发布，从数据追踪到粉丝互动，全流程 AI 辅助。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
