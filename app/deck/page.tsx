import Link from "next/link";

import { createSupabaseAdmin } from "../../lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PublicDeck = {
  id: string;
  slug: string | null;
  author_name: string | null;
  submitter_name: string | null;
  deck_name: string;
  series: string;
  color: string | null;
  deck_type: string | null;
  description: string | null;
  notes: string | null;
  event_name: string | null;
  result: string | null;
  image_url: string;
  published_at: string | null;
  created_at: string | null;
};

type QueryError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

function formatDate(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function errorText(error: QueryError | null) {
  if (!error) return "";

  return [
    error.message,
    error.code ? `代码：${error.code}` : "",
    error.details,
    error.hint,
  ]
    .filter(Boolean)
    .join(" · ");
}

export default async function DeckPage() {
  const supabase = createSupabaseAdmin();

  /*
   * 优先读取 V2 新字段。
   * 如果 SQL migration 尚未执行或 schema cache 尚未更新，
   * 自动退回旧投稿表结构，让现有投稿仍然可以显示。
   */
  const primary = await supabase
    .from("deck_submissions")
    .select(`
      id,
      slug,
      author_name,
      submitter_name,
      deck_name,
      series,
      color,
      deck_type,
      description,
      notes,
      event_name,
      result,
      image_url,
      published_at,
      created_at
    `)
    .eq("status", "approved")
    .order("published_at", {
      ascending: false,
      nullsFirst: false,
    })
    .order("created_at", {
      ascending: false,
    });

  let decks: PublicDeck[] = [];
  let visibleError = "";

  if (!primary.error) {
    decks = (primary.data ?? []) as PublicDeck[];
  } else {
    console.error(
      "读取 V2 公开牌组失败，尝试旧结构：",
      primary.error,
    );

    const fallback = await supabase
      .from("deck_submissions")
      .select(`
        id,
        deck_name,
        series,
        submitter_name,
        event_name,
        result,
        notes,
        image_url,
        created_at
      `)
      .eq("status", "approved")
      .order("created_at", {
        ascending: false,
      });

    if (fallback.error) {
      console.error(
        "读取旧结构公开牌组也失败：",
        fallback.error,
      );

      visibleError = errorText(
        fallback.error,
      );
    } else {
      decks = (fallback.data ?? []).map(
        (row) => ({
          id: String(row.id),
          slug: null,
          author_name: null,
          submitter_name:
            row.submitter_name ?? null,
          deck_name:
            row.deck_name ?? "未命名牌组",
          series:
            row.series ?? "未分类",
          color: null,
          deck_type: null,
          description: null,
          notes: row.notes ?? null,
          event_name:
            row.event_name ?? null,
          result: row.result ?? null,
          image_url:
            row.image_url ?? "",
          published_at: null,
          created_at:
            row.created_at ?? null,
        }),
      );

      visibleError =
        "目前正在使用旧投稿资料结构。请执行 deck-sharing-v2.sql 后重新部署，以启用牌组详情链接和完整字段。";
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 py-12 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <section className="flex flex-col gap-5 rounded-3xl border border-red-950 bg-zinc-950 p-7 sm:flex-row sm:items-end sm:justify-between sm:p-10">
          <div>
            <p className="text-xs font-black tracking-[0.28em] text-red-500">
              COMMUNITY DECKS
            </p>

            <h1 className="mt-3 text-3xl font-black sm:text-5xl">
              牌组分享
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
              来自卡零社玩家的牌组构筑、赛事成绩与实战心得。
            </p>
          </div>

          <Link
            href="/submit"
            className="rounded-xl bg-red-700 px-5 py-3 text-center text-sm font-black transition hover:bg-red-600"
          >
            ＋ 投稿牌组
          </Link>
        </section>

        {visibleError ? (
          <div className="mt-6 rounded-2xl border border-amber-700/60 bg-amber-950/20 px-5 py-4 text-sm leading-7 text-amber-200">
            {visibleError}
          </div>
        ) : null}

        {decks.length > 0 ? (
          <section className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => {
              const author =
                deck.author_name ||
                deck.submitter_name ||
                "CardZero 玩家";

              const description =
                deck.description ||
                deck.notes ||
                "";

              const publishedAt =
                deck.published_at ||
                deck.created_at;

              const content = (
                <>
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
                      {deck.color ? (
                        <span className="rounded-full border border-red-900 bg-red-950/40 px-2.5 py-1 text-red-300">
                          {deck.color}
                        </span>
                      ) : null}

                      {deck.deck_type ? (
                        <span className="rounded-full border border-zinc-700 bg-black px-2.5 py-1 text-zinc-400">
                          {deck.deck_type}
                        </span>
                      ) : null}

                      {deck.result ? (
                        <span className="rounded-full border border-amber-800 bg-amber-950/30 px-2.5 py-1 text-amber-300">
                          {deck.result}
                        </span>
                      ) : null}
                    </div>

                    <h2 className="mt-4 text-xl font-black">
                      {deck.deck_name}
                    </h2>

                    <p className="mt-2 text-sm text-zinc-500">
                      {deck.series}
                    </p>

                    {description ? (
                      <p className="mt-4 line-clamp-3 text-sm leading-7 text-zinc-400">
                        {description}
                      </p>
                    ) : null}

                    <div className="mt-5 flex items-center justify-between border-t border-zinc-900 pt-4 text-xs">
                      <span className="text-zinc-500">
                        投稿：{author}
                      </span>

                      <span className="text-zinc-600">
                        {formatDate(publishedAt)}
                      </span>
                    </div>
                  </div>
                </>
              );

              if (deck.slug) {
                return (
                  <Link
                    key={deck.id}
                    href={`/deck/${deck.slug}`}
                    className="group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 transition hover:-translate-y-1 hover:border-red-700"
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <article
                  key={deck.id}
                  className="group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950"
                >
                  {content}
                </article>
              );
            })}
          </section>
        ) : (
          <section className="mt-8 rounded-3xl border border-dashed border-zinc-800 bg-zinc-950 px-6 py-20 text-center">
            <h2 className="text-2xl font-black">
              目前还没有公开牌组
            </h2>

            <p className="mt-3 text-sm text-zinc-500">
              {visibleError
                ? "请先处理上方显示的 Supabase 查询错误。"
                : "成为第一位向卡零社分享牌组的玩家。"}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
