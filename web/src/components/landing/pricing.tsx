import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    <section id="pricing" className="py-20 bg-muted/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold sm:text-4xl">简单透明的价格</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            免费开始，按需升级。所有方案均包含核心 AI 创作能力。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={
                plan.highlighted
                  ? "border-primary shadow-lg scale-105 relative"
                  : ""
              }
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground font-medium">
                  最受欢迎
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">&yen;{plan.price}</span>
                  {plan.price !== "0" && (
                    <span className="text-muted-foreground text-sm">/月</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <Button
                    className="w-full"
                    variant={plan.highlighted ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
