import Link from "next/link";

export default async function SubmissionSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    id?: string;
  }>;
}) {
  const { id } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-16 text-white">
      <div className="w-full max-w-xl rounded-3xl border border-emerald-900 bg-zinc-950 p-8 text-center sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-700 bg-emerald-950/50 text-3xl text-emerald-300">
          ✓
        </div>

        <h1 className="mt-6 text-3xl font-black">
          投稿成功
        </h1>

        <p className="mt-4 leading-7 text-zinc-400">
          你的牌组已进入审核。审核通过后会显示在牌组分享页面。
        </p>

        {id && (
          <p className="mt-5 break-all rounded-xl border border-zinc-800 bg-black px-4 py-3 text-xs text-zinc-500">
            投稿编号：{id}
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/deck"
            className="rounded-xl bg-red-700 px-5 py-3 text-sm font-bold transition hover:bg-red-600"
          >
            查看牌组分享
          </Link>

          <Link
            href="/submit"
            className="rounded-xl border border-zinc-700 bg-black px-5 py-3 text-sm font-bold text-zinc-300 transition hover:border-red-700 hover:text-white"
          >
            再投稿一副
          </Link>
        </div>
      </div>
    </main>
  );
}
