import Link from "next/link";

import CardCatalog from "../../components/CardCatalog";
import {
  cardsBySeries,
  seriesNames,
} from "../../data/card-series-generated";

export const metadata = {
  title: "卡牌资料库｜卡零社 CardZero",
  description:
    "查询 UNION ARENA 中文卡牌资料、卡图与效果。",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 120;

type CardPageProps = {
  searchParams: Promise<{
    series?: string;
    page?: string;
  }>;
};

export default async function CardPage({
  searchParams,
}: CardPageProps) {
  const params = await searchParams;

  const fallbackSeries =
    seriesNames[0] ?? "";

  const requestedSeries =
    typeof params.series === "string"
      ? params.series
      : "";

  const selectedSeries =
    requestedSeries &&
    cardsBySeries[requestedSeries]
      ? requestedSeries
      : fallbackSeries;

  const seriesCards =
    cardsBySeries[selectedSeries] ?? [];

  const requestedPage =
    Number(params.page ?? "1");

  const totalPages = Math.max(
    1,
    Math.ceil(
      seriesCards.length / PAGE_SIZE,
    ),
  );

  const currentPage =
    Number.isInteger(requestedPage)
      ? Math.min(
          Math.max(requestedPage, 1),
          totalPages,
        )
      : 1;

  const startIndex =
    (currentPage - 1) * PAGE_SIZE;

  const pageCards =
    seriesCards.slice(
      startIndex,
      startIndex + PAGE_SIZE,
    );

  const totalCardCount =
    Object.values(cardsBySeries).reduce(
      (total, cards) =>
        total + cards.length,
      0,
    );

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <section className="mb-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black tracking-[0.25em] text-red-500">
                CARDZERO DATABASE
              </p>

              <h1 className="mt-3 text-2xl font-black sm:text-3xl">
                全系列卡牌资料
              </h1>

              <p className="mt-3 text-sm leading-7 text-zinc-400">
                已收录{" "}
                <span className="font-black text-white">
                  {seriesNames.length}
                </span>{" "}
                个系列，共{" "}
                <span className="font-black text-white">
                  {totalCardCount}
                </span>{" "}
                张基础卡牌资料。
              </p>
            </div>

            <form
              action="/card"
              method="get"
              className="flex w-full flex-col gap-3 sm:flex-row lg:max-w-xl"
            >
              <select
                name="series"
                defaultValue={selectedSeries}
                aria-label="选择卡牌系列"
                className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none focus:border-red-600"
              >
                {seriesNames.map(
                  (series) => (
                    <option
                      key={series}
                      value={series}
                    >
                      {series}（
                      {
                        cardsBySeries[
                          series
                        ]?.length
                      }
                      ）
                    </option>
                  ),
                )}
              </select>

              <button
                type="submit"
                className="rounded-xl bg-red-700 px-6 py-3 text-sm font-black text-white transition hover:bg-red-600"
              >
                查看系列
              </button>
            </form>
          </div>
        </section>

        <section className="mb-5 flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black text-white">
              {selectedSeries}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              本系列共{" "}
              {seriesCards.length} 张，目前显示第{" "}
              {startIndex + 1}～
              {Math.min(
                startIndex +
                  PAGE_SIZE,
                seriesCards.length,
              )}{" "}
              张
            </p>
          </div>

          <p className="text-sm font-bold text-zinc-400">
            第 {currentPage} /{" "}
            {totalPages} 页
          </p>
        </section>

        <CardCatalog cards={pageCards} />

        {totalPages > 1 && (
          <nav
            aria-label="卡牌分页"
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            {currentPage > 1 && (
              <Link
                href={{
                  pathname: "/card",
                  query: {
                    series:
                      selectedSeries,
                    page:
                      currentPage - 1,
                  },
                }}
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-3 text-sm font-bold text-zinc-300 transition hover:border-red-700 hover:text-white"
              >
                ← 上一页
              </Link>
            )}

            <span className="rounded-xl border border-zinc-800 bg-black px-5 py-3 text-sm text-zinc-400">
              第{" "}
              <strong className="text-white">
                {currentPage}
              </strong>{" "}
              页，共{" "}
              <strong className="text-white">
                {totalPages}
              </strong>{" "}
              页
            </span>

            {currentPage <
              totalPages && (
              <Link
                href={{
                  pathname: "/card",
                  query: {
                    series:
                      selectedSeries,
                    page:
                      currentPage + 1,
                  },
                }}
                className="rounded-xl bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-600"
              >
                下一页 →
              </Link>
            )}
          </nav>
        )}
      </div>
    </main>
  );
}