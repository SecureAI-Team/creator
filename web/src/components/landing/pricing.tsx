import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import Link from "next/link";

const plans = [
  {
    name: "免费版",
    price: "0",
    description: "适合刚起步的创作者",
    features: [
      "3 个平台连接",
      "基础 AI 工具（ChatGPT）",
      "每日 10 次内容生成",
      "基础数据分析",
      "社区支持",
    ],
    cta: "免费开始",
    highlighted: false,
  },
  {
    name: "专业版",
    price: "99",
    description: "适合成长期创作者",
    features: [
      "全部 10 个平台",
      "全部 20+ AI 工具",
      "无限内容生成",
      "高级数据分析 + 趋势报告",
      "热点监控 + 选题推荐",
      "评论智能管理",
      "封面自动生成",
      "优先客服支持",
    ],
    cta: "立即升级",
    highlighted: true,
  },
  {
    name: "团队版",
    price: "299",
    description: "适合 MCN / 工作室",
    features: [
      "专业版全部功能",
      "多账号管理",
      "团队协作",
      "API 接入",
      "自定义工作流",
      "专属客户经理",
    ],
    cta: "联系我们",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-gradient-to-b from-gray-50/80 to-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-sm font-medium text-emerald-700 mb-4">
            定价方案
          </div>
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            简单透明的价格
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            免费开始，按需升级。所有方案均包含核心 AI 创作能力。
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 transition-all duration-300 ${
                plan.highlighted
                  ? "border-blue-200 bg-white shadow-xl shadow-blue-100/50 scale-[1.02] ring-1 ring-blue-100"
                  : "border-gray-100 bg-white hover:shadow-lg hover:shadow-gray-100/80"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-1 text-xs text-white font-medium shadow-sm">
                  最受欢迎
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  {plan.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-900">
                    &yen;{plan.price}
                  </span>
                  {plan.price !== "0" && (
                    <span className="text-gray-400 text-sm">/月</span>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-sm text-gray-600"
                  >
                    <Check
                      className={`h-4 w-4 mt-0.5 shrink-0 ${
                        plan.highlighted ? "text-blue-500" : "text-emerald-500"
                      }`}
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link href="/register">
                <Button
                  className={`w-full rounded-xl h-11 ${
                    plan.highlighted
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                  variant={plan.highlighted ? "default" : "outline"}
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
