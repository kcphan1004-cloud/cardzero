import CardCatalog from "../../components/CardCatalog";
import { cards } from "../../data/cards";

export default function CardPage() {
  return (
    <main className="min-h-screen bg-black px-5 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-bold tracking-[0.35em] text-red-500">
          CARDZERO CARD DATABASE
        </p>

        <h1 className="mt-3 text-4xl font-black md:text-6xl">
          卡牌列表
        </h1>

        <p className="mt-5 max-w-2xl leading-8 text-gray-400">
          浏览、搜索和筛选 Union Arena 卡牌资料。
        </p>

        <div className="mt-10">
          <CardCatalog cards={cards} />
        </div>
      </div>
    </main>
  );
}