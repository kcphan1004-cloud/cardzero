import Link from "next/link";

export default function TierListPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-24 text-white">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="text-red-500 hover:text-red-400">
          ← 返回首页
        </Link>

        <p className="mt-10 text-sm font-bold tracking-[0.35em] text-red-500">
          CARDZERO TIER LIST
        </p>

        <h1 className="mt-3 text-4xl font-black md:text-6xl">
          T 表
        </h1>

        <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-400">
          查看当前 Union Arena 环境中的牌组强度、定位与分析。
        </p>

        <section className="mt-10 rounded-2xl border border-red-950 bg-zinc-950 p-8">
          <p className="text-gray-400">
            T 表功能正在开发中。
          </p>
        </section>
      </div>
    </main>
  );
}