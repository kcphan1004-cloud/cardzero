"use client";

import Image from "next/image";
import { useMemo } from "react";

import type { Card } from "../data/card-series-generated";
import {
  deckImageOptionsBySeries,
  type DeckImageOption,
} from "../data/deck-image-options";

type Props = {
  series: string;
  cards: Card[];
  selectedDeck: string;
  onSelect: (
    deckName: string,
  ) => void;
  onCustom: () => void;
  customSelected?: boolean;
};

const colorStyle: Record<
  string,
  {
    dot: string;
    border: string;
    label: string;
  }
> = {
  红色: {
    dot: "bg-red-500",
    border:
      "border-red-900/60",
    label: "红色",
  },
  蓝色: {
    dot: "bg-blue-500",
    border:
      "border-blue-900/60",
    label: "蓝色",
  },
  绿色: {
    dot: "bg-emerald-500",
    border:
      "border-emerald-900/60",
    label: "绿色",
  },
  黄色: {
    dot: "bg-yellow-400",
    border:
      "border-yellow-900/60",
    label: "黄色",
  },
  紫色: {
    dot: "bg-purple-500",
    border:
      "border-purple-900/60",
    label: "紫色",
  },
  多色: {
    dot: "bg-gradient-to-r from-red-500 via-blue-500 to-purple-500",
    border:
      "border-zinc-700",
    label: "多色",
  },
  无色: {
    dot: "bg-zinc-400",
    border:
      "border-zinc-700",
    label: "无色",
  },
};

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

export default function DeckImagePicker({
  series,
  cards,
  selectedDeck,
  onSelect,
  onCustom,
  customSelected = false,
}: Props) {
  const groups = useMemo(() => {
    const settings =
      (
        deckImageOptionsBySeries[
          series
        ] ?? []
      )
        .filter(
          (option) =>
            option.enabled !== false,
        )
        .sort(
          (a, b) =>
            a.order - b.order,
        );

    const cardMap = new Map(
      cards.map((card) => [
        String(card.number)
          .trim()
          .toUpperCase(),
        card,
      ]),
    );

    const mapped = settings.map(
      (option) => ({
        option,
        card: cardMap.get(
          option.cardNumber
            .trim()
            .toUpperCase(),
        ),
      }),
    );

    const result = new Map<
      string,
      typeof mapped
    >();

    for (const item of mapped) {
      const color =
        item.option.color ||
        "无色";

      const current =
        result.get(color) ?? [];

      current.push(item);
      result.set(color, current);
    }

    return [...result.entries()];
  }, [cards, series]);

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {groups.map(
        ([color, items]) => {
          const style =
            colorStyle[color] ??
            colorStyle["无色"];

          return (
            <section
              key={color}
              className={`rounded-2xl border bg-black/40 p-4 ${style.border}`}
            >
              <div className="mb-4 flex items-center gap-2">
                <span
                  className={`h-3.5 w-3.5 rounded-full ${style.dot}`}
                />
                <h3 className="text-sm font-black text-white">
                  {style.label}
                </h3>
                <span className="text-xs text-zinc-600">
                  {items.length} 个牌组
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {items.map(
                  ({
                    option,
                    card,
                  }) => {
                    const active =
                      selectedDeck ===
                      option.name;

                    const image =
                      normalizeImagePath(
                        card?.image ?? "",
                      );

                    return (
                      <button
                        key={`${option.name}-${option.cardNumber}`}
                        type="button"
                        onClick={() =>
                          onSelect(
                            option.name,
                          )
                        }
                        className={`group overflow-hidden rounded-2xl border text-left transition ${
                          active
                            ? "border-red-500 bg-red-950/25 ring-2 ring-red-500/30"
                            : "border-white/10 bg-zinc-950 hover:border-red-700"
                        }`}
                      >
                        <div className="relative aspect-[5/7] overflow-hidden bg-black">
                          {image ? (
                            <Image
                              src={image}
                              alt={
                                option.name
                              }
                              fill
                              sizes="(max-width: 640px) 45vw, 180px"
                              className="object-contain transition duration-300 group-hover:scale-[1.025]"
                            />
                          ) : (
                            <div className="grid h-full place-items-center px-3 text-center text-xs text-zinc-600">
                              找不到代表卡
                              <br />
                              {
                                option.cardNumber
                              }
                            </div>
                          )}

                          {active ? (
                            <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-red-600 text-sm font-black text-white">
                              ✓
                            </span>
                          ) : null}
                        </div>

                        <div className="p-3">
                          <p className="truncate text-sm font-black text-white">
                            {option.name}
                          </p>

                          <p className="mt-1 truncate text-[10px] text-zinc-600">
                            {
                              option.cardNumber
                            }
                          </p>

                          {option.type ? (
                            <p className="mt-2 inline-flex rounded-full bg-white/5 px-2 py-1 text-[9px] font-bold text-zinc-400">
                              {option.type}
                            </p>
                          ) : null}
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            </section>
          );
        },
      )}

      <button
        type="button"
        onClick={onCustom}
        className={`flex min-h-20 w-full items-center justify-center rounded-2xl border border-dashed px-5 text-sm font-black transition ${
          customSelected
            ? "border-red-500 bg-red-950/25 text-white"
            : "border-white/15 bg-black text-zinc-500 hover:border-red-700 hover:text-white"
        }`}
      >
        <span className="mr-2 text-2xl">
          ＋
        </span>
        其他／新增牌组
      </button>
    </div>
  );
}
