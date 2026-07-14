import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center">
        <p className="text-xs font-black tracking-[0.25em] text-red-500">
          CARDZERO 404
        </p>

        <h1 className="mt-4 text-3xl font-black">
          找不到这个页面
        </h1>

        <p className="mt-4 text-sm leading-7 text-zinc-400">
          页面可能已被移动、删除，或网址输入错误。
        </p>

        <Link
          href="/"
          className="mt-7 inline-flex rounded-xl bg-red-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-600"
        >
          返回卡零社首页
        </Link>
      </div>
    </main>
  );
}