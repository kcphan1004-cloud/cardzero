import DeckSubmissionForm from "../../components/DeckSubmissionForm";
import { manualDeckOptionsBySeries } from "../../data/deck-options";
import { seriesNames } from "../../data/card-series-generated";
import { getSupabaseAdmin } from "../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "牌组投稿｜卡零社 CardZero",
  description:
    "投稿你的 Union Arena 牌组、赛事成绩与卡组心得。",
};

type DeckOptionMap = Record<string, string[]>;

function uniqueSorted(values: string[]) {
  return [
    ...new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ].sort((a, b) =>
    a.localeCompare(
      b,
      "zh-Hans-CN",
    ),
  );
}

async function getExistingDeckOptions() {
  const result: DeckOptionMap = {};

  try {
    const supabase =
      getSupabaseAdmin();

    const response = await supabase
      .from("deck_submissions")
      .select("series, deck_name")
      .eq("status", "approved")
      .order("series", {
        ascending: true,
      })
      .order("deck_name", {
        ascending: true,
      });

    if (response.error) {
      throw response.error;
    }

    const rows = (response.data ??
      []) as Array<{
      series?: string | null;
      deck_name?: string | null;
    }>;

    for (const row of rows) {
      const series =
        row.series?.trim() ?? "";

      const deckName =
        row.deck_name?.trim() ?? "";

      if (!series || !deckName) {
        continue;
      }

      if (!result[series]) {
        result[series] = [];
      }

      result[series].push(deckName);
    }
  } catch (error) {
    /*
     * Supabase 尚未设定或暂时无法连接时，
     * 投稿页仍可使用卡牌资料库系列和手动牌组选项。
     */
    console.error(
      "读取现有牌组选项失败：",
      error,
    );
  }

  for (const series of Object.keys(
    result,
  )) {
    result[series] = uniqueSorted(
      result[series],
    );
  }

  return result;
}

function mergeDeckOptions(
  first: DeckOptionMap,
  second: DeckOptionMap,
) {
  const merged: DeckOptionMap = {};

  const allSeries = new Set([
    ...Object.keys(first),
    ...Object.keys(second),
  ]);

  for (const series of allSeries) {
    merged[series] = uniqueSorted([
      ...(first[series] ?? []),
      ...(second[series] ?? []),
    ]);
  }

  return merged;
}

export default async function SubmitPage() {
  const existingDeckOptions =
    await getExistingDeckOptions();

  const deckOptionsBySeries =
    mergeDeckOptions(
      manualDeckOptionsBySeries,
      existingDeckOptions,
    );

  /*
   * 作品系列直接使用卡牌资料库的 seriesNames。
   * 日后新增系列时，投稿页会自动同步。
   */
  const seriesOptions = uniqueSorted([
    ...seriesNames,
    ...Object.keys(
      deckOptionsBySeries,
    ),
  ]);

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top,_rgba(185,28,28,0.22),_transparent_48%)]">
        <div className="mx-auto max-w-5xl px-4 py-9 sm:px-6 lg:px-8">
          <p className="text-xs font-black tracking-[0.28em] text-red-400">
            DECK SUBMISSION
          </p>

          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            牌组投稿专区
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">
            从完整作品系列中选择对应作品，再选择现有牌组或新增牌组名称。
            登录玩家会自动带入玩家名称，投稿后立即公开。
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              "搜索并选择作品",
              "选择或新增牌组",
              "上传图片并公开",
            ].map((text, index) => (
              <div
                key={text}
                className="rounded-2xl border border-white/10 bg-black/40 p-4"
              >
                <p className="text-xs font-black text-red-400">
                  0{index + 1}
                </p>

                <p className="mt-2 text-sm font-bold text-zinc-200">
                  {text}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-6 text-amber-100/75">
            投稿内容会立即公开，请勿上传违法、侵权、冒充他人或含有私人资料的内容。
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-9 sm:px-6 lg:px-8">
        <DeckSubmissionForm
          seriesOptions={seriesOptions}
          deckOptionsBySeries={
            deckOptionsBySeries
          }
        />
      </section>
    </main>
  );
}
