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
    description:
      "ChatGPT、Claude、Gemini 等 AI 工具一键调用，支持文本、视频脚本、音频内容自动生成。",
    color: "blue",
  },
  {
    icon: Upload,
    title: "多平台一键发布",
    description:
      "同一内容自动适配 10 大平台格式和规则，标题、标签、封面全部智能优化。",
    color: "indigo",
  },
  {
    icon: BarChart3,
    title: "全平台数据看板",
    description:
      "跨平台数据汇总分析，播放量、点赞、评论等核心指标一目了然。",
    color: "violet",
  },
  {
    icon: Palette,
    title: "封面自动生成",
    description:
      "根据各平台尺寸要求，使用 Midjourney、DALL-E 等工具生成高质量封面。",
    color: "pink",
  },
  {
    icon: MessageSquare,
    title: "评论智能管理",
    description:
      "跨平台评论监控，AI 自动生成回复建议，提升粉丝互动效率。",
    color: "amber",
  },
  {
    icon: TrendingUp,
    title: "热点实时监控",
    description:
      "自动抓取各平台热搜榜单，智能匹配创作者领域，推送高价值选题。",
    color: "emerald",
  },
  {
    icon: Zap,
    title: "自动化工作流",
    description:
      "定时任务自动执行数据拉取、日报生成、内容发布，减少 90% 重复操作。",
    color: "orange",
  },
  {
    icon: Shield,
    title: "安全可靠",
    description:
      "独立浏览器环境隔离，平台登录态安全管理，数据全程加密。",
    color: "teal",
  },
];

const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
  blue:    { bg: "bg-blue-50",    text: "text-blue-600",    ring: "group-hover:ring-blue-100" },
  indigo:  { bg: "bg-indigo-50",  text: "text-indigo-600",  ring: "group-hover:ring-indigo-100" },
  violet:  { bg: "bg-violet-50",  text: "text-violet-600",  ring: "group-hover:ring-violet-100" },
  pink:    { bg: "bg-pink-50",    text: "text-pink-600",    ring: "group-hover:ring-pink-100" },
  amber:   { bg: "bg-amber-50",   text: "text-amber-600",   ring: "group-hover:ring-amber-100" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", ring: "group-hover:ring-emerald-100" },
  orange:  { bg: "bg-orange-50",  text: "text-orange-600",  ring: "group-hover:ring-orange-100" },
  teal:    { bg: "bg-teal-50",    text: "text-teal-600",    ring: "group-hover:ring-teal-100" },
};

export function Features() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1 text-sm font-medium text-indigo-700 mb-4">
            核心功能
          </div>
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            创作者需要的一切，都在这里
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            从选题灵感到内容发布，从数据追踪到粉丝互动，全流程 AI 辅助
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => {
            const c = colorMap[feature.color] || colorMap.blue;
            return (
              <div
                key={feature.title}
                className="group relative rounded-2xl border border-gray-100 bg-white p-6 transition-all duration-300 hover:shadow-lg hover:shadow-gray-100/80 hover:-translate-y-0.5 ring-0 ring-transparent hover:ring-4"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.bg} ${c.text} mb-4 transition-transform group-hover:scale-110`}
                >
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
