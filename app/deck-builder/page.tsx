import DeckBuilderWorkbench from "../../components/DeckBuilderWorkbench";
import {
  cardsBySeries,
  seriesNames,
} from "../../data/card-series-generated";
import type { Card } from "../../data/card-series-generated";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "线上组牌｜卡零社 CardZero",
  description:
    "使用卡零社中文卡牌资料库构筑、保存与导出 Union Arena 卡组。",
};

type PageProps = {
  searchParams: Promise<{
    series?: string | string[];
  }>;
};

export default async function DeckBuilderPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;

  const requestedSeries =
    typeof params.series === "string"
      ? params.series
      : "";

  const seriesMap =
    cardsBySeries as Record<
      string,
      Card[]
    >;

  const availableSeries = [
    ...seriesNames,
  ];

  const selectedSeries =
    requestedSeries &&
    seriesMap[requestedSeries]
      ? requestedSeries
      : availableSeries[0] ?? "";

  const cards =
    seriesMap[selectedSeries] ?? [];

  return (
    <DeckBuilderWorkbench
      cards={cards}
      seriesNames={availableSeries}
      selectedSeries={selectedSeries}
    />
  );
}
