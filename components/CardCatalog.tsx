"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { Card } from "../data/cards";

type CardCatalogProps = {
  cards: Card[];
};

export default function CardCatalog({
  cards,
}: CardCatalogProps) {
  const [search, setSearch] = useState("");
  const [color, setColor] = useState("全部");
  const [selectedCard, setSelectedCard] =
    useState<Card | null>(null);

  const filteredCards = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return cards.filter((card) => {
      const originalName =
        card.name?.toLowerCase() ?? "";

      const translatedName =
        card.nameZh?.toLowerCase() ?? "";

      const number =
        card.number?.toLowerCase() ?? "";

      const series =
        card.series?.toLowerCase() ?? "";

      const matchesSearch =
        originalName.includes(keyword) ||
        translatedName.includes(keyword) ||
        number.includes(keyword) ||
        series.includes(keyword);

      const matchesColor =
        color === "全部" || card.color === color;

      return matchesSearch && matchesColor;
    });
  }, [cards, search, color]);

  useEffect(() => {
    if (!selectedCard) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedCard(null);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [selectedCard]);

  return (
    <>
      <section>
        {/* 搜索与筛选 */}
        <div className="grid gap-4 rounded-2xl border border-red-950 bg-zinc-950 p-5 md:grid-cols-[1fr_220px]">
          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="搜索中文卡名、日文卡名、编号或作品"
            className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none transition focus:border-red-600"
          />

          <select
            value={color}
            onChange={(event) =>
              setColor(event.target.value)
            }
            className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none focus:border-red-600"
          >
            <option value="全部">全部颜色</option>
            <option value="红色">红色</option>
            <option value="蓝色">蓝色</option>
            <option value="绿色">绿色</option>
            <option value="黄色">黄色</option>
            <option value="紫色">紫色</option>
            <option value="未分类">未分类</option>
          </select>
        </div>

        <p className="mt-6 text-sm text-gray-500">
          找到 {filteredCards.length} 张卡牌
        </p>

        {/* 卡牌列表 */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredCards.map((card) => {
            const displayName =
              card.nameZh || card.name;

            const displayEffect =
              card.effectZh || card.effect;

            const hasTranslation = Boolean(
              card.nameZh ||
                card.effectZh ||
                card.triggerZh,
            );

            return (
              <button
                key={card.id}
                type="button"
                onClick={() =>
                  setSelectedCard(card)
                }
                className="group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-left transition duration-300 hover:-translate-y-1 hover:border-red-700 hover:shadow-[0_12px_35px_rgba(185,28,28,0.2)]"
              >
                <div className="relative aspect-[5/7] bg-zinc-900">
                  <Image
                    src={card.image}
                    alt={displayName}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className="object-contain transition duration-300 group-hover:scale-[1.03]"
                  />
                </div>

                <div className="p-4">
                  <p className="text-xs font-bold text-red-500">
                    {card.number}
                  </p>

                  <h2 className="mt-2 font-black text-white">
                    {displayName}
                  </h2>

                  {card.nameZh && (
                    <p className="mt-1 text-xs text-gray-500">
                      {card.name}
                    </p>
                  )}

                  {hasTranslation && (
                    <p className="mt-2 text-[11px] font-bold text-amber-500">
                      AI 自动翻译・待人工校对
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-400">
                    <span>{card.color}</span>
                    <span>•</span>
                    <span>{card.type}</span>
                    <span>•</span>
                    <span>{card.rarity}</span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-black p-2">
                      <p className="text-gray-500">
                        费用
                      </p>

                      <p className="mt-1 font-bold text-white">
                        {card.cost}
                      </p>
                    </div>

                    <div className="rounded-lg bg-black p-2">
                      <p className="text-gray-500">
                        AP
                      </p>

                      <p className="mt-1 font-bold text-white">
                        {card.ap}
                      </p>
                    </div>

                    <div className="rounded-lg bg-black p-2">
                      <p className="text-gray-500">
                        BP
                      </p>

                      <p className="mt-1 font-bold text-white">
                        {card.bp || "-"}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-gray-400">
                    {displayEffect}
                  </p>

                  <p className="mt-5 text-xs font-bold text-red-500">
                    点击放大查看
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {filteredCards.length === 0 && (
          <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950 p-10 text-center text-gray-500">
            找不到符合条件的卡牌。
          </div>
        )}
      </section>

      {/* 卡牌放大视窗 */}
      {selectedCard && (
        <div
          role="presentation"
          onMouseDown={() =>
            setSelectedCard(null)
          }
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={
              selectedCard.nameZh ||
              selectedCard.name
            }
            onMouseDown={(event) =>
              event.stopPropagation()
            }
            className="relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-red-900 bg-zinc-950 shadow-[0_25px_100px_rgba(0,0,0,0.8)]"
          >
            <button
              type="button"
              onClick={() =>
                setSelectedCard(null)
              }
              aria-label="关闭卡牌"
              className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-black/80 text-2xl text-white transition hover:border-red-600 hover:bg-red-700"
            >
              ×
            </button>

            <div className="grid gap-8 p-5 md:grid-cols-[minmax(280px,420px)_1fr] md:p-8">
              {/* 放大卡图 */}
              <div className="relative mx-auto aspect-[5/7] w-full max-w-[420px] overflow-hidden rounded-xl bg-black">
                <Image
                  src={selectedCard.image}
                  alt={
                    selectedCard.nameZh ||
                    selectedCard.name
                  }
                  fill
                  priority
                  sizes="(max-width: 768px) 90vw, 420px"
                  className="object-contain"
                />
              </div>

              {/* 卡牌资料 */}
              <div className="flex flex-col justify-center">
                <p className="text-sm font-bold tracking-[0.18em] text-red-500">
                  {selectedCard.number}
                </p>

                <h2 className="mt-3 text-3xl font-black text-white md:text-4xl">
                  {selectedCard.nameZh ||
                    selectedCard.name}
                </h2>

                {selectedCard.nameZh && (
                  <p className="mt-2 text-sm text-gray-500">
                    日文原名：
                    {selectedCard.name}
                  </p>
                )}

                <p className="mt-3 text-gray-500">
                  {selectedCard.series}
                </p>

                {(selectedCard.nameZh ||
                  selectedCard.effectZh ||
                  selectedCard.triggerZh) && (
                  <p className="mt-3 text-xs font-bold text-amber-500">
                    AI 自动翻译・待人工校对
                  </p>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="rounded-full border border-red-900 bg-red-950 px-4 py-2 text-sm text-red-300">
                    {selectedCard.color}
                  </span>

                  <span className="rounded-full border border-zinc-700 bg-black px-4 py-2 text-sm text-gray-300">
                    {selectedCard.type}
                  </span>

                  <span className="rounded-full border border-zinc-700 bg-black px-4 py-2 text-sm text-gray-300">
                    {selectedCard.rarity}
                  </span>

                  {selectedCard.variant && (
                    <span className="rounded-full border border-zinc-700 bg-black px-4 py-2 text-sm text-gray-300">
                      {selectedCard.variant}
                    </span>
                  )}
                </div>

                <div className="mt-7 grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-zinc-800 bg-black p-4 text-center">
                    <p className="text-xs text-gray-500">
                      费用
                    </p>

                    <p className="mt-2 text-xl font-black">
                      {selectedCard.cost}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-black p-4 text-center">
                    <p className="text-xs text-gray-500">
                      AP
                    </p>

                    <p className="mt-2 text-xl font-black">
                      {selectedCard.ap}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-black p-4 text-center">
                    <p className="text-xs text-gray-500">
                      BP
                    </p>

                    <p className="mt-2 text-xl font-black">
                      {selectedCard.bp || "-"}
                    </p>
                  </div>
                </div>

                {/* 中文效果 */}
                {selectedCard.effectZh ? (
                  <>
                    <div className="mt-7 rounded-xl border border-red-900 bg-red-950/20 p-5">
                      <p className="text-xs font-bold tracking-[0.2em] text-red-500">
                        中文效果
                      </p>

                      <p className="mt-3 whitespace-pre-line leading-7 text-gray-200">
                        {selectedCard.effectZh}
                      </p>
                    </div>

                    <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-5">
                      <p className="text-xs font-bold tracking-[0.2em] text-gray-500">
                        日文原文
                      </p>

                      <p className="mt-3 whitespace-pre-line leading-7 text-gray-400">
                        {selectedCard.effect}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="mt-7 rounded-xl border border-zinc-800 bg-black p-5">
                    <p className="text-xs font-bold tracking-[0.2em] text-red-500">
                      CARD EFFECT
                    </p>

                    <p className="mt-3 whitespace-pre-line leading-7 text-gray-300">
                      {selectedCard.effect}
                    </p>
                  </div>
                )}

                {/* Trigger */}
                {(selectedCard.triggerZh ||
                  (selectedCard.trigger &&
                    selectedCard.trigger !==
                      "-")) && (
                  <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-5">
                    <p className="text-xs font-bold tracking-[0.2em] text-red-500">
                      TRIGGER
                    </p>

                    <p className="mt-3 whitespace-pre-line leading-7 text-gray-300">
                      {selectedCard.triggerZh ||
                        selectedCard.trigger}
                    </p>

                    {selectedCard.triggerZh &&
                      selectedCard.trigger &&
                      selectedCard.trigger !==
                        "-" && (
                        <p className="mt-3 whitespace-pre-line border-t border-zinc-800 pt-3 text-sm leading-6 text-gray-500">
                          日文原文：
                          {selectedCard.trigger}
                        </p>
                      )}
                  </div>
                )}

                <p className="mt-5 text-sm text-gray-600">
                  点击黑色背景、右上角 × 或按 Esc
                  关闭。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}