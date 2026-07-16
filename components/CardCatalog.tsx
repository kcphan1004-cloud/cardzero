"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type { Card } from "../data/card-series-generated";

type CardCatalogProps = {
  cards: Card[];
};

type GridMode =
  | "compact"
  | "standard"
  | "large";

type SortMode =
  | "number"
  | "name"
  | "cost-low"
  | "cost-high"
  | "bp-high"
  | "rarity";

type CardArtworkProps = {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
};

const selectClassName =
  "w-full rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm text-white outline-none transition focus:border-red-600";

const gridModeLabels: Record<
  GridMode,
  string
> = {
  compact: "紧凑",
  standard: "标准",
  large: "大图",
};

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function uniqueOptions(values: string[]) {
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

function getBpValue(bp: string) {
  const match =
    String(bp).match(/\d+/);

  return match
    ? Number(match[0])
    : 0;
}

function getRarityValue(
  rarity: string,
) {
  const order: Record<
    string,
    number
  > = {
    SR: 7,
    R: 6,
    U: 5,
    C: 4,
    AP: 3,
    L: 2,
    "-": 0,
  };

  return order[rarity] ?? 1;
}

function normalizeImagePath(
  imagePath: string,
) {
  let value = String(
    imagePath ?? "",
  )
    .trim()
    .replace(/\\/g, "/");

  if (!value) {
    return "";
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  if (
    value.startsWith("public/")
  ) {
    value = value.slice(
      "public".length,
    );
  }

  if (!value.startsWith("/")) {
    value = `/${value}`;
  }

  return value;
}

function getColorStyles(
  color: string,
) {
  switch (color) {
    case "红色":
      return {
        border:
          "border-red-950 hover:border-red-500",
        glow:
          "hover:shadow-[0_16px_45px_rgba(239,68,68,0.18)]",
        dot: "bg-red-500",
        badge:
          "border-red-900 bg-red-950/80 text-red-300",
      };

    case "蓝色":
      return {
        border:
          "border-blue-950 hover:border-blue-500",
        glow:
          "hover:shadow-[0_16px_45px_rgba(59,130,246,0.18)]",
        dot: "bg-blue-500",
        badge:
          "border-blue-900 bg-blue-950/80 text-blue-300",
      };

    case "绿色":
      return {
        border:
          "border-emerald-950 hover:border-emerald-500",
        glow:
          "hover:shadow-[0_16px_45px_rgba(16,185,129,0.18)]",
        dot: "bg-emerald-500",
        badge:
          "border-emerald-900 bg-emerald-950/80 text-emerald-300",
      };

    case "黄色":
      return {
        border:
          "border-yellow-950 hover:border-yellow-500",
        glow:
          "hover:shadow-[0_16px_45px_rgba(234,179,8,0.18)]",
        dot: "bg-yellow-400",
        badge:
          "border-yellow-900 bg-yellow-950/80 text-yellow-300",
      };

    case "紫色":
      return {
        border:
          "border-purple-950 hover:border-purple-500",
        glow:
          "hover:shadow-[0_16px_45px_rgba(168,85,247,0.18)]",
        dot: "bg-purple-500",
        badge:
          "border-purple-900 bg-purple-950/80 text-purple-300",
      };

    default:
      return {
        border:
          "border-zinc-800 hover:border-red-700",
        glow:
          "hover:shadow-[0_16px_45px_rgba(185,28,28,0.16)]",
        dot: "bg-zinc-500",
        badge:
          "border-zinc-700 bg-zinc-900/90 text-zinc-300",
      };
  }
}

function hasChineseTranslation(
  card: Card,
) {
  return Boolean(
    card.nameZh &&
      card.nameZh !== card.name &&
      /[\u3400-\u9fff]/.test(
        card.nameZh,
      ),
  );
}


function parseGeneratedEnergy(
  value: unknown,
) {
  const raw = String(value ?? "")
    .trim()
    .replace(/\s+/g, "");

  if (
    !raw ||
    raw === "-" ||
    raw === "0"
  ) {
    return null;
  }

  const countMatch =
    raw.match(/\d+/);

  const count = Math.min(
    Math.max(
      countMatch
        ? Number(countMatch[0])
        : 1,
      1,
    ),
    10,
  );

  const colorKey =
    raw.includes("黄色") ||
    raw.includes("黃色") ||
    raw.includes("黄") ||
    raw.includes("黃")
      ? "yellow"
      : raw.includes("红色") ||
          raw.includes("紅色") ||
          raw.includes("红") ||
          raw.includes("紅")
        ? "red"
        : raw.includes("蓝色") ||
            raw.includes("藍色") ||
            raw.includes("蓝") ||
            raw.includes("藍")
          ? "blue"
          : raw.includes("绿色") ||
              raw.includes("綠色") ||
              raw.includes("绿") ||
              raw.includes("綠")
            ? "green"
            : raw.includes("紫色") ||
                raw.includes("紫")
              ? "purple"
              : "neutral";

  const colorLabel: Record<
    string,
    string
  > = {
    yellow: "黄色",
    red: "红色",
    blue: "蓝色",
    green: "绿色",
    purple: "紫色",
    neutral: "无色",
  };

  return {
    count,
    colorKey,
    colorLabel:
      colorLabel[colorKey],
  };
}

function GeneratedEnergyDots({
  value,
}: {
  value: unknown;
}) {
  const energy =
    parseGeneratedEnergy(value);

  if (!energy) {
    return (
      <span className="text-xl font-black text-white">
        -
      </span>
    );
  }

  const dotClassName: Record<
    string,
    string
  > = {
    yellow:
      "border-yellow-100 bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.65)]",
    red:
      "border-red-200 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.65)]",
    blue:
      "border-blue-200 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.65)]",
    green:
      "border-emerald-200 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.65)]",
    purple:
      "border-purple-200 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.65)]",
    neutral:
      "border-zinc-200 bg-zinc-500 shadow-[0_0_10px_rgba(161,161,170,0.45)]",
  };

  return (
    <div
      className="flex min-h-7 flex-wrap items-center justify-center gap-1.5"
      aria-label={`${energy.colorLabel}能量 ${energy.count}`}
      title={`${energy.colorLabel} × ${energy.count}`}
    >
      {Array.from({
        length: energy.count,
      }).map((_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={`relative inline-flex h-5 w-5 shrink-0 rounded-full border-2 ${dotClassName[energy.colorKey]}`}
        >
          <span className="absolute inset-[3px] rounded-full border border-black/20 bg-white/10" />
        </span>
      ))}
    </div>
  );
}

function CardArtwork({
  src,
  alt,
  sizes,
  priority = false,
  className = "",
}: CardArtworkProps) {
  const imageSrc =
    normalizeImagePath(src);

  const [failed, setFailed] =
    useState(false);

  useEffect(() => {
    setFailed(false);
  }, [imageSrc]);

  if (!imageSrc || failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-950 px-4 text-center">
        <span className="text-3xl text-zinc-700">
          ▣
        </span>

        <p className="mt-3 text-xs font-bold text-zinc-500">
          卡图载入失败
        </p>

        <p className="mt-1 break-all text-[9px] leading-4 text-zinc-700">
          {imageSrc ||
            "没有图片路径"}
        </p>
      </div>
    );
  }

  return (
    <Image
      src={imageSrc}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      onError={() =>
        setFailed(true)
      }
      className={className}
    />
  );
}

export default function CardCatalog({
  cards,
}: CardCatalogProps) {
  const [search, setSearch] =
    useState("");

  const [
    seriesFilter,
    setSeriesFilter,
  ] = useState("全部");

  const [
    colorFilter,
    setColorFilter,
  ] = useState("全部");

  const [
    typeFilter,
    setTypeFilter,
  ] = useState("全部");

  const [
    rarityFilter,
    setRarityFilter,
  ] = useState("全部");

  const [
    costFilter,
    setCostFilter,
  ] = useState("全部");

  const [sortMode, setSortMode] =
    useState<SortMode>("number");

  const [gridMode, setGridMode] =
    useState<GridMode>(
      "standard",
    );

  const [
    selectedCard,
    setSelectedCard,
  ] = useState<Card | null>(
    null,
  );

  const [
    showOriginal,
    setShowOriginal,
  ] = useState(false);

  const seriesOptions =
    useMemo(
      () =>
        uniqueOptions(
          cards.map(
            (card) =>
              card.series,
          ),
        ),
      [cards],
    );

  const colorOptions = useMemo(
    () =>
      uniqueOptions(
        cards.map(
          (card) =>
            card.color,
        ),
      ),
    [cards],
  );

  const typeOptions = useMemo(
    () =>
      uniqueOptions(
        cards.map(
          (card) =>
            card.type,
        ),
      ),
    [cards],
  );

  const rarityOptions =
    useMemo(
      () =>
        uniqueOptions(
          cards.map(
            (card) =>
              card.rarity,
          ),
        ),
      [cards],
    );

  const costOptions = useMemo(
    () => {
      return [
        ...new Set(
          cards
            .map((card) =>
              Number(
                card.cost,
              ),
            )
            .filter((value) =>
              Number.isFinite(
                value,
              ),
            ),
        ),
      ].sort(
        (a, b) => a - b,
      );
    },
    [cards],
  );

  const filteredCards =
    useMemo(() => {
      const keyword =
        normalize(search);

      const result =
        cards.filter((card) => {
          const searchableText = [
            card.number,
            card.name,
            card.nameZh,
            card.series,
            card.effect,
            card.effectZh,
            card.trigger,
            card.triggerZh,
          ]
            .map(normalize)
            .join(" ");

          const matchesSearch =
            !keyword ||
            searchableText.includes(
              keyword,
            );

          const matchesSeries =
            seriesFilter ===
              "全部" ||
            card.series ===
              seriesFilter;

          const matchesColor =
            colorFilter ===
              "全部" ||
            card.color ===
              colorFilter;

          const matchesType =
            typeFilter ===
              "全部" ||
            card.type ===
              typeFilter;

          const matchesRarity =
            rarityFilter ===
              "全部" ||
            card.rarity ===
              rarityFilter;

          const matchesCost =
            costFilter ===
              "全部" ||
            String(card.cost) ===
              costFilter;

          return (
            matchesSearch &&
            matchesSeries &&
            matchesColor &&
            matchesType &&
            matchesRarity &&
            matchesCost
          );
        });

      return [
        ...result,
      ].sort((a, b) => {
        switch (sortMode) {
          case "name":
            return (
              a.nameZh ||
              a.name
            ).localeCompare(
              b.nameZh ||
                b.name,
              "zh-Hans-CN",
            );

          case "cost-low":
            return (
              a.cost -
              b.cost
            );

          case "cost-high":
            return (
              b.cost -
              a.cost
            );

          case "bp-high":
            return (
              getBpValue(
                b.bp,
              ) -
              getBpValue(
                a.bp,
              )
            );

          case "rarity":
            return (
              getRarityValue(
                b.rarity,
              ) -
              getRarityValue(
                a.rarity,
              )
            );

          case "number":
          default:
            return a.number.localeCompare(
              b.number,
              undefined,
              {
                numeric: true,
                sensitivity:
                  "base",
              },
            );
        }
      });
    }, [
      cards,
      search,
      seriesFilter,
      colorFilter,
      typeFilter,
      rarityFilter,
      costFilter,
      sortMode,
    ]);

  const uniqueCardCount =
    useMemo(
      () =>
        new Set(
          cards.map(
            (card) =>
              card.number,
          ),
        ).size,
      [cards],
    );

  const translatedCardCount =
    useMemo(
      () =>
        cards.filter((card) =>
          hasChineseTranslation(
            card,
          ),
        ).length,
      [cards],
    );

  const activeFilterCount = [
    seriesFilter,
    colorFilter,
    typeFilter,
    rarityFilter,
    costFilter,
  ].filter(
    (value) =>
      value !== "全部",
  ).length;

  const gridClassName =
    gridMode === "compact"
      ? "grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7"
      : gridMode === "large"
        ? "grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        : "grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

  function clearFilters() {
    setSearch("");
    setSeriesFilter("全部");
    setColorFilter("全部");
    setTypeFilter("全部");
    setRarityFilter("全部");
    setCostFilter("全部");
    setSortMode("number");
  }

  function openCard(
    card: Card,
  ) {
    setShowOriginal(false);
    setSelectedCard(card);
  }

  useEffect(() => {
    if (!selectedCard) {
      return;
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        setSelectedCard(
          null,
        );
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
      <section className="w-full">
        <div className="relative overflow-hidden rounded-3xl border border-red-950 bg-zinc-950 px-5 py-7 sm:px-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-red-950/40 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black tracking-[0.32em] text-red-500">
                CARDZERO DATABASE
              </p>

              <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">
                卡牌资料库
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
                UNION ARENA
                中文卡牌资料、卡图与效果查询。
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-2xl border border-zinc-800 bg-black/70 px-4 py-3 text-center">
                <p className="text-xl font-black text-white">
                  {
                    uniqueCardCount
                  }
                </p>

                <p className="mt-1 text-[11px] text-zinc-500">
                  卡号
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-black/70 px-4 py-3 text-center">
                <p className="text-xl font-black text-white">
                  {cards.length}
                </p>

                <p className="mt-1 text-[11px] text-zinc-500">
                  卡图
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-black/70 px-4 py-3 text-center">
                <p className="text-xl font-black text-red-500">
                  {
                    translatedCardCount
                  }
                </p>

                <p className="mt-1 text-[11px] text-zinc-500">
                  中文化
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-30 mt-5 rounded-2xl border border-zinc-800 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-xl lg:sticky lg:top-[72px]">
          <div className="grid gap-3 xl:grid-cols-[minmax(260px,1.6fr)_repeat(5,minmax(125px,0.7fr))]">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600">
                ⌕
              </span>

              <input
                type="search"
                value={search}
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event.target
                      .value,
                  )
                }
                placeholder="搜索中文卡名、日文卡名、编号或效果"
                className="w-full rounded-xl border border-zinc-800 bg-black py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-red-600"
              />
            </div>

            <select
              value={
                seriesFilter
              }
              onChange={(
                event,
              ) =>
                setSeriesFilter(
                  event.target
                    .value,
                )
              }
              className={
                selectClassName
              }
            >
              <option value="全部">
                全部作品
              </option>

              {seriesOptions.map(
                (series) => (
                  <option
                    key={series}
                    value={series}
                  >
                    {series}
                  </option>
                ),
              )}
            </select>

            <select
              value={
                colorFilter
              }
              onChange={(
                event,
              ) =>
                setColorFilter(
                  event.target
                    .value,
                )
              }
              className={
                selectClassName
              }
            >
              <option value="全部">
                全部颜色
              </option>

              {colorOptions.map(
                (color) => (
                  <option
                    key={color}
                    value={color}
                  >
                    {color}
                  </option>
                ),
              )}
            </select>

            <select
              value={
                typeFilter
              }
              onChange={(
                event,
              ) =>
                setTypeFilter(
                  event.target
                    .value,
                )
              }
              className={
                selectClassName
              }
            >
              <option value="全部">
                全部类型
              </option>

              {typeOptions.map(
                (type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                ),
              )}
            </select>

            <select
              value={
                rarityFilter
              }
              onChange={(
                event,
              ) =>
                setRarityFilter(
                  event.target
                    .value,
                )
              }
              className={
                selectClassName
              }
            >
              <option value="全部">
                全部稀有度
              </option>

              {rarityOptions.map(
                (rarity) => (
                  <option
                    key={rarity}
                    value={rarity}
                  >
                    {rarity}
                  </option>
                ),
              )}
            </select>

            <select
              value={
                costFilter
              }
              onChange={(
                event,
              ) =>
                setCostFilter(
                  event.target
                    .value,
                )
              }
              className={
                selectClassName
              }
            >
              <option value="全部">
                全部费用
              </option>

              {costOptions.map(
                (cost) => (
                  <option
                    key={cost}
                    value={String(
                      cost,
                    )}
                  >
                    {cost} 费
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-zinc-900 pt-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-zinc-400">
                找到{" "}
                <span className="font-black text-white">
                  {
                    filteredCards.length
                  }
                </span>{" "}
                张卡牌
              </p>

              {activeFilterCount >
                0 && (
                <span className="rounded-full border border-red-900 bg-red-950/40 px-3 py-1 text-xs font-bold text-red-400">
                  {
                    activeFilterCount
                  }{" "}
                  个筛选
                </span>
              )}

              {(activeFilterCount >
                0 ||
                search) && (
                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  className="text-xs font-bold text-zinc-500 transition hover:text-red-400"
                >
                  清除全部
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={sortMode}
                onChange={(
                  event,
                ) =>
                  setSortMode(
                    event.target
                      .value as SortMode,
                  )
                }
                className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-xs text-zinc-300 outline-none focus:border-red-600"
              >
                <option value="number">
                  卡号排序
                </option>

                <option value="name">
                  卡名排序
                </option>

                <option value="cost-low">
                  费用：低至高
                </option>

                <option value="cost-high">
                  费用：高至低
                </option>

                <option value="bp-high">
                  BP：高至低
                </option>

                <option value="rarity">
                  稀有度排序
                </option>
              </select>

              <div className="flex rounded-lg border border-zinc-800 bg-black p-1">
                {(
                  [
                    "compact",
                    "standard",
                    "large",
                  ] as GridMode[]
                ).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() =>
                      setGridMode(
                        mode,
                      )
                    }
                    className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                      gridMode ===
                      mode
                        ? "bg-red-700 text-white"
                        : "text-zinc-500 hover:text-white"
                    }`}
                  >
                    {
                      gridModeLabels[
                        mode
                      ]
                    }
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          className={`mt-6 grid ${gridClassName}`}
        >
          {filteredCards.map(
            (card) => {
              const displayName =
                card.nameZh ||
                card.name;

              const colorStyles =
                getColorStyles(
                  card.color,
                );

              const translated =
                hasChineseTranslation(
                  card,
                );

              const isAlternate =
                Boolean(
                  card.variant,
                ) &&
                card.variant !==
                  "普通版";

              const sizes =
                gridMode ===
                "compact"
                  ? "(max-width: 640px) 50vw, 16vw"
                  : gridMode ===
                      "large"
                    ? "(max-width: 640px) 100vw, 30vw"
                    : "(max-width: 640px) 50vw, 20vw";

              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() =>
                    openCard(
                      card,
                    )
                  }
                  className={`group relative overflow-hidden rounded-2xl border bg-zinc-950 text-left transition duration-300 hover:-translate-y-1 ${colorStyles.border} ${colorStyles.glow}`}
                >
                  <div className="relative aspect-[5/7] overflow-hidden bg-black">
                    <CardArtwork
                      src={
                        card.image
                      }
                      alt={
                        displayName
                      }
                      sizes={
                        sizes
                      }
                      className="object-contain transition duration-500 group-hover:scale-[1.035]"
                    />

                    <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2">
                      {card.rarity &&
                        card.rarity !==
                          "-" && (
                          <span className="rounded-md border border-white/10 bg-black/85 px-2 py-1 text-[10px] font-black text-white backdrop-blur">
                            {
                              card.rarity
                            }
                          </span>
                        )}

                      {isAlternate && (
                        <span className="ml-auto rounded-md border border-amber-700/60 bg-amber-950/90 px-2 py-1 text-[10px] font-black text-amber-300 backdrop-blur">
                          异图
                        </span>
                      )}
                    </div>

                    {translated && (
                      <div className="absolute bottom-2 left-2 rounded-md border border-emerald-800/70 bg-emerald-950/90 px-2 py-1 text-[9px] font-bold text-emerald-300 backdrop-blur">
                        中文
                      </div>
                    )}
                  </div>

                  <div
                    className={
                      gridMode ===
                      "compact"
                        ? "p-2.5"
                        : "p-4"
                    }
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${colorStyles.dot}`}
                      />

                      <p className="truncate text-[10px] font-bold text-zinc-500">
                        {
                          card.number
                        }
                      </p>
                    </div>

                    <h2
                      className={`mt-2 min-h-[2.5rem] font-black leading-5 text-white ${
                        gridMode ===
                        "compact"
                          ? "text-xs"
                          : "text-sm"
                      }`}
                    >
                      {
                        displayName
                      }
                    </h2>

                    {gridMode !==
                      "compact" &&
                      card.nameZh && (
                        <p className="mt-1 truncate text-[11px] text-zinc-600">
                          {
                            card.name
                          }
                        </p>
                      )}

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full border px-2 py-1 text-[9px] font-bold ${colorStyles.badge}`}
                      >
                        {
                          card.color
                        }
                      </span>

                      {gridMode !==
                        "compact" && (
                        <span className="rounded-full border border-zinc-800 bg-black px-2 py-1 text-[9px] text-zinc-400">
                          {
                            card.type
                          }
                        </span>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                      <div className="rounded-lg bg-black px-1 py-2">
                        <p className="text-[9px] text-zinc-600">
                          费用
                        </p>

                        <p className="mt-0.5 text-xs font-black text-white">
                          {
                            card.cost
                          }
                        </p>
                      </div>

                      <div className="rounded-lg bg-black px-1 py-2">
                        <p className="text-[9px] text-zinc-600">
                          AP
                        </p>

                        <p className="mt-0.5 text-xs font-black text-white">
                          {
                            card.ap
                          }
                        </p>
                      </div>

                      <div className="rounded-lg bg-black px-1 py-2">
                        <p className="text-[9px] text-zinc-600">
                          BP
                        </p>

                        <p className="mt-0.5 text-xs font-black text-white">
                          {card.bp ||
                            "-"}
                        </p>
                      </div>
                    </div>

                    {gridMode !==
                      "compact" && (
                      <div className="mt-3 flex items-center justify-between border-t border-zinc-900 pt-3">
                        <span className="text-[10px] text-zinc-600">
                          点击查看详情
                        </span>

                        <span className="text-sm font-black text-red-500 transition group-hover:translate-x-1">
                          →
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            },
          )}
        </div>

        {filteredCards.length ===
          0 && (
          <div className="mt-8 rounded-3xl border border-dashed border-zinc-800 bg-zinc-950 px-6 py-20 text-center">
            <p className="text-4xl">
              ⌕
            </p>

            <h2 className="mt-4 text-xl font-black text-white">
              找不到符合条件的卡牌
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              尝试修改关键词或清除筛选条件。
            </p>

            <button
              type="button"
              onClick={
                clearFilters
              }
              className="mt-6 rounded-xl bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-600"
            >
              清除全部筛选
            </button>
          </div>
        )}
      </section>

      {selectedCard && (
        <div
          role="presentation"
          onMouseDown={() =>
            setSelectedCard(
              null,
            )
          }
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 backdrop-blur-md sm:p-6"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={
              selectedCard.nameZh ||
              selectedCard.name
            }
            onMouseDown={(
              event,
            ) =>
              event.stopPropagation()
            }
            className="relative max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-red-950 bg-zinc-950 shadow-[0_30px_120px_rgba(0,0,0,0.9)]"
          >
            <button
              type="button"
              onClick={() =>
                setSelectedCard(
                  null,
                )
              }
              aria-label="关闭卡牌详情"
              className="absolute right-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-black/90 text-2xl text-white transition hover:border-red-600 hover:bg-red-700"
            >
              ×
            </button>

            <div className="grid gap-0 lg:grid-cols-[minmax(320px,440px)_1fr]">
              <div className="bg-black/60 p-5 sm:p-8">
                <div className="lg:sticky lg:top-6">
                  <div className="relative mx-auto aspect-[5/7] w-full max-w-[420px] overflow-hidden rounded-2xl">
                    <CardArtwork
                      src={
                        selectedCard.image
                      }
                      alt={
                        selectedCard.nameZh ||
                        selectedCard.name
                      }
                      priority
                      sizes="(max-width: 1024px) 90vw, 420px"
                      className="object-contain"
                    />
                  </div>

                  {selectedCard.officialUrl && (
                    <a
                      href={
                        selectedCard.officialUrl
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mx-auto mt-4 block max-w-[420px] rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-center text-xs font-bold text-zinc-400 transition hover:border-red-700 hover:text-white"
                    >
                      查看官方卡牌资料
                      ↗
                    </a>
                  )}
                </div>
              </div>

              <div className="p-5 sm:p-8 lg:p-10">
                <p className="pr-14 text-sm font-black tracking-[0.18em] text-red-500">
                  {
                    selectedCard.number
                  }
                </p>

                <h2 className="mt-3 pr-14 text-3xl font-black leading-tight text-white sm:text-4xl">
                  {selectedCard.nameZh ||
                    selectedCard.name}
                </h2>

                {selectedCard.nameZh && (
                  <p className="mt-2 text-sm text-zinc-500">
                    {
                      selectedCard.name
                    }
                  </p>
                )}

                <p className="mt-3 text-sm text-zinc-400">
                  {
                    selectedCard.series
                  }
                </p>

                {hasChineseTranslation(
                  selectedCard,
                ) && (
                  <p className="mt-3 inline-flex rounded-full border border-amber-900 bg-amber-950/40 px-3 py-1 text-[10px] font-bold text-amber-400">
                    AI
                    自动翻译・待人工校对
                  </p>
                )}

                <div className="mt-6 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-3 py-2 text-xs font-bold ${
                      getColorStyles(
                        selectedCard.color,
                      ).badge
                    }`}
                  >
                    {
                      selectedCard.color
                    }
                  </span>

                  <span className="rounded-full border border-zinc-800 bg-black px-3 py-2 text-xs text-zinc-300">
                    {
                      selectedCard.type
                    }
                  </span>

                  <span className="rounded-full border border-zinc-800 bg-black px-3 py-2 text-xs text-zinc-300">
                    {
                      selectedCard.rarity
                    }
                  </span>

                  {selectedCard.variant &&
                    selectedCard.variant !==
                      "普通版" && (
                      <span className="rounded-full border border-amber-800 bg-amber-950/30 px-3 py-2 text-xs font-bold text-amber-300">
                        {
                          selectedCard.variant
                        }
                      </span>
                    )}
                </div>

                <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    {
                      label:
                        "费用",
                      value:
                        selectedCard.cost,
                    },
                    {
                      label:
                        "AP",
                      value:
                        selectedCard.ap,
                    },
                    {
                      label:
                        "BP",
                      value:
                        selectedCard.bp ||
                        "-",
                    },
                    {
                      label:
                        "产生能量",
                      value: (
                        <GeneratedEnergyDots
                          value={
                            selectedCard.generatedEnergy
                          }
                        />
                      ),
                    },
                  ].map(
                    (stat) => (
                      <div
                        key={
                          stat.label
                        }
                        className="rounded-2xl border border-zinc-800 bg-black p-4 text-center"
                      >
                        <p className="text-[10px] font-bold tracking-wider text-zinc-600">
                          {
                            stat.label
                          }
                        </p>

                        <div className="mt-2 flex min-h-7 items-center justify-center text-xl font-black text-white">
                          {
                            stat.value
                          }
                        </div>
                      </div>
                    ),
                  )}
                </div>

                {selectedCard.feature &&
                  selectedCard.feature !==
                    "-" && (
                    <div className="mt-5 flex items-start gap-3 rounded-xl border border-zinc-800 bg-black/50 px-4 py-3">
                      <span className="text-xs font-bold text-zinc-600">
                        特征
                      </span>

                      <span className="text-sm text-zinc-300">
                        {
                          selectedCard.feature
                        }
                      </span>
                    </div>
                  )}

                <div className="mt-7 rounded-2xl border border-red-950 bg-red-950/15 p-5 sm:p-6">
                  <p className="text-xs font-black tracking-[0.2em] text-red-500">
                    {selectedCard.effectZh
                      ? "中文效果"
                      : "卡牌效果"}
                  </p>

                  <p className="mt-4 whitespace-pre-line text-sm leading-8 text-zinc-200 sm:text-base">
                    {selectedCard.effectZh ||
                      selectedCard.effect ||
                      "无效果"}
                  </p>
                </div>

                {(selectedCard.triggerZh ||
                  (selectedCard.trigger &&
                    selectedCard.trigger !==
                      "-")) && (
                  <div className="mt-4 rounded-2xl border border-amber-900/50 bg-amber-950/10 p-5 sm:p-6">
                    <p className="text-xs font-black tracking-[0.2em] text-amber-500">
                      TRIGGER
                    </p>

                    <p className="mt-4 whitespace-pre-line text-sm leading-8 text-zinc-200 sm:text-base">
                      {selectedCard.triggerZh ||
                        selectedCard.trigger}
                    </p>
                  </div>
                )}

                {hasChineseTranslation(
                  selectedCard,
                ) && (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-800 bg-black">
                    <button
                      type="button"
                      onClick={() =>
                        setShowOriginal(
                          (
                            current,
                          ) =>
                            !current,
                        )
                      }
                      className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-bold text-zinc-400 transition hover:text-white"
                    >
                      <span>
                        查看日文原文
                      </span>

                      <span
                        className={`transition ${
                          showOriginal
                            ? "rotate-180"
                            : ""
                        }`}
                      >
                        ↓
                      </span>
                    </button>

                    {showOriginal && (
                      <div className="border-t border-zinc-800 px-5 py-5">
                        <p className="text-[10px] font-bold tracking-[0.2em] text-zinc-600">
                          CARD
                          EFFECT
                        </p>

                        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-400">
                          {selectedCard.effect ||
                            "无"}
                        </p>

                        {selectedCard.trigger &&
                          selectedCard.trigger !==
                            "-" && (
                            <>
                              <p className="mt-6 text-[10px] font-bold tracking-[0.2em] text-zinc-600">
                                TRIGGER
                              </p>

                              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-400">
                                {
                                  selectedCard.trigger
                                }
                              </p>
                            </>
                          )}
                      </div>
                    )}
                  </div>
                )}

                <p className="mt-6 text-xs leading-6 text-zinc-600">
                  点击黑色背景、右上角
                  × 或按键盘 Esc
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