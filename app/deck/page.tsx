import Link from "next/link";

export default function DeckPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-24 text-white">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="text-red-500 hover:text-red-400">
          ← 返回首页
        </Link>

        <p className="mt-10 text-sm font-bold tracking-[0.35em] text-red-500">
          CARDZERO DECKS
        </p>

        <h1 className="mt-3 text-4xl font-black md:text-6xl">
          牌组分享
        </h1>

        <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-400">
          浏览玩家公开分享的牌组、构筑说明与对战思路。
        </p>

        <div className="mt-10 rounded-2xl border border-red-950 bg-zinc-950 p-8">
          <p className="text-gray-400">
            牌组分享功能正在开发中。
          </p>
        </div>
      </div>
    </main>
  );
}