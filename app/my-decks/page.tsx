"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  CLOUD_DECK_EDIT_KEY,
  type CloudDeck,
  useCloudDecks,
} from "../../hooks/useCloudDecks";

type DeckEntryLike = CloudDeck["entries"][number] & {
  image?: string;
  name?: string;
  nameZh?: string;
};

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

function normalizeImagePath(value: string) {
  let result = String(value ?? "")
    .trim()
    .replace(/\\/g, "/");

  if (!result) return "";
  if (result.startsWith("http://") || result.startsWith("https://")) {
    return result;
  }
  if (result.startsWith("public/")) result = result.slice("public".length);
  if (!result.startsWith("/")) result = `/${result}`;
  return result;
}

/**
 * 旧云端卡组没有保存 image 字段时，根据：
 * cardId: fullmetal-alchemist-ua37bt_fma-1-004_p1
 * number: UA37BT/FMA-1-004
 * 推导：/cards/fullmetal-alchemist/UA37BT_FMA-1-004_p1.png
 */
function getEntryImage(entry: DeckEntryLike) {
  const savedImage = normalizeImagePath(entry.image ?? "");
  if (savedImage) return savedImage;

  const cardId = String(entry.cardId ?? "").trim();
  const number = String(entry.number ?? "").trim();
  if (!cardId || !number) return "";

  const normalizedNumber = number.replace(/\//g, "_");
  const normalizedNumberLower = normalizedNumber.toLowerCase();
  const cardIdLower = cardId.toLowerCase();
  const marker = `-${normalizedNumberLower}`;
  const markerIndex = cardIdLower.lastIndexOf(marker);

  if (markerIndex <= 0) return "";

  const seriesSlug = cardId.slice(0, markerIndex);
  const variantSuffix = cardId.slice(markerIndex + marker.length);
  const filename = `${normalizedNumber}${variantSuffix}`;

  return `/cards/${seriesSlug}/${filename}.png`;
}

function DeckCardImage({
  entry,
  sizes,
  className = "object-contain",
  priority = false,
}: {
  entry: DeckEntryLike;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  const image = getEntryImage(entry);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [image]);

  if (!image || failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-950 px-2 text-center">
        <span className="text-[10px] leading-4 text-zinc-600">
          {entry.number || "找不到卡图"}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={image}
      alt={entry.nameZh || entry.name || entry.number || "卡组卡牌"}
      fill
      priority={priority}
      sizes={sizes}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

function DeckCover({ deck }: { deck: CloudDeck }) {
  const requestedIds = (deck.cover_cards ?? []).slice(0, 2);
  const selectedEntries = requestedIds
    .map((cardId) => deck.entries.find((entry) => entry.cardId === cardId))
    .filter(Boolean) as DeckEntryLike[];

  const coverEntries = selectedEntries.length
    ? selectedEntries
    : (deck.entries.slice(0, 1) as DeckEntryLike[]);

  return (
    <div className="relative h-44 overflow-hidden border-b border-zinc-900 bg-zinc-950 sm:h-48">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(220,38,38,.28),transparent_58%)]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:28px_28px]" />

      {coverEntries.length === 1 ? (
        <div className="absolute inset-x-0 top-2 flex justify-center">
          <div className="relative aspect-[5/7] h-40 overflow-hidden rounded-xl border border-white/20 bg-black shadow-[0_18px_45px_rgba(0,0,0,.8)] sm:h-44">
            <DeckCardImage entry={coverEntries[0]} sizes="180px" priority />
          </div>
        </div>
      ) : coverEntries.length === 2 ? (
        <div className="absolute inset-x-0 top-2 flex justify-center">
          <div className="relative h-56 w-72 sm:w-80">
            <div className="absolute left-6 top-3 aspect-[5/7] h-36 -rotate-8 overflow-hidden rounded-xl border border-white/20 bg-black shadow-[0_18px_45px_rgba(0,0,0,.75)] sm:h-40">
              <DeckCardImage entry={coverEntries[0]} sizes="150px" priority />
            </div>
            <div className="absolute right-6 top-0 aspect-[5/7] h-36 rotate-8 overflow-hidden rounded-xl border border-white/20 bg-black shadow-[0_18px_45px_rgba(0,0,0,.75)] sm:h-40">
              <DeckCardImage entry={coverEntries[1]} sizes="150px" priority />
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 grid place-items-center text-sm text-zinc-700">
          卡组尚无卡牌
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-black/15" />

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-lg font-black text-white drop-shadow-lg sm:text-xl">
            {deck.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-zinc-300 drop-shadow-lg">
            {deck.series || "未指定作品"}
          </p>
        </div>

        <span className="shrink-0 rounded-full border border-red-700/80 bg-black/75 px-2.5 py-1 text-[11px] font-black text-red-300 backdrop-blur">
          {deck.total_cards}/50
        </span>
      </div>
    </div>
  );
}

export default function MyDecksPage() {
  const router = useRouter();
  const {
    user,
    cloudDecks,
    loading,
    error,
    duplicateCloudDeck,
    deleteCloudDeck,
  } = useCloudDecks();
  const [notice, setNotice] = useState("");

  function editDeck(deck: CloudDeck) {
    window.localStorage.setItem(CLOUD_DECK_EDIT_KEY, JSON.stringify(deck));
    router.push(
      `/deck-builder?series=${encodeURIComponent(deck.series)}&cloudDeck=${encodeURIComponent(deck.id)}`,
    );
  }

  async function duplicateDeck(deck: CloudDeck) {
    const result = await duplicateCloudDeck(deck);
    setNotice(result.message);
  }

  async function removeDeck(deck: CloudDeck) {
    if (!window.confirm(`确定删除「${deck.name}」吗？此操作无法还原。`)) return;
    const result = await deleteCloudDeck(deck.id);
    setNotice(result.message);
  }

  if (loading) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-black text-zinc-500">
        正在读取我的卡组……
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-black px-4 py-16 text-white">
        <section className="mx-auto max-w-xl rounded-3xl border border-red-950 bg-zinc-950 p-8 text-center">
          <h1 className="text-3xl font-black">我的卡组</h1>
          <p className="mt-4 text-sm leading-7 text-zinc-500">
            登录后即可查看、编辑并跨设备同步已保存卡组。
          </p>
          <Link
            href="/login"
            className="mt-7 inline-flex rounded-xl bg-red-700 px-6 py-3 text-sm font-black"
          >
            登录 / 注册
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6 lg:py-14">
      <section className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.28em] text-red-500">
              CARDZERO CLOUD DECKS
            </p>
            <h1 className="mt-3 text-4xl font-black">我的卡组</h1>
            <p className="mt-3 text-sm text-zinc-500">
              选择旧卡组继续修改，保存时会覆盖更新同一副云端卡组。
            </p>
          </div>

          <Link
            href="/deck-builder"
            className="rounded-xl bg-red-700 px-5 py-3 text-center text-sm font-black transition hover:bg-red-600"
          >
            ＋ 建立新卡组
          </Link>
        </div>

        {notice && (
          <div className="mt-6 rounded-xl border border-emerald-900 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-300">
            {notice}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/20 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {cloudDecks.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-zinc-800 bg-zinc-950 px-6 py-20 text-center">
            <h2 className="text-xl font-black">还没有云端卡组</h2>
            <p className="mt-3 text-sm text-zinc-600">
              前往线上组牌完成卡组后，点击「保存卡组」。
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {cloudDecks.map((deck) => (
              <article
                key={deck.id}
                className="group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-[0_16px_45px_rgba(0,0,0,.32)] transition hover:-translate-y-1 hover:border-red-900/80"
              >
                <DeckCover deck={deck} />

                <div className="p-4">
                  <p className="text-[10px] text-zinc-600">
                    最后更新：{formatDate(deck.updated_at)}
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => editDeck(deck)}
                      className="rounded-lg bg-red-700 px-2 py-2.5 text-[11px] font-black transition hover:bg-red-600"
                    >
                      继续修改
                    </button>
                    <button
                      type="button"
                      onClick={() => void duplicateDeck(deck)}
                      className="rounded-lg border border-zinc-800 bg-black px-2 py-2.5 text-[11px] font-bold text-zinc-300 transition hover:border-red-800"
                    >
                      复制
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeDeck(deck)}
                      className="rounded-lg border border-red-950 bg-red-950/20 px-2 py-2.5 text-[11px] font-bold text-red-400 transition hover:bg-red-950/40"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
