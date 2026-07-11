import Link from "next/link";

export default function DeckBuilderPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-24 text-white">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="text-red-500 transition hover:text-red-400"
        >
          ← 返回首页
        </Link>

        <p className="mt-10 text-sm font-bold tracking-[0.35em] text-red-500">
          CARDZERO DECK BUILDER
        </p>

        <h1 className="mt-3 text-4xl font-black md:text-6xl">
          线上组牌
        </h1>

        <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-400">
          从卡牌列表选择卡片，建立、调整并分享你的 Union Arena 牌组。
        </p>

        <div className="mt-10 rounded-2xl border border-red-950 bg-zinc-950 p-8">
          <p className="text-gray-400">
            组牌功能正在开发中。
          </p>
        </div>
      </div>
    </main>
  );
}