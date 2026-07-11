import Link from "next/link";

export default function SubmitPage() {
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
          CARDZERO SUBMISSION
        </p>

        <h1 className="mt-3 text-4xl font-black md:text-6xl">
          投稿专区
        </h1>

        <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-400">
          投稿牌组攻略、卡牌分析、对战心得和其他 Union Arena 相关内容。
        </p>

        <section className="mt-10 rounded-2xl border border-red-950 bg-zinc-950 p-8">
          <h2 className="text-2xl font-black">投稿功能开发中</h2>

          <p className="mt-4 text-gray-400">
            之后会在这里加入投稿表格和审核功能。
          </p>
        </section>
      </div>
    </main>
  );
}