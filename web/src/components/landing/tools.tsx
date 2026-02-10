const toolCategories = [
  {
    category: "文本生成",
    tools: ["ChatGPT", "Claude", "Gemini", "DeepSeek", "Kimi", "通义千问"],
  },
  {
    category: "视频生成",
    tools: ["NotebookLM", "可灵 AI", "即梦 AI", "Sora", "Runway"],
  },
  {
    category: "图片生成",
    tools: ["Midjourney", "DALL-E", "通义万相"],
  },
  {
    category: "音频/TTS",
    tools: ["Suno AI", "ElevenLabs", "Fish Audio"],
  },
  {
    category: "数字人",
    tools: ["HeyGen", "蝉镜 AI"],
  },
];

export function Tools() {
  return (
    <section id="tools" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold sm:text-4xl">20+ AI 工具矩阵</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            文本、视频、图片、音频、数字人 —— 按需选择，即插即用。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {toolCategories.map((cat) => (
            <div
              key={cat.category}
              className="rounded-xl border border-border bg-card p-6"
            >
              <h3 className="font-semibold text-primary mb-4">{cat.category}</h3>
              <ul className="space-y-2">
                {cat.tools.map((tool) => (
                  <li
                    key={tool}
                    className="text-sm text-muted-foreground flex items-center gap-2"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                    {tool}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
