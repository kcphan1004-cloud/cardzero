import Link from "next/link";

const features = [
  {
    title: "卡牌列表",
    description: "搜索并浏览 Union Arena 卡牌资料、编号、效果与中文翻译。",
    href: "/cards",
    icon: "▣",
  },
  {
    title: "线上组牌",
    description: "从卡牌列表选择卡片，建立并调整自己的牌组。",
    href: "/deck-builder",
    icon: "◆",
  },
  {
    title: "T 表",
    description: "查看当前环境牌组强度、定位与对战分析。",
    href: "/tier-list",
    icon: "★",
  },
  {
    title: "投稿专区",
    description: "投稿牌组攻略、卡牌分析、对战心得与内容文章。",
    href: "/submit",
    icon: "✎",
  },
  {
    title: "牌组分享",
    description: "浏览玩家公开的牌组，并分享自己的构筑。",
    href: "/deck",
    icon: "▤",
  },
];

export default function FeatureSection() {
  return (
    <section className="bg-black px-6 py-20 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10">
          <p className="text-sm font-bold tracking-[0.35em] text-red-500">
            CARDZERO FEATURES
          </p>

          <h2 className="mt-3 text-3xl font-black md:text-5xl">
            探索卡零社
          </h2>

          <p className="mt-4 max-w-2xl leading-7 text-gray-400">
            从卡牌查询、线上组牌到牌组分享，为华语 Union Arena
            玩家提供完整的内容与工具。
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {features.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="group rounded-2xl border border-red-950 bg-zinc-950 p-6 transition duration-300 hover:-translate-y-2 hover:border-red-600 hover:shadow-[0_15px_50px_rgba(185,28,28,0.2)]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-800 bg-red-950 text-2xl font-black text-red-500">
                {feature.icon}
              </div>

              <h3 className="mt-6 text-xl font-black transition group-hover:text-red-500">
                {feature.title}
              </h3>

              <p className="mt-3 text-sm leading-6 text-gray-500">
                {feature.description}
              </p>

              <p className="mt-6 text-sm font-bold text-red-500">
                立即进入 →
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}