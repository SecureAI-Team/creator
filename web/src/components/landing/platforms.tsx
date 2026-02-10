const platforms = [
  { name: "哔哩哔哩", color: "#00A1D6", types: "视频、图文" },
  { name: "抖音", color: "#000000", types: "短视频" },
  { name: "小红书", color: "#FE2C55", types: "图文、视频" },
  { name: "YouTube", color: "#FF0000", types: "视频" },
  { name: "微信公众号", color: "#07C160", types: "图文" },
  { name: "微信视频号", color: "#07C160", types: "视频" },
  { name: "快手", color: "#FF4906", types: "短视频" },
  { name: "知乎", color: "#0066FF", types: "图文、视频" },
  { name: "微博", color: "#E6162D", types: "图文、视频" },
  { name: "头条号", color: "#F85959", types: "图文、视频" },
];

export function Platforms() {
  return (
    <section id="platforms" className="py-20 bg-muted/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold sm:text-4xl">覆盖 10 大主流平台</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            一次创作，全平台分发。自动适配各平台内容格式、字数限制和标签规则。
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {platforms.map((platform) => (
            <div
              key={platform.name}
              className="flex flex-col items-center rounded-xl border border-border bg-card p-6 hover:shadow-md transition-shadow"
            >
              <div
                className="h-12 w-12 rounded-full mb-3 flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: platform.color }}
              >
                {platform.name[0]}
              </div>
              <div className="font-medium text-sm">{platform.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{platform.types}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
