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

type CardPageProps = {
  searchParams: Promise<{
    series?: string;
  }>;
};

export default async function CardPage({
  searchParams,
}: CardPageProps) {
  const params = await searchParams;

  const requestedSeries =
    typeof params.series === "string"
      ? params.series
      : "";

  const initialSeries =
    requestedSeries &&
    cardsBySeries[requestedSeries]
      ? requestedSeries
      : "全部";

  const allCards = seriesNames.flatMap(
    (series) =>
      cardsBySeries[series] ?? [],
  );

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <CardCatalog
          cards={allCards}
          initialSeries={initialSeries}
        />
      </div>
    </main>
  );
}
