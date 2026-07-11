"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { Card } from "../data/cards";

type CardCatalogProps = {
  cards: Card[];
};

export default function CardCatalog({ cards }: CardCatalogProps) {
  const [search, setSearch] = useState("");
  const [color, setColor] = useState("全部");

  const filteredCards = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return cards.filter((card) => {
      const matchesSearch =
        card.name.toLowerCase().includes(keyword) ||
        card.number.toLowerCase().includes(keyword);

      const matchesColor =
        color === "全部" || card.color === color;

      return matchesSearch && matchesColor;
    });
  }, [cards, search, color]);

  return (
    <section>
      <div className="grid gap-4 rounded-2xl border border-red-950 bg-zinc-950 p-5 md:grid-cols-[1fr_220px]">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="搜索卡名或卡牌编号"
          className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none transition focus:border-red-600"
        />

        <select
          value={color}
          onChange={(event) => setColor(event.target.value)}
          className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none focus:border-red-600"
        >
          <option value="全部">全部颜色</option>
          <option value="红色">红色</option>
          <option value="蓝色">蓝色</option>
          <option value="绿色">绿色</option>
          <option value="黄色">黄色</option>
          <option value="紫色">紫色</option>
        </select>
      </div>

      <p className="mt-6 text-sm text-gray-500">
        找到 {filteredCards.length} 张卡牌
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filteredCards.map((card) => (
          <article
            key={card.id}
            className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 transition hover:-translate-y-1 hover:border-red-700"
          >
            <div className="relative aspect-[5/7] bg-zinc-900">
              <Image
                src={card.image}
                alt={card.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                className="object-contain"
              />
            </div>

            <div className="p-4">
              <p className="text-xs font-bold text-red-500">
                {card.number}
              </p>

              <h2 className="mt-2 font-black">
                {card.name}
              </h2>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-400">
                <span>{card.color}</span>
                <span>•</span>
                <span>{card.type}</span>
                <span>•</span>
                <span>{card.rarity}</span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-black p-2">
                  <p className="text-gray-500">费用</p>
                  <p className="mt-1 font-bold">{card.cost}</p>
                </div>

                <div className="rounded-lg bg-black p-2">
                  <p className="text-gray-500">AP</p>
                  <p className="mt-1 font-bold">{card.ap}</p>
                </div>

                <div className="rounded-lg bg-black p-2">
                  <p className="text-gray-500">BP</p>
                  <p className="mt-1 font-bold">{card.bp || "-"}</p>
                </div>
              </div>

              <p className="mt-4 line-clamp-3 text-sm leading-6 text-gray-400">
                {card.effect}
              </p>
            </div>
          </article>
        ))}
      </div>

      {filteredCards.length === 0 && (
        <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950 p-10 text-center text-gray-500">
          找不到符合条件的卡牌。
        </div>
      )}
    </section>
  );
}