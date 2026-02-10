import { Lightbulb, Pen, Share2, BarChart3 } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Lightbulb,
    title: "智能选题",
    description: "AI 自动抓取各平台热点，结合你的领域偏好，推送高潜力选题。",
    color: "blue",
  },
  {
    step: "02",
    icon: Pen,
    title: "AI 辅助创作",
    description: "调用 ChatGPT、Midjourney 等工具生成文本、图片、视频脚本等素材。",
    color: "indigo",
  },
  {
    step: "03",
    icon: Share2,
    title: "一键多平台发布",
    description: "内容自动适配各平台格式和规则，点击确认即可全平台分发。",
    color: "violet",
  },
  {
    step: "04",
    icon: BarChart3,
    title: "数据追踪优化",
    description: "跨平台数据汇总分析，自动生成日报周报，持续优化创作策略。",
    color: "emerald",
  },
];

const colorMap: Record<string, { bg: string; text: string; line: string }> = {
  blue:    { bg: "bg-blue-50",    text: "text-blue-600",    line: "from-blue-400" },
  indigo:  { bg: "bg-indigo-50",  text: "text-indigo-600",  line: "via-indigo-400" },
  violet:  { bg: "bg-violet-50",  text: "text-violet-600",  line: "via-violet-400" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", line: "to-emerald-400" },
};

export function HowItWorks() {
  return (
    <section className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1 text-sm font-medium text-amber-700 mb-4">
            工作流程
          </div>
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            四步开启高效创作
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            从灵感到数据闭环，全流程 AI 加持
          </p>
        </div>

        {/* Steps */}
        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Connecting line (desktop only) */}
          <div className="hidden md:block absolute top-16 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-blue-200 via-indigo-200 via-violet-200 to-emerald-200" />

          {steps.map((item) => {
            const c = colorMap[item.color] || colorMap.blue;
            return (
              <div key={item.step} className="relative flex flex-col items-center text-center">
                {/* Step number */}
                <div className="relative z-10 mb-4">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${c.bg} ${c.text} border-4 border-white shadow-md`}
                  >
                    <item.icon className="h-6 w-6" />
                  </div>
                  <span
                    className={`absolute -top-2 -right-2 text-xs font-bold ${c.text} bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm border border-gray-100`}
                  >
                    {item.step}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
