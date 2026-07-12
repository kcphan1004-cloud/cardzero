import Link from "next/link";
import { notFound } from "next/navigation";

import { createSupabaseAdmin } from "../../../lib/supabase-admin";
import type { DeckSubmission } from "../../../types/submission";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export default async function DeckDetailPage({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("deck_submissions")
    .select("*")
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();

  if (error) {
    console.error("读取牌组详情失败：", error);
  }

  if (!data) {
    notFound();
  }

  const deck = data as DeckSubmission;

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6">
      <article className="mx-auto max-w-6xl">
        <Link
          href="/deck"
          className="text-sm font-bold text-zinc-500 transition hover:text-red-400"
        >
          ← 返回牌组分享
        </Link>

        <div className="mt-6 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
            <div className="bg-black p-4 sm:p-7">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={deck.image_url}
                alt={deck.deck_name}
                className="max-h-[760px] w-full rounded-2xl object-contain"
              />
            </div>

            <div className="p-6 sm:p-9">
              <p className="text-xs font-black tracking-[0.24em] text-red-500">
                COMMUNITY DECK
              </p>

              <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
                {deck.deck_name}
              </h1>

              <p className="mt-3 text-zinc-500">
                {deck.series}
              </p>

              <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full border border-red-900 bg-red-950/40 px-3 py-2 text-red-300">
                  {deck.color}
                </span>

                <span className="rounded-full border border-zinc-700 bg-black px-3 py-2 text-zinc-300">
                  {deck.deck_type}
                </span>
              </div>

              <div className="mt-7 rounded-2xl border border-zinc-800 bg-black p-5">
                <p className="text-xs font-black tracking-[0.18em] text-zinc-600">
                  投稿者
                </p>
                <p className="mt-2 font-bold">
                  {deck.author_name}
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  发布于 {formatDate(deck.published_at)}
                </p>
              </div>

              {deck.deck_link && (
                <a
                  href={deck.deck_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 block rounded-xl bg-red-700 px-5 py-3 text-center text-sm font-black transition hover:bg-red-600"
                >
                  打开牌表链接 ↗
                </a>
              )}
            </div>
          </div>

          <div className="grid gap-6 border-t border-zinc-800 p-6 sm:p-9 lg:grid-cols-2">
            <section className="rounded-2xl border border-zinc-800 bg-black p-5 sm:p-7">
              <h2 className="text-xl font-black text-red-500">
                牌组介绍
              </h2>
              <p className="mt-4 whitespace-pre-line text-sm leading-8 text-zinc-300">
                {deck.description}
              </p>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-black p-5 sm:p-7">
              <h2 className="text-xl font-black text-red-500">
                操作思路
              </h2>
              <p className="mt-4 whitespace-pre-line text-sm leading-8 text-zinc-300">
                {deck.strategy}
              </p>
            </section>

            {deck.deck_code && (
              <section className="rounded-2xl border border-zinc-800 bg-black p-5 sm:p-7 lg:col-span-2">
                <h2 className="text-xl font-black text-red-500">
                  牌组代码／牌表文字
                </h2>
                <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-zinc-900 bg-zinc-950 p-4 text-sm leading-7 text-zinc-400">
                  {deck.deck_code}
                </pre>
              </section>
            )}
          </div>
        </div>
      </article>
    </main>
  );
}
