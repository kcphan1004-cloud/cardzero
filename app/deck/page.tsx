import Link from "next/link";

import { createSupabaseAdmin } from "../../lib/supabase-admin";
import type { DeckSubmission } from "../../types/submission";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export default async function DeckPage() {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("deck_submissions")
    .select(
      "id, slug, author_name, deck_name, series, color, deck_type, description, image_url, published_at",
    )
    .eq("status", "approved")
    .order("published_at", {
      ascending: false,
    });

  if (error) {
    console.error("读取公开牌组失败：", error);
  }

  const decks = (data || []) as Pick<
    DeckSubmission,
    | "id"
    | "slug"
    | "author_name"
    | "deck_name"
    | "series"
    | "color"
    | "deck_type"
    | "description"
    | "image_url"
    | "published_at"
  >[];

  return (
    <main className="min-h-screen bg-black px-4 py-12 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 rounded-3xl border border-red-950 bg-zinc-950 p-7 sm:flex-row sm:items-end sm:justify-between sm:p-10">
          <div>
            <p className="text-xs font-black tracking-[0.28em] text-red-500">
              COMMUNITY DECKS
            </p>

            <h1 className="mt-3 text-3xl font-black sm:text-5xl">
              牌组分享
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
              来自卡零社玩家的牌组构筑、实战思路与心得。
            </p>
          </div>

          <Link
            href="/submit"
            className="rounded-xl bg-red-700 px-5 py-3 text-center text-sm font-black transition hover:bg-red-600"
          >
            ＋ 投稿牌组
          </Link>
        </div>

        {decks.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => (
              <Link
                key={deck.id}
                href={`/deck/${deck.slug}`}
                className="group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 transition hover:-translate-y-1 hover:border-red-700 hover:shadow-[0_16px_45px_rgba(185,28,28,0.15)]"
              >
                <div className="aspect-[16/10] overflow-hidden bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={deck.image_url}
                    alt={deck.deck_name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                </div>

                <div className="p-5">
                  <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                    <span className="rounded-full border border-red-900 bg-red-950/40 px-2.5 py-1 text-red-300">
                      {deck.color}
                    </span>
                    <span className="rounded-full border border-zinc-700 bg-black px-2.5 py-1 text-zinc-400">
                      {deck.deck_type}
                    </span>
                  </div>

                  <h2 className="mt-4 text-xl font-black">
                    {deck.deck_name}
                  </h2>

                  <p className="mt-2 text-sm text-zinc-500">
                    {deck.series}
                  </p>

                  <p className="mt-4 line-clamp-3 text-sm leading-7 text-zinc-400">
                    {deck.description}
                  </p>

                  <div className="mt-5 flex items-center justify-between border-t border-zinc-900 pt-4 text-xs">
                    <span className="text-zinc-500">
                      投稿：{deck.author_name}
                    </span>

                    <span className="text-zinc-600">
                      {formatDate(deck.published_at)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-zinc-800 bg-zinc-950 px-6 py-20 text-center">
            <h2 className="text-2xl font-black">
              目前还没有公开牌组
            </h2>

            <p className="mt-3 text-sm text-zinc-500">
              成为第一位向卡零社分享牌组的玩家。
            </p>

            <Link
              href="/submit"
              className="mt-7 inline-block rounded-xl bg-red-700 px-5 py-3 text-sm font-black transition hover:bg-red-600"
            >
              开始投稿
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
