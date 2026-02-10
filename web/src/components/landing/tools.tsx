import { MessageSquare, Video, Image, Music, User } from "lucide-react";

const toolCategories = [
  {
    icon: MessageSquare,
    category: "文本生成",
    color: "blue",
    tools: ["ChatGPT", "Claude", "Gemini", "DeepSeek", "Kimi", "通义千问"],
  },
  {
    icon: Video,
    category: "视频生成",
    color: "violet",
    tools: ["NotebookLM", "可灵 AI", "即梦 AI", "Sora", "Runway"],
  },
  {
    icon: Image,
    category: "图片生成",
    color: "pink",
    tools: ["Midjourney", "DALL-E", "通义万相"],
  },
  {
    icon: Music,
    category: "音频 / TTS",
    color: "amber",
    tools: ["Suno AI", "ElevenLabs", "Fish Audio"],
  },
  {
    icon: User,
    category: "数字人",
    color: "emerald",
    tools: ["HeyGen", "蝉镜 AI"],
  },
];

const colorMap: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  blue:    { bg: "bg-blue-50",    text: "text-blue-600",    border: "border-blue-100",    badge: "bg-blue-100 text-blue-700" },
  violet:  { bg: "bg-violet-50",  text: "text-violet-600",  border: "border-violet-100",  badge: "bg-violet-100 text-violet-700" },
  pink:    { bg: "bg-pink-50",    text: "text-pink-600",    border: "border-pink-100",    badge: "bg-pink-100 text-pink-700" },
  amber:   { bg: "bg-amber-50",   text: "text-amber-600",   border: "border-amber-100",   badge: "bg-amber-100 text-amber-700" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100", badge: "bg-emerald-100 text-emerald-700" },
};

export function Tools() {
  return (
    <section id="tools" className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1 text-sm font-medium text-violet-700 mb-4">
            工具矩阵
          </div>
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            20+ AI 工具，即插即用
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            文本、视频、图片、音频、数字人 —— 按需选择，灵活配置
          </p>
        </div>

        {/* Tool categories */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {toolCategories.map((cat) => {
            const c = colorMap[cat.color] || colorMap.blue;
            return (
              <div
                key={cat.category}
                className={`rounded-2xl border ${c.border} bg-white p-6 transition-all duration-300 hover:shadow-lg hover:shadow-gray-100/80 hover:-translate-y-0.5`}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.bg} ${c.text}`}
                  >
                    <cat.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{cat.category}</h3>
                </div>
                <ul className="space-y-2.5">
                  {cat.tools.map((tool) => (
                    <li
                      key={tool}
                      className="text-sm text-gray-600 flex items-center gap-2.5"
                    >
                      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-medium ${c.badge}`}>
                        {tool[0]}
                      </span>
                      {tool}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Bottom note */}
        <p className="text-center text-sm text-gray-400 mt-8">
          所有工具均支持通过浏览器 RPA 自动化接入，也可手动介入完成关键操作
        </p>
      </div>
    </section>
  );
}
