const platforms = [
  { name: "哔哩哔哩", initial: "B", color: "from-[#00A1D6] to-[#0091c2]", types: "视频、图文" },
  { name: "抖音",     initial: "抖", color: "from-[#1a1a1a] to-[#333333]", types: "短视频" },
  { name: "小红书",   initial: "小", color: "from-[#FE2C55] to-[#e0264c]", types: "图文、视频" },
  { name: "YouTube",  initial: "Y",  color: "from-[#FF0000] to-[#cc0000]", types: "视频" },
  { name: "微信公众号", initial: "公", color: "from-[#07C160] to-[#06a050]", types: "图文" },
  { name: "微信视频号", initial: "视", color: "from-[#07C160] to-[#06a050]", types: "视频" },
  { name: "快手",     initial: "快", color: "from-[#FF4906] to-[#e04105]", types: "短视频" },
  { name: "知乎",     initial: "知", color: "from-[#0066FF] to-[#0055dd]", types: "图文、视频" },
  { name: "微博",     initial: "微", color: "from-[#E6162D] to-[#cc1326]", types: "图文、视频" },
  { name: "头条号",   initial: "头", color: "from-[#F85959] to-[#e04e4e]", types: "图文、视频" },
];

export function Platforms() {
  return (
    <section id="platforms" className="py-24 bg-gradient-to-b from-gray-50/80 to-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1 text-sm font-medium text-blue-700 mb-4">
            全平台覆盖
          </div>
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            覆盖 10 大主流平台
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            一次创作，全平台分发。自动适配各平台内容格式、字数限制和标签规则。
          </p>
        </div>

        {/* Platform grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {platforms.map((platform) => (
            <div
              key={platform.name}
              className="group flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-6 transition-all duration-300 hover:shadow-lg hover:shadow-gray-100/80 hover:-translate-y-0.5"
            >
              <div
                className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${platform.color} mb-3 flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:shadow-md transition-shadow group-hover:scale-105 transition-transform`}
              >
                {platform.initial}
              </div>
              <div className="font-medium text-gray-900 text-sm">
                {platform.name}
              </div>
              <div className="text-xs text-gray-400 mt-1">{platform.types}</div>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <p className="text-center text-sm text-gray-400 mt-8">
          持续接入更多平台，欢迎
          <a
            href="https://github.com/SecureAI-Team/creator/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 underline underline-offset-2"
          >
            提交需求
          </a>
        </p>
      </div>
    </section>
  );
}
