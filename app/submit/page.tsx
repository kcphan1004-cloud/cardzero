import fs from "node:fs";
import path from "node:path";
import DeckSubmissionForm from "../../components/DeckSubmissionForm";
import { manualDeckOptionsBySeries } from "../../data/deck-options";
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

function getSeriesOptionsFromCards() {
  try {
    const directory = path.join(
      process.cwd(),
      "data",
      "card-series-generated",
    );

    const seriesNames = new Set<string>();

    const fileNames = fs
      .readdirSync(directory)
      .filter(
        (fileName) =>
          fileName.endsWith(".ts") &&
          !["index.ts", "types.ts"].includes(
            fileName,
          ),
      );

    for (const fileName of fileNames) {
      const filePath = path.join(
        directory,
        fileName,
      );

      const content = fs.readFileSync(
        filePath,
        "utf8",
      );

      const matches = content.matchAll(
        /["']series["']\s*:\s*["']([^"']+)["']/g,
      );

      for (const match of matches) {
        const seriesName =
          match[1]?.trim();

        if (
          seriesName &&
          seriesName !== "资料待补" &&
          seriesName !== "-"
        ) {
          seriesNames.add(seriesName);
        }
      }
    }

    return uniqueSorted(
      [...seriesNames],
    );
  } catch (error) {
    console.error(
      "读取中文作品系列失败：",
      error,
    );

    return [];
  }
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
     * 本地尚未设置 Supabase 环境变量，
     * 或数据库暂时无法连接时，
     * 页面仍然可以使用手动设定的牌组选项。
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
  const cardSeries =
    getSeriesOptionsFromCards();

  const existingDeckOptions =
    await getExistingDeckOptions();

  const deckOptionsBySeries =
    mergeDeckOptions(
      manualDeckOptionsBySeries,
      existingDeckOptions,
    );

  const seriesOptions = uniqueSorted([
    ...cardSeries,
    ...Object.keys(
      deckOptionsBySeries,
    ),
  ]);

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top,_rgba(185,28,28,0.22),_transparent_48%)]">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-xs font-bold tracking-[0.28em] text-red-400">
            DECK SUBMISSION
          </p>

          <h1 className="mt-3 text-3xl font-black sm:text-4xl lg:text-5xl">
            牌组投稿专区
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">
            先选择作品系列，再从该作品中选择对应的牌组。
            找不到牌组时，可以新增牌组名称。
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              "选择作品系列",
              "选择对应牌组",
              "提交并立即公开",
            ].map((text, index) => (
              <div
                key={text}
                className="rounded-2xl border border-white/10 bg-black/40 p-4"
              >
                <p className="text-xs font-bold text-red-400">
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
