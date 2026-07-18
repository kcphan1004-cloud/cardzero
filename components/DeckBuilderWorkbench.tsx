"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { Card } from "../data/card-series-generated";
import {
  CARD_COPY_LIMIT,
  DECK_LIMIT,
  useDeckStorage,
} from "../hooks/useDeckStorage";
import { CLOUD_DECK_EDIT_KEY, useCloudDecks } from "../hooks/useCloudDecks";

type Props = {
  cards: Card[];
  seriesNames: string[];
  selectedSeries: string;
};

type GridMode = "compact" | "standard";

type DeckSortMode = "加入顺序" | "费用" | "卡号" | "类型";
type DeckExportMode = "share" | "plain";

const selectClassName =
  "w-full rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm text-white outline-none transition focus:border-red-600";

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function uniqueOptions(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, "zh-Hans-CN"),
  );
}

function normalizeImagePath(imagePath: string) {
  let value = String(imagePath ?? "")
    .trim()
    .replace(/\\/g, "/");

  if (!value) {
    return "";
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("public/")) {
    value = value.slice("public".length);
  }

  if (!value.startsWith("/")) {
    value = `/${value}`;
  }

  return value;
}

function displayName(card: Card) {
  return card.nameZh || card.name || card.number;
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function CardImage({
  card,
  sizes,
  className = "",
}: {
  card: Card;
  sizes: string;
  className?: string;
}) {
  const src = normalizeImagePath(card.image);

  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-950 px-2 text-center text-[10px] font-bold text-zinc-600">
        卡图载入失败
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={displayName(card)}
      fill
      sizes={sizes}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

async function loadCanvasImage(src: string) {
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`无法载入卡图：${src}`));
    image.src = src;
  });
}

function safeFileName(value: string) {
  return (
    value
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, " ") || "CardZero-卡组"
  );
}

function readCardField(card: Card, keys: string[]) {
  const record = card as unknown as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim() !== "")
      return value;
  }
  return null;
}

function parseCardNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const match = String(value ?? "")
    .replace(/,/g, "")
    .match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasTriggerText(value: unknown) {
  const text = String(value ?? "")
    .trim()
    .toLowerCase();
  return Boolean(text && !["-", "无", "なし", "none", "null"].includes(text));
}

export default function DeckBuilderWorkbench({
  cards,
  seriesNames,
  selectedSeries,
}: Props) {
  const router = useRouter();

  const {
    hydrated,
    deck,
    savedDecks,
    totalCards,
    addCard,
    decreaseCard,
    removeCard,
    getCardQuantity,
    clearDeck,
    prepareSeries,
    setDeckName,
    replaceDeck,
    saveSnapshot,
    loadSnapshot,
    deleteSnapshot,
  } = useDeckStorage();

  const [search, setSearch] = useState("");

  const [colorFilter, setColorFilter] = useState("全部");

  const [typeFilter, setTypeFilter] = useState("全部");

  const [costFilter, setCostFilter] = useState("全部");

  const [gridMode, setGridMode] = useState<GridMode>("standard");

  const [deckSortMode, setDeckSortMode] = useState<DeckSortMode>("加入顺序");
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [lastSavedFingerprint, setLastSavedFingerprint] = useState("");

  const [visibleCount, setVisibleCount] = useState(80);

  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const [mobileDeckOpen, setMobileDeckOpen] = useState(false);

  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  const [savedDecksOpen, setSavedDecksOpen] = useState(false);

  const [notice, setNotice] = useState("");

  const [editingCloudDeckId, setEditingCloudDeckId] = useState<string | null>(
    null,
  );

  const {
    user,
    cloudDecks,
    loading: cloudLoading,
    saveDeck: saveCloudDeck,
    deleteCloudDeck,
    syncLocalDecks,
    signOut,
  } = useCloudDecks();

  useEffect(() => {
    if (!hydrated) return;

    const raw = window.localStorage.getItem(CLOUD_DECK_EDIT_KEY);
    if (!raw) return;

    try {
      const cloudDeck = JSON.parse(raw) as {
        id: string;
        name: string;
        series: string;
        entries: typeof deck.entries;
        updated_at: string;
      };

      const result = replaceDeck({
        version: 2,
        name: cloudDeck.name,
        series: cloudDeck.series,
        entries: cloudDeck.entries,
        updatedAt: cloudDeck.updated_at,
      });

      if (result.ok) {
        setEditingCloudDeckId(cloudDeck.id);
        setNotice(`正在修改「${cloudDeck.name}」`);
      }
    } catch (error) {
      console.error("Cloud deck edit transfer failed:", error);
    } finally {
      window.localStorage.removeItem(CLOUD_DECK_EDIT_KEY);
    }
  }, [deck.entries, hydrated, replaceDeck]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (hydrated && totalCards === 0 && selectedSeries) {
      prepareSeries(selectedSeries);
    }
  }, [hydrated, prepareSeries, selectedSeries, totalCards]);

  useEffect(() => {
    setVisibleCount(80);
  }, [search, colorFilter, typeFilter, costFilter, selectedSeries]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => setNotice(""), 2600);

    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const overlayOpen = Boolean(
      selectedCard || mobileDeckOpen || savedDecksOpen,
    );

    if (!overlayOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedCard(null);
        setMobileDeckOpen(false);
        setSavedDecksOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;

      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedCard, mobileDeckOpen, savedDecksOpen]);

  const cardMap = useMemo(
    () => new Map(cards.map((card) => [card.id, card])),
    [cards],
  );

  const colorOptions = useMemo(
    () => uniqueOptions(cards.map((card) => card.color)),
    [cards],
  );

  const typeOptions = useMemo(
    () => uniqueOptions(cards.map((card) => card.type)),
    [cards],
  );

  const costOptions = useMemo(
    () =>
      [
        ...new Set(
          cards
            .map((card) => Number(card.cost))
            .filter((value) => Number.isFinite(value)),
        ),
      ].sort((a, b) => a - b),
    [cards],
  );

  const filteredCards = useMemo(() => {
    const keyword = normalize(search);

    return cards
      .filter((card) => {
        const searchable = [
          card.number,
          card.name,
          card.nameZh,
          card.effect,
          card.effectZh,
          card.trigger,
          card.triggerZh,
        ]
          .map(normalize)
          .join(" ");

        const searchMatch = !keyword || searchable.includes(keyword);

        const colorMatch = colorFilter === "全部" || card.color === colorFilter;

        const typeMatch = typeFilter === "全部" || card.type === typeFilter;

        const costMatch =
          costFilter === "全部" || String(card.cost) === costFilter;

        return searchMatch && colorMatch && typeMatch && costMatch;
      })
      .sort((a, b) =>
        a.number.localeCompare(b.number, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
  }, [cards, search, colorFilter, typeFilter, costFilter]);

  const visibleCards = filteredCards.slice(0, visibleCount);

  const deckRows = useMemo(
    () =>
      deck.entries.map((entry) => ({
        entry,
        card: cardMap.get(entry.cardId) ?? null,
      })),
    [cardMap, deck.entries],
  );

  const deckFingerprint = useMemo(
    () =>
      JSON.stringify({
        name: deck.name,
        series: deck.series,
        entries: deck.entries,
      }),
    [deck.entries, deck.name, deck.series],
  );

  useEffect(() => {
    if (hydrated && !lastSavedFingerprint) {
      setLastSavedFingerprint(deckFingerprint);
    }
  }, [deckFingerprint, hydrated, lastSavedFingerprint]);

  const hasUnsavedChanges =
    Boolean(lastSavedFingerprint) && deckFingerprint !== lastSavedFingerprint;

  const visibleDeckRows = useMemo(() => {
    return [...deckRows].sort((left, right) => {
      if (deckSortMode === "费用") {
        const leftCost = left.card
          ? parseCardNumber(
              readCardField(left.card, [
                "cost",
                "needEnergy",
                "requiredEnergy",
              ]),
            )
          : Number.POSITIVE_INFINITY;
        const rightCost = right.card
          ? parseCardNumber(
              readCardField(right.card, [
                "cost",
                "needEnergy",
                "requiredEnergy",
              ]),
            )
          : Number.POSITIVE_INFINITY;
        return (
          leftCost - rightCost ||
          left.entry.number.localeCompare(right.entry.number, undefined, {
            numeric: true,
          })
        );
      }

      if (deckSortMode === "卡号") {
        return left.entry.number.localeCompare(right.entry.number, undefined, {
          numeric: true,
        });
      }

      if (deckSortMode === "类型") {
        return (
          String(left.card?.type ?? "").localeCompare(
            String(right.card?.type ?? ""),
            "zh-Hans-CN",
          ) ||
          left.entry.number.localeCompare(right.entry.number, undefined, {
            numeric: true,
          })
        );
      }

      return (
        deck.entries.findIndex((entry) => entry.cardId === left.entry.cardId) -
        deck.entries.findIndex((entry) => entry.cardId === right.entry.cardId)
      );
    });
  }, [deck.entries, deckRows, deckSortMode]);

  const typeCounts = useMemo(() => {
    const result = new Map<string, number>();

    for (const { entry, card } of deckRows) {
      const type = card?.type || "未分类";

      result.set(type, (result.get(type) ?? 0) + entry.quantity);
    }

    return [...result.entries()].sort((a, b) => b[1] - a[1]);
  }, [deckRows]);

  const costCurve = useMemo(() => {
    const counts = new Map<string, number>();

    for (const { entry, card } of deckRows) {
      if (!card) {
        continue;
      }

      const cost = Number(card.cost);

      const label = Number.isFinite(cost)
        ? cost >= 8
          ? "8+"
          : String(cost)
        : "?";

      counts.set(label, (counts.get(label) ?? 0) + entry.quantity);
    }

    const order = ["0", "1", "2", "3", "4", "5", "6", "7", "8+", "?"];

    return order
      .filter((label) => counts.has(label))
      .map((label) => ({
        label,
        count: counts.get(label) ?? 0,
      }));
  }, [deckRows]);

  const deckStatistics = useMemo(() => {
    let weightedCost = 0;
    let cardsWithCost = 0;
    let generatedEnergy = 0;
    let triggerCount = 0;
    let totalBp = 0;

    for (const { entry, card } of deckRows) {
      if (!card) continue;
      const quantity = entry.quantity;
      const cost = parseCardNumber(
        readCardField(card, ["cost", "needEnergy", "requiredEnergy"]),
      );
      weightedCost += cost * quantity;
      cardsWithCost += quantity;

      const energy = parseCardNumber(
        readCardField(card, [
          "generatedEnergy",
          "generated_energy",
          "produceEnergy",
          "productionEnergy",
          "energyGenerated",
        ]),
      );
      generatedEnergy += energy * quantity;

      const triggerValue = readCardField(card, [
        "triggerZh",
        "trigger",
        "triggerText",
      ]);
      if (hasTriggerText(triggerValue)) triggerCount += quantity;

      const bp = parseCardNumber(readCardField(card, ["bp", "BP", "power"]));
      totalBp += bp * quantity;
    }

    return {
      averageCost: cardsWithCost > 0 ? weightedCost / cardsWithCost : 0,
      generatedEnergy,
      triggerCount,
      triggerRatio: totalCards > 0 ? (triggerCount / totalCards) * 100 : 0,
      totalBp,
    };
  }, [deckRows, totalCards]);

  const maxCostCurveCount = Math.max(1, ...costCurve.map((item) => item.count));

  const activeFilterCount = [colorFilter, typeFilter, costFilter].filter(
    (value) => value !== "全部",
  ).length;

  const seriesMismatch =
    totalCards > 0 && Boolean(deck.series) && deck.series !== selectedSeries;

  function showResult(result: { message: string }) {
    setNotice(result.message);
  }

  function handleAdd(card: Card) {
    showResult(addCard(card));
  }

  function handleSeriesChange(nextSeries: string) {
    if (nextSeries === selectedSeries) {
      return;
    }

    if (totalCards > 0 && deck.series && deck.series !== nextSeries) {
      const confirmed = window.confirm(
        `当前卡组属于「${deck.series}」。切换到「${nextSeries}」会清空当前卡组，是否继续？`,
      );

      if (!confirmed) {
        return;
      }

      clearDeck(nextSeries);
    } else {
      prepareSeries(nextSeries);
    }

    router.push(`/deck-builder?series=${encodeURIComponent(nextSeries)}`);
  }

  async function handleSaveDeck() {
    if (user) {
      const result = await saveCloudDeck(deck, editingCloudDeckId);
      showResult(result);
      if (result.ok) setLastSavedFingerprint(deckFingerprint);
      return;
    }

    const result = saveSnapshot();
    showResult(result);
    if (result.ok) setLastSavedFingerprint(deckFingerprint);
    setNotice("已保存到此浏览器。登入后可永久保存并跨设备同步。");
  }

  async function handleSyncLocalDecks() {
    const result = await syncLocalDecks(savedDecks);
    showResult(result);
  }

  function loadCloudDeck(cloudDeck: (typeof cloudDecks)[number]) {
    const result = replaceDeck({
      version: 2,
      name: cloudDeck.name,
      series: cloudDeck.series,
      entries: cloudDeck.entries,
      updatedAt: cloudDeck.updated_at,
    });

    showResult(result);
    if (result.ok) {
      setEditingCloudDeckId(cloudDeck.id);
      window.setTimeout(
        () =>
          setLastSavedFingerprint(
            JSON.stringify({
              name: cloudDeck.name,
              series: cloudDeck.series,
              entries: cloudDeck.entries,
            }),
          ),
        0,
      );
      setSavedDecksOpen(false);
      router.push(
        `/deck-builder?series=${encodeURIComponent(cloudDeck.series)}&cloudDeck=${encodeURIComponent(cloudDeck.id)}`,
      );
    }
  }

  function clearFilters() {
    setSearch("");
    setColorFilter("全部");
    setTypeFilter("全部");
    setCostFilter("全部");
  }

  function createDeckText() {
    const lines = [
      deck.name || "我的卡组",
      `作品：${deck.series || selectedSeries}`,
      `卡组数量：${totalCards}/${DECK_LIMIT}`,
      "",
    ];

    for (const { entry, card } of deckRows) {
      lines.push(
        `${entry.quantity}x ${entry.number} ${
          card ? displayName(card) : ""
        }`.trim(),
      );
    }

    return lines.join("\n");
  }

  async function copyDeckText() {
    try {
      await navigator.clipboard.writeText(createDeckText());

      setNotice("卡组文字已经复制。");
    } catch {
      setNotice("无法自动复制，请检查浏览器权限。");
    }
  }

  function downloadDeckJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      source: "CardZero",
      deck,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");

    const safeName = (deck.name || "cardzero-deck")
      .replace(/[\\/:*?"<>|]/g, "-")
      .trim();

    anchor.href = url;
    anchor.download = `${safeName || "cardzero-deck"}.json`;
    anchor.click();

    URL.revokeObjectURL(url);

    setNotice("JSON 卡组文件已经导出。");
  }

  async function handleImport(file: File) {
    try {
      const text = await file.text();

      const parsed = JSON.parse(text);

      const result = replaceDeck(parsed);

      showResult(result);

      if (result.ok && typeof parsed === "object" && parsed) {
        const source =
          "deck" in parsed
            ? (
                parsed as {
                  deck?: {
                    series?: string;
                  };
                }
              ).deck
            : (parsed as {
                series?: string;
              });

        const importedSeries = source?.series;

        if (importedSeries && seriesNames.includes(importedSeries)) {
          router.push(
            `/deck-builder?series=${encodeURIComponent(importedSeries)}`,
          );
        }
      }
    } catch {
      setNotice("导入失败：JSON 文件格式不正确。");
    }
  }

  async function downloadDeckImage(mode: DeckExportMode) {
    if (deckRows.length === 0) {
      setNotice("卡组为空，无法下载卡组图。");
      return;
    }

    setNotice("正在生成卡组图片……");

    try {
      const columns = 5;
      const cardWidth = 240;
      const cardHeight = 336;
      const gap = 20;
      const padding = 48;
      const headerHeight = mode === "share" ? 260 : 36;
      const footerHeight = mode === "share" ? 72 : 36;
      const rows = Math.ceil(deckRows.length / columns);
      const canvas = document.createElement("canvas");

      canvas.width = padding * 2 + columns * cardWidth + (columns - 1) * gap;
      canvas.height =
        headerHeight +
        rows * cardHeight +
        Math.max(0, rows - 1) * gap +
        footerHeight;

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("浏览器无法建立图片画布。");
      }

      context.fillStyle = "#050505";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#ef4444";
      context.fillRect(0, 0, canvas.width, 8);

      if (mode === "share") {
        context.fillStyle = "#ef4444";
        context.font = "700 24px sans-serif";
        context.fillText("CARDZERO DECK", padding, 52);

        context.fillStyle = "#ffffff";
        context.font = "700 42px sans-serif";
        context.fillText(deck.name || "未命名卡组", padding, 105);

        context.fillStyle = "#a1a1aa";
        context.font = "24px sans-serif";
        context.fillText(
          `${deck.series || selectedSeries} · ${totalCards}/${DECK_LIMIT}`,
          padding,
          145,
        );
        context.font = "21px sans-serif";
        context.fillText(
          `平均费用 ${deckStatistics.averageCost.toFixed(1)}   产生能量 ${deckStatistics.generatedEnergy}   Trigger ${deckStatistics.triggerCount} (${deckStatistics.triggerRatio.toFixed(1)}%)`,
          padding,
          192,
        );
        if (user?.user_metadata?.display_name || user?.email) {
          context.fillText(
            `玩家：${user.user_metadata?.display_name || user.email}`,
            padding,
            226,
          );
        }
      }

      for (let index = 0; index < deckRows.length; index += 1) {
        const { entry, card } = deckRows[index];
        const column = index % columns;
        const row = Math.floor(index / columns);
        const x = padding + column * (cardWidth + gap);
        const y = headerHeight + row * (cardHeight + gap);

        context.fillStyle = "#18181b";
        context.fillRect(x, y, cardWidth, cardHeight);

        if (card) {
          const src = normalizeImagePath(card.image);
          if (src) {
            try {
              const image = await loadCanvasImage(src);
              const scale = Math.min(
                cardWidth / image.naturalWidth,
                cardHeight / image.naturalHeight,
              );
              const width = image.naturalWidth * scale;
              const height = image.naturalHeight * scale;
              context.drawImage(
                image,
                x + (cardWidth - width) / 2,
                y + (cardHeight - height) / 2,
                width,
                height,
              );
            } catch {
              context.fillStyle = "#71717a";
              context.font = "20px sans-serif";
              context.textAlign = "center";
              context.fillText(
                "卡图载入失败",
                x + cardWidth / 2,
                y + cardHeight / 2,
              );
              context.textAlign = "left";
            }
          }
        }

        context.beginPath();
        context.arc(x + 34, y + 34, 26, 0, Math.PI * 2);
        context.fillStyle = "#b91c1c";
        context.fill();
        context.lineWidth = 3;
        context.strokeStyle = "#ffffff";
        context.stroke();
        context.fillStyle = "#ffffff";
        context.font = "700 22px sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(`×${entry.quantity}`, x + 34, y + 35);
        context.textAlign = "left";
        context.textBaseline = "alphabetic";
      }

      if (mode === "share") {
        context.fillStyle = "#71717a";
        context.font = "20px sans-serif";
        context.fillText("cardzero-tcg.com", padding, canvas.height - 28);
      }

      const link = document.createElement("a");
      link.download = `${safeFileName(deck.name || "CardZero-卡组")}-${mode === "share" ? "分享版" : "纯卡表"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setExportMenuOpen(false);
      setNotice(
        mode === "share" ? "分享版卡组图片已下载。" : "纯卡表图片已下载。",
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "生成卡组图片失败。");
    }
  }

  function handleClearDeck() {
    if (totalCards === 0) {
      return;
    }

    const confirmed = window.confirm("确定要清空当前卡组吗？");

    if (!confirmed) {
      return;
    }

    clearDeck(selectedSeries);

    setNotice("当前卡组已清空。");
  }

  function renderDeckPanel(options?: { mobile?: boolean }) {
    const mobile = options?.mobile ?? false;

    return (
      <div
        className={`flex min-h-0 flex-col overflow-hidden rounded-3xl border border-red-950 bg-zinc-950 shadow-2xl shadow-black/40 ${
          mobile
            ? "h-[78vh] max-h-[820px]"
            : "h-[calc(100vh-96px)] max-h-[900px]"
        }`}
      >
        <div className="shrink-0 border-b border-zinc-900 p-5">
          <p className="text-[10px] font-black tracking-[0.25em] text-red-500">
            CURRENT DECK
          </p>

          <input
            value={deck.name}
            onChange={(event) => setDeckName(event.target.value)}
            maxLength={80}
            aria-label="卡组名称"
            className="mt-2 w-full border-0 bg-transparent p-0 text-xl font-black text-white outline-none placeholder:text-zinc-700"
            placeholder="输入卡组名称"
          />

          <p className="mt-1 truncate text-xs text-zinc-600">
            {deck.series || selectedSeries}
          </p>

          <div className="mt-3 flex items-center gap-2 text-[10px] font-bold">
            <span
              className={`h-2 w-2 rounded-full ${hasUnsavedChanges ? "bg-amber-400" : "bg-emerald-400"}`}
            />
            <span
              className={
                hasUnsavedChanges ? "text-amber-300" : "text-emerald-300"
              }
            >
              {hasUnsavedChanges
                ? "有未保存修改（本机草稿已自动保存）"
                : editingCloudDeckId
                  ? "云端版本已同步"
                  : "本机草稿已自动保存"}
            </span>
          </div>

          <div
            className={`mt-4 rounded-2xl border p-4 ${
              totalCards === DECK_LIMIT
                ? "border-emerald-800 bg-emerald-950/20"
                : "border-zinc-800 bg-black"
            }`}
          >
            <p className="text-[10px] text-zinc-600">卡组数量</p>
            <p className="mt-1 text-3xl font-black text-white">
              {totalCards}
              <span className="text-sm text-zinc-600">/{DECK_LIMIT}</span>
            </p>
          </div>

          <div
            className={`mt-3 rounded-xl border px-3 py-2 text-xs ${
              totalCards === DECK_LIMIT
                ? "border-emerald-900/60 bg-emerald-950/20 text-emerald-300"
                : "border-amber-900/50 bg-amber-950/10 text-amber-300"
            }`}
          >
            {totalCards === DECK_LIMIT
              ? "✓ 卡组数量完整"
              : `卡组还差 ${DECK_LIMIT - totalCards} 张`}
          </div>
        </div>

        <div className="shrink-0 border-b border-zinc-900 p-3">
          <div className="rounded-xl border border-zinc-800 bg-black p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-black text-zinc-400">费用曲线</p>
              {deckStatistics.totalBp > 0 ? (
                <p className="text-[9px] font-bold text-zinc-600">
                  总 BP {deckStatistics.totalBp.toLocaleString()}
                </p>
              ) : null}
            </div>
            <div className="mt-3 flex h-20 items-end gap-1.5">
              {costCurve.length === 0 ? (
                <p className="m-auto text-[10px] text-zinc-700">
                  加入卡牌后显示费用分布
                </p>
              ) : (
                costCurve.map((item) => (
                  <div
                    key={item.label}
                    className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
                  >
                    <span className="text-[8px] font-bold text-zinc-500">
                      {item.count}
                    </span>
                    <span
                      className="w-full min-w-2 rounded-t bg-red-700"
                      style={{
                        height: `${Math.max(8, (item.count / maxCostCurveCount) * 48)}px`,
                      }}
                    />
                    <span className="text-[8px] font-bold text-zinc-600">
                      {item.label}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {typeCounts.slice(0, 6).map(([type, count]) => (
              <div
                key={type}
                className="rounded-lg border border-zinc-900 bg-black px-2 py-2 text-center"
                title={type}
              >
                <p className="truncate text-[9px] text-zinc-600">{type}</p>
                <p className="mt-0.5 text-sm font-black text-zinc-200">
                  {count}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="shrink-0 border-b border-zinc-900 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black tracking-[0.16em] text-red-500">
                DECK CONTENT
              </p>
              <p className="mt-1 text-xs font-bold text-zinc-300">
                全部卡牌同时显示
              </p>
            </div>

            <select
              value={deckSortMode}
              onChange={(event) =>
                setDeckSortMode(event.target.value as DeckSortMode)
              }
              className="w-28 shrink-0 rounded-lg border border-zinc-800 bg-black px-2 py-2 text-[10px] font-bold text-zinc-300 outline-none"
              aria-label="卡组排序"
            >
              <option>加入顺序</option>
              <option>费用</option>
              <option>卡号</option>
              <option>类型</option>
            </select>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 [scrollbar-color:#7f1d1d_#09090b] [scrollbar-width:thin]">
          {deckRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-black px-4 py-10 text-center text-xs text-zinc-700">
              点击左侧卡牌的＋加入卡组
            </div>
          ) : (
            <div className="grid grid-cols-5 content-start gap-1.5">
              {visibleDeckRows.map(({ entry, card }) => (
                <div
                  key={entry.cardId}
                  className="relative min-w-0 aspect-[5/7] overflow-hidden rounded-md border border-zinc-800 bg-black"
                  title={card ? displayName(card) : entry.number}
                >
                  {card ? (
                    <CardImage
                      card={card}
                      sizes="86px"
                      className="object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-1 text-center text-[8px] text-zinc-700">
                      找不到卡图
                    </div>
                  )}
                  <span className="absolute left-1 top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-red-700 px-1 text-[10px] font-black text-white shadow-xl">
                    ×{entry.quantity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative shrink-0 border-t border-zinc-900 p-4">
          <div className="mb-3 rounded-xl border border-zinc-800 bg-black px-3 py-3 text-[11px] leading-5 text-zinc-500">
            {user ? (
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate">已登入：{user.email}</span>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="shrink-0 font-bold text-red-400"
                >
                  登出
                </button>
              </div>
            ) : (
              <span>
                目前保存到此浏览器。
                <Link href="/login" className="font-black text-red-400">
                  登入后永久保存
                </Link>
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void handleSaveDeck()}
              className="rounded-xl bg-red-700 px-3 py-3 text-xs font-black text-white transition hover:bg-red-600"
            >
              {editingCloudDeckId ? "更新卡组" : "保存卡组"}
            </button>

            <button
              type="button"
              onClick={() => setSavedDecksOpen(true)}
              className="rounded-xl border border-zinc-800 bg-black px-3 py-3 text-xs font-black text-zinc-300 transition hover:border-red-800 hover:text-white"
            >
              我的卡组
            </button>

            <button
              type="button"
              onClick={() => setExportMenuOpen((current) => !current)}
              disabled={deckRows.length === 0}
              className="rounded-xl border border-zinc-800 bg-black px-3 py-3 text-xs font-black text-zinc-300 transition hover:border-red-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              下载卡组
            </button>

            <button
              type="button"
              onClick={handleClearDeck}
              disabled={totalCards === 0}
              className="rounded-xl border border-red-950 bg-red-950/20 px-3 py-3 text-xs font-bold text-red-400 transition hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              清空卡组
            </button>
          </div>

          {exportMenuOpen ? (
            <div className="absolute bottom-[84px] left-4 right-4 z-30 grid grid-cols-2 gap-2 rounded-2xl border border-red-900 bg-zinc-950 p-3 shadow-2xl">
              <button
                type="button"
                onClick={() => void downloadDeckImage("share")}
                className="rounded-xl bg-red-700 px-3 py-3 text-xs font-black text-white hover:bg-red-600"
              >
                分享版
                <span className="mt-1 block text-[9px] font-normal text-red-100/70">
                  含名称、玩家与统计
                </span>
              </button>
              <button
                type="button"
                onClick={() => void downloadDeckImage("plain")}
                className="rounded-xl border border-zinc-700 bg-black px-3 py-3 text-xs font-black text-white hover:border-red-700"
              >
                纯卡表版
                <span className="mt-1 block text-[9px] font-normal text-zinc-500">
                  只显示完整卡图
                </span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black pb-24 text-white xl:pb-12">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            void handleImport(file);
          }

          event.target.value = "";
        }}
      />

      <section className="border-b border-red-950 bg-[radial-gradient(circle_at_top,_rgba(185,28,28,0.22),_transparent_52%)]">
        <div className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black tracking-[0.3em] text-red-500">
                CARDZERO DECK BUILDER
              </p>

              <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                卡牌资料与线上组牌
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
                选择作品、搜索卡牌，使用卡图旁边的＋与−调整数量。卡组会自动保存在这个浏览器中。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-[340px]">
              <div className="rounded-2xl border border-zinc-800 bg-black/70 p-4">
                <p className="text-[10px] text-zinc-600">当前作品卡图</p>

                <p className="mt-1 text-2xl font-black">{cards.length}</p>
              </div>

              <div className="rounded-2xl border border-red-900/50 bg-red-950/20 p-4">
                <p className="text-[10px] text-red-400">当前卡组</p>

                <p className="mt-1 text-2xl font-black">
                  {totalCards}
                  <span className="text-sm text-zinc-600">/{DECK_LIMIT}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1800px] px-3 py-5 sm:px-6 lg:px-8">
        {seriesMismatch ? (
          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-800/60 bg-amber-950/15 p-4 text-sm text-amber-200 sm:flex-row sm:items-center sm:justify-between">
            <p>
              当前保存的卡组属于
              <strong className="mx-1">{deck.series}</strong>
              ，现在浏览的是
              <strong className="mx-1">{selectedSeries}</strong>
              。不同作品的卡牌不能加入同一卡组。
            </p>

            <button
              type="button"
              onClick={() =>
                router.push(
                  `/deck-builder?series=${encodeURIComponent(deck.series)}`,
                )
              }
              className="shrink-0 rounded-xl bg-amber-700 px-4 py-2 font-bold text-white"
            >
              返回当前卡组作品
            </button>
          </div>
        ) : null}

        <div
          className={`grid items-start gap-5 ${
            filterPanelOpen
              ? "xl:grid-cols-[250px_minmax(0,1fr)_430px]"
              : "xl:grid-cols-[58px_minmax(0,1fr)_430px]"
          }`}
        >
          <aside className="rounded-3xl border border-zinc-800 bg-zinc-950 xl:sticky xl:top-[82px]">
            <button
              type="button"
              onClick={() => setFilterPanelOpen((current) => !current)}
              className={`flex w-full items-center transition hover:bg-red-950/30 ${
                filterPanelOpen
                  ? "justify-between rounded-t-3xl border-b border-zinc-900 px-4 py-4"
                  : "h-14 justify-center rounded-3xl"
              }`}
              aria-expanded={filterPanelOpen}
              aria-label={filterPanelOpen ? "收起卡牌筛选" : "展开卡牌筛选"}
            >
              <span className="flex items-center gap-3">
                <span className="text-xl" aria-hidden="true">
                  ⌕
                </span>
                {filterPanelOpen ? (
                  <span>
                    <span className="block text-left text-[10px] font-black tracking-[0.22em] text-red-500">
                      CARD FILTER
                    </span>
                    <span className="mt-1 block text-left text-sm font-black text-white">
                      卡牌筛选
                    </span>
                  </span>
                ) : null}
              </span>

              {filterPanelOpen ? (
                <span className="text-xs text-zinc-500">收起 ‹</span>
              ) : null}
            </button>

            {filterPanelOpen ? (
              <div className="p-4">
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <label className="sm:col-span-2 xl:col-span-1">
                    <span className="mb-2 block text-xs font-bold text-zinc-500">
                      作品系列
                    </span>

                    <select
                      value={selectedSeries}
                      onChange={(event) =>
                        handleSeriesChange(event.target.value)
                      }
                      className={selectClassName}
                    >
                      {seriesNames.map((series) => (
                        <option key={series} value={series}>
                          {series}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="sm:col-span-2 xl:col-span-1">
                    <span className="mb-2 block text-xs font-bold text-zinc-500">
                      搜索
                    </span>

                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="卡名、编号或效果"
                      className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-red-600"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-xs font-bold text-zinc-500">
                      颜色
                    </span>

                    <select
                      value={colorFilter}
                      onChange={(event) => setColorFilter(event.target.value)}
                      className={selectClassName}
                    >
                      <option value="全部">全部颜色</option>

                      {colorOptions.map((color) => (
                        <option key={color} value={color}>
                          {color}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="mb-2 block text-xs font-bold text-zinc-500">
                      类型
                    </span>

                    <select
                      value={typeFilter}
                      onChange={(event) => setTypeFilter(event.target.value)}
                      className={selectClassName}
                    >
                      <option value="全部">全部类型</option>

                      {typeOptions.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="mb-2 block text-xs font-bold text-zinc-500">
                      费用
                    </span>

                    <select
                      value={costFilter}
                      onChange={(event) => setCostFilter(event.target.value)}
                      className={selectClassName}
                    >
                      <option value="全部">全部费用</option>

                      {costOptions.map((cost) => (
                        <option key={cost} value={String(cost)}>
                          {cost} 费
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-zinc-900 pt-4">
                  <span className="text-xs text-zinc-600">
                    {activeFilterCount}
                    个筛选
                  </span>

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs font-bold text-red-500 transition hover:text-red-400"
                  >
                    清除筛选
                  </button>
                </div>

                <div className="mt-4 rounded-2xl border border-zinc-800 bg-black p-4 text-xs leading-6 text-zinc-500">
                  同一卡号的普通版与异图版合计最多
                  <strong className="mx-1 text-white">{CARD_COPY_LIMIT}</strong>
                  张。
                </div>
              </div>
            ) : (
              <div className="hidden px-2 pb-4 text-center text-[9px] font-black tracking-[0.12em] text-zinc-600 xl:block [writing-mode:vertical-rl]">
                筛选
              </div>
            )}
          </aside>

          <section className="min-w-0">
            <div className="sticky top-[72px] z-20 flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/95 p-4 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-zinc-400">
                找到{" "}
                <strong className="text-white">{filteredCards.length}</strong>{" "}
                张卡牌
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setGridMode("compact")}
                  className={`rounded-lg px-3 py-2 text-xs font-bold ${
                    gridMode === "compact"
                      ? "bg-red-700 text-white"
                      : "border border-zinc-800 bg-black text-zinc-500"
                  }`}
                >
                  紧凑
                </button>

                <button
                  type="button"
                  onClick={() => setGridMode("standard")}
                  className={`rounded-lg px-3 py-2 text-xs font-bold ${
                    gridMode === "standard"
                      ? "bg-red-700 text-white"
                      : "border border-zinc-800 bg-black text-zinc-500"
                  }`}
                >
                  标准
                </button>
              </div>
            </div>

            <div
              className={`mt-5 grid ${
                gridMode === "compact"
                  ? "grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6"
                  : "grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5"
              }`}
            >
              {visibleCards.map((card) => {
                const quantity = getCardQuantity(card.id);

                return (
                  <article
                    key={card.id}
                    className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 transition hover:-translate-y-1 hover:border-red-700"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedCard(card)}
                      className="block w-full text-left"
                    >
                      <div className="relative aspect-[5/7] overflow-hidden bg-black">
                        <CardImage
                          card={card}
                          sizes="(max-width: 640px) 50vw, 20vw"
                          className="object-contain transition duration-300 group-hover:scale-[1.025]"
                        />

                        {quantity > 0 ? (
                          <span className="absolute left-2 top-2 flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-white bg-red-700 px-2 text-sm font-black text-white shadow-xl">
                            ×{quantity}
                          </span>
                        ) : null}
                      </div>

                      <div
                        className={
                          gridMode === "compact" ? "p-2 pb-12" : "p-3 pb-14"
                        }
                      >
                        <p className="truncate text-[9px] font-bold text-red-500">
                          {card.number}
                        </p>

                        <h2
                          className={`mt-1 line-clamp-2 min-h-[2.25rem] font-black leading-5 text-white ${
                            gridMode === "compact" ? "text-[11px]" : "text-sm"
                          }`}
                        >
                          {displayName(card)}
                        </h2>

                        {gridMode === "standard" ? (
                          <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-600">
                            <span>{card.color}</span>

                            <span>{card.cost}费</span>
                          </div>
                        ) : null}
                      </div>
                    </button>

                    <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => decreaseCard(card.id)}
                        disabled={quantity === 0}
                        aria-label={`减少 ${displayName(card)}`}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-600 bg-black/90 text-xl font-black text-white shadow-xl transition hover:border-red-500 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        −
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAdd(card)}
                        aria-label={`加入 ${displayName(card)}`}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-red-400 bg-red-700 text-xl font-black text-white shadow-xl transition hover:scale-105 hover:bg-red-600"
                      >
                        ＋
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {filteredCards.length === 0 ? (
              <div className="mt-5 rounded-3xl border border-dashed border-zinc-800 bg-zinc-950 px-6 py-20 text-center">
                <p className="text-xl font-black">找不到符合条件的卡牌</p>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-xl bg-red-700 px-5 py-3 text-sm font-bold"
                >
                  清除筛选
                </button>
              </div>
            ) : null}

            {visibleCount < filteredCards.length ? (
              <button
                type="button"
                onClick={() => setVisibleCount((current) => current + 80)}
                className="mt-6 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-4 text-sm font-black text-zinc-300 transition hover:border-red-800 hover:text-white"
              >
                载入更多（还有 {filteredCards.length - visibleCount} 张）
              </button>
            ) : null}
          </section>

          <aside className="hidden xl:sticky xl:top-[82px] xl:block">
            {renderDeckPanel()}
          </aside>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setMobileDeckOpen(true)}
        className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-24px)] max-w-xl -translate-x-1/2 items-center justify-between rounded-2xl border border-red-500/60 bg-red-700 px-5 py-4 text-left shadow-[0_15px_50px_rgba(0,0,0,.75)] xl:hidden"
      >
        <div>
          <p className="text-xs font-bold text-red-100">查看当前卡组</p>

          <p className="mt-0.5 text-sm font-black">
            {totalCards}/{DECK_LIMIT}
          </p>
        </div>

        <span className="text-xl">↑</span>
      </button>

      {mobileDeckOpen ? (
        <div
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm xl:hidden"
          onMouseDown={() => setMobileDeckOpen(false)}
        >
          <div
            className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-hidden rounded-t-3xl bg-black p-3"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between px-2 py-2">
              <h2 className="text-lg font-black">当前卡组</h2>

              <button
                type="button"
                onClick={() => setMobileDeckOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 text-xl"
              >
                ×
              </button>
            </div>

            {renderDeckPanel({ mobile: true })}
          </div>
        </div>
      ) : null}

      {selectedCard ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-3 backdrop-blur-md sm:p-6"
          onMouseDown={() => setSelectedCard(null)}
        >
          <div
            className="relative max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-red-950 bg-zinc-950"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedCard(null)}
              className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-black/90 text-2xl"
            >
              ×
            </button>

            <div className="grid lg:grid-cols-[380px_1fr]">
              <div className="bg-black/60 p-5">
                <div className="relative mx-auto aspect-[5/7] w-full max-w-[380px]">
                  <CardImage
                    card={selectedCard}
                    sizes="380px"
                    className="object-contain"
                  />
                </div>
              </div>

              <div className="p-5 sm:p-8">
                <p className="pr-14 text-sm font-black tracking-[0.16em] text-red-500">
                  {selectedCard.number}
                </p>

                <h2 className="mt-3 pr-14 text-3xl font-black">
                  {displayName(selectedCard)}
                </h2>

                {selectedCard.nameZh ? (
                  <p className="mt-2 text-sm text-zinc-600">
                    {selectedCard.name}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
                  {[
                    selectedCard.color,
                    selectedCard.type,
                    selectedCard.rarity,
                    `${selectedCard.cost}费`,
                    `BP ${selectedCard.bp || "-"}`,
                  ].map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-zinc-800 bg-black px-3 py-2 text-xs text-zinc-400"
                    >
                      {item}
                    </span>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-red-950 bg-red-950/15 p-5">
                  <p className="text-xs font-black tracking-[0.2em] text-red-500">
                    卡牌效果
                  </p>

                  <p className="mt-4 whitespace-pre-line text-sm leading-8 text-zinc-200">
                    {selectedCard.effectZh || selectedCard.effect || "无效果"}
                  </p>
                </div>

                {selectedCard.triggerZh ||
                (selectedCard.trigger && selectedCard.trigger !== "-") ? (
                  <div className="mt-4 rounded-2xl border border-amber-900/50 bg-amber-950/10 p-5">
                    <p className="text-xs font-black tracking-[0.2em] text-amber-500">
                      TRIGGER
                    </p>

                    <p className="mt-4 whitespace-pre-line text-sm leading-8 text-zinc-200">
                      {selectedCard.triggerZh || selectedCard.trigger}
                    </p>
                  </div>
                ) : null}

                <div className="mt-6 rounded-2xl border border-red-800/60 bg-black p-5">
                  <p className="text-xs font-black tracking-[0.18em] text-red-500">
                    加入卡组
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    当前数量{" "}
                    <strong className="text-white">
                      {getCardQuantity(selectedCard.id)}
                    </strong>
                  </p>

                  <div className="mt-4 grid grid-cols-[56px_1fr_56px] gap-2">
                    <button
                      type="button"
                      disabled={getCardQuantity(selectedCard.id) === 0}
                      onClick={() => decreaseCard(selectedCard.id)}
                      className="flex h-12 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-xl font-black disabled:opacity-40"
                    >
                      −
                    </button>

                    <div className="flex h-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-lg font-black">
                      {getCardQuantity(selectedCard.id)}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAdd(selectedCard)}
                      className="flex h-12 items-center justify-center rounded-xl bg-red-700 text-xl font-black text-white hover:bg-red-600"
                    >
                      ＋
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {savedDecksOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-3 backdrop-blur-md sm:p-6"
          onMouseDown={() => setSavedDecksOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-red-950 bg-zinc-950 p-5 sm:p-7"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black tracking-[0.2em] text-red-500">
                  SAVED DECKS
                </p>

                <h2 className="mt-2 text-2xl font-black">我的卡组</h2>
              </div>

              <button
                type="button"
                onClick={() => setSavedDecksOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-red-950 bg-black p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-black text-white">云端卡组</p>
                  <p className="mt-1 text-xs text-zinc-600">
                    登入后永久保存，并可在其他设备载入。
                  </p>
                </div>
                {user ? (
                  <button
                    type="button"
                    onClick={() => void handleSyncLocalDecks()}
                    disabled={savedDecks.length === 0}
                    className="rounded-xl border border-red-900 px-4 py-2 text-xs font-black text-red-400 disabled:opacity-40"
                  >
                    同步本机卡组
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="rounded-xl bg-red-700 px-4 py-2 text-center text-xs font-black text-white"
                  >
                    登入 / 注册
                  </Link>
                )}
              </div>

              {user ? (
                cloudLoading ? (
                  <p className="mt-4 text-sm text-zinc-600">读取云端卡组中……</p>
                ) : cloudDecks.length === 0 ? (
                  <p className="mt-4 rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-600">
                    还没有云端卡组。
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {cloudDecks.map((saved) => (
                      <div
                        key={saved.id}
                        className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-black">{saved.name}</p>
                          <p className="mt-1 text-xs text-zinc-600">
                            {saved.series} · {saved.total_cards}/{DECK_LIMIT}
                          </p>
                          <p className="mt-1 text-[10px] text-zinc-700">
                            云端更新：{formatDate(saved.updated_at)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => loadCloudDeck(saved)}
                            className="rounded-xl bg-red-700 px-4 py-2 text-xs font-black"
                          >
                            载入
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `删除「${saved.name}」的云端版本吗？`,
                                )
                              )
                                void deleteCloudDeck(saved.id).then(showResult);
                            }}
                            className="rounded-xl border border-zinc-800 px-4 py-2 text-xs font-bold text-zinc-500"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : null}
            </div>

            <div className="mt-6">
              <p className="font-black text-white">本机卡组</p>
              <p className="mt-1 text-xs text-zinc-600">
                仅保存在这个浏览器，可作为离线备份。
              </p>
            </div>

            {savedDecks.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-zinc-800 bg-black px-6 py-16 text-center text-sm text-zinc-600">
                还没有保存任何卡组。
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {savedDecks.map((saved) => {
                  const count = saved.entries.reduce(
                    (total, entry) => total + entry.quantity,
                    0,
                  );

                  return (
                    <div
                      key={saved.snapshotId}
                      className="rounded-2xl border border-zinc-800 bg-black p-4"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-black">{saved.name}</p>

                          <p className="mt-1 text-xs text-zinc-600">
                            {saved.series} · {count}/{DECK_LIMIT}
                          </p>

                          <p className="mt-1 text-[10px] text-zinc-700">
                            {formatDate(saved.savedAt)}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const result = loadSnapshot(saved.snapshotId);

                              showResult(result);

                              if (result.ok && result.deck) {
                                setSavedDecksOpen(false);

                                router.push(
                                  `/deck-builder?series=${encodeURIComponent(
                                    result.deck.series,
                                  )}`,
                                );
                              }
                            }}
                            className="rounded-xl bg-red-700 px-4 py-2 text-xs font-black"
                          >
                            载入
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const confirmed = window.confirm(
                                `删除「${saved.name}」吗？`,
                              );

                              if (confirmed) {
                                deleteSnapshot(saved.snapshotId);
                              }
                            }}
                            className="rounded-xl border border-zinc-800 px-4 py-2 text-xs font-bold text-zinc-500"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {notice ? (
        <div className="fixed left-1/2 top-24 z-[200] w-[calc(100%-32px)] max-w-md -translate-x-1/2 rounded-2xl border border-red-700/70 bg-zinc-950 px-5 py-4 text-center text-sm font-bold text-white shadow-2xl">
          {notice}
        </div>
      ) : null}
    </main>
  );
}
