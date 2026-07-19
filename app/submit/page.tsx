import DeckSubmissionForm from "../../components/DeckSubmissionForm";
import { manualDeckOptionsBySeries } from "../../data/deck-options";
import {
  cardsBySeries,
  seriesNames,
} from "../../data/card-series-generated";
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

type SeriesSortKey = {
  uaNumber: number;
  productRank: number;
  volumeNumber: number;
  fullNumber: string;
};

const productTypeRank: Record<
  string,
  number
> = {
  BT: 50,
  EX: 40,
  ST: 30,
  PR: 20,
  AP: 10,
};

function getCardNumberSortKey(
  cardNumber: string,
): SeriesSortKey {
  const normalized = String(
    cardNumber ?? "",
  )
    .trim()
    .toUpperCase();

  /*
   * 常见格式：
   * UA54BT/MST-1-001
   * UA26BT/RLY-1-018
   * UA01BT/CGH-1-042
   *
   * 第一排序依据是 UA 后的产品编号。
   */
  const mainMatch = normalized.match(
    /^UA(\d+)([A-Z]+)?/,
  );

  const volumeMatch = normalized.match(
    /-(\d+)-\d+(?:_|$)/,
  );

  return {
    uaNumber: mainMatch
      ? Number(mainMatch[1])
      : -1,
    productRank:
      productTypeRank[
        mainMatch?.[2] ?? ""
      ] ?? 0,
    volumeNumber: volumeMatch
      ? Number(volumeMatch[1])
      : 0,
    fullNumber: normalized,
  };
}

function compareSeriesSortKey(
  a: SeriesSortKey,
  b: SeriesSortKey,
) {
  if (a.uaNumber !== b.uaNumber) {
    return b.uaNumber - a.uaNumber;
  }

  if (
    a.productRank !==
    b.productRank
  ) {
    return (
      b.productRank -
      a.productRank
    );
  }

  if (
    a.volumeNumber !==
    b.volumeNumber
  ) {
    return (
      b.volumeNumber -
      a.volumeNumber
    );
  }

  return b.fullNumber.localeCompare(
    a.fullNumber,
    "en",
    {
      numeric: true,
      sensitivity: "base",
    },
  );
}

function getSeriesSortKey(
  series: string,
): SeriesSortKey {
  const cards =
    cardsBySeries[series] ?? [];

  let newestKey: SeriesSortKey = {
    uaNumber: -1,
    productRank: 0,
    volumeNumber: 0,
    fullNumber: "",
  };

  for (const card of cards) {
    const nextKey =
      getCardNumberSortKey(
        card.number,
      );

    if (
      compareSeriesSortKey(
        nextKey,
        newestKey,
      ) < 0
    ) {
      newestKey = nextKey;
    }
  }

  return newestKey;
}

function sortSeriesNewestFirst(
  values: string[],
) {
  const uniqueValues = [
    ...new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];

  return uniqueValues.sort(
    (a, b) => {
      const keyComparison =
        compareSeriesSortKey(
          getSeriesSortKey(a),
          getSeriesSortKey(b),
        );

      if (keyComparison !== 0) {
        return keyComparison;
      }

      /*
       * 没有卡牌编号的自定义系列会排在
       * 正式卡牌系列之后，并以中文名称排序。
       */
      return a.localeCompare(
        b,
        "zh-Hans-CN",
      );
    },
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

function isCharacterCardType(
  type: unknown,
) {
  const normalized = String(
    type ?? "",
  )
    .trim()
    .toLowerCase();

  return [
    "角色卡",
    "角色",
    "character",
    "キャラクター",
  ].some((value) =>
    normalized.includes(
      value.toLowerCase(),
    ),
  );
}

function isUsableDeckOption(
  value: unknown,
) {
  const normalized = String(
    value ?? "",
  ).trim();

  return Boolean(
    normalized &&
      normalized !== "-" &&
      normalized !==
        "资料待补" &&
      normalized !==
        "翻译待补",
  );
}

function getCharacterDeckOptionsBySeries() {
  const result: DeckOptionMap = {};

  for (const series of seriesNames) {
    const cards =
      cardsBySeries[series] ?? [];

    /*
     * 同一角色可能存在多个卡号、普通版及异图版。
     * Set 会把相同中文名称合并，只在下拉清单显示一次。
     */
    const characterNames = [
      ...new Set(
        cards
          .filter((card) =>
            isCharacterCardType(
              card.type,
            ),
          )
          .map((card) =>
            String(
              card.nameZh ||
                card.name ||
                "",
            ).trim(),
          )
          .filter(
            isUsableDeckOption,
          ),
      ),
    ];

    result[series] =
      characterNames.sort(
        (a, b) =>
          a.localeCompare(
            b,
            "zh-Hans-CN",
          ),
      );
  }

  return result;
}

function mergeManyDeckOptions(
  ...sources: DeckOptionMap[]
) {
  return sources.reduce(
    (merged, source) =>
      mergeDeckOptions(
        merged,
        source,
      ),
    {},
  );
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

  const characterDeckOptions =
    getCharacterDeckOptionsBySeries();

  /*
   * 对应牌组来源优先级：
   *
   * 1. 手动设定的正式牌组名称
   * 2. Supabase 已公开投稿使用过的牌组名称
   * 3. 该作品卡牌资料中的角色名称
   *
   * 最终会自动去重。
   */
  const deckOptionsBySeries =
    mergeManyDeckOptions(
      manualDeckOptionsBySeries,
      existingDeckOptions,
      characterDeckOptions,
    );

  /*
   * 作品系列直接使用卡牌资料库的 seriesNames。
   * 日后新增系列时，投稿页会自动同步。
   */
  const seriesOptions =
    sortSeriesNewestFirst([
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
