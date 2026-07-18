"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CLOUD_DECK_EDIT_KEY, type CloudDeck, useCloudDecks } from "../../hooks/useCloudDecks";

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

export default function MyDecksPage() {
  const router = useRouter();
  const { user, cloudDecks, loading, error, duplicateCloudDeck, deleteCloudDeck } = useCloudDecks();
  const [notice, setNotice] = useState("");

  function editDeck(deck: CloudDeck) {
    window.localStorage.setItem(CLOUD_DECK_EDIT_KEY, JSON.stringify(deck));
    router.push(`/deck-builder?series=${encodeURIComponent(deck.series)}&cloudDeck=${encodeURIComponent(deck.id)}`);
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
    return <main className="grid min-h-[70vh] place-items-center bg-black text-zinc-500">正在读取我的卡组……</main>;
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-black px-4 py-16 text-white">
        <section className="mx-auto max-w-xl rounded-3xl border border-red-950 bg-zinc-950 p-8 text-center">
          <h1 className="text-3xl font-black">我的卡组</h1>
          <p className="mt-4 text-sm leading-7 text-zinc-500">登入后即可查看、编辑并跨设备同步已保存卡组。</p>
          <Link href="/login" className="mt-7 inline-flex rounded-xl bg-red-700 px-6 py-3 text-sm font-black">登入 / 注册</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6 lg:py-14">
      <section className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.28em] text-red-500">CARDZERO CLOUD DECKS</p>
            <h1 className="mt-3 text-4xl font-black">我的卡组</h1>
            <p className="mt-3 text-sm text-zinc-500">选择旧卡组继续修改，保存时会覆盖更新同一副云端卡组。</p>
          </div>
          <Link href="/deck-builder" className="rounded-xl bg-red-700 px-5 py-3 text-center text-sm font-black">＋ 建立新卡组</Link>
        </div>

        {notice && <div className="mt-6 rounded-xl border border-emerald-900 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-300">{notice}</div>}
        {error && <div className="mt-6 rounded-xl border border-red-900 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</div>}

        {cloudDecks.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-zinc-800 bg-zinc-950 px-6 py-20 text-center">
            <h2 className="text-xl font-black">还没有云端卡组</h2>
            <p className="mt-3 text-sm text-zinc-600">前往线上组牌完成卡组后，点击「保存卡组」。</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {cloudDecks.map((deck) => (
              <article key={deck.id} className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-[0_20px_60px_rgba(0,0,0,.35)]">
                <div className="border-b border-zinc-900 bg-[radial-gradient(circle_at_top_right,rgba(127,29,29,.28),transparent_55%)] p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-xl font-black">{deck.name}</p>
                      <p className="mt-2 truncate text-sm text-zinc-500">{deck.series || "未指定作品"}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-red-900 bg-red-950/40 px-3 py-1 text-xs font-black text-red-300">{deck.total_cards}/50</span>
                  </div>
                  <div className="mt-5 grid grid-cols-5 gap-1.5">
                    {deck.entries.slice(0, 5).map((entry) => (
                      <div key={entry.cardId} className="aspect-[5/7] rounded-md border border-zinc-800 bg-black p-1 text-center text-[9px] text-zinc-600">
                        <div className="flex h-full flex-col items-center justify-center">
                          <span>{entry.number}</span>
                          <strong className="mt-1 text-red-400">×{entry.quantity}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5">
                  <p className="text-[11px] text-zinc-600">最后更新：{formatDate(deck.updated_at)}</p>
                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => editDeck(deck)} className="rounded-xl bg-red-700 px-3 py-3 text-xs font-black hover:bg-red-600">继续修改</button>
                    <button type="button" onClick={() => void duplicateDeck(deck)} className="rounded-xl border border-zinc-800 bg-black px-3 py-3 text-xs font-bold text-zinc-300 hover:border-red-800">复制</button>
                    <button type="button" onClick={() => void removeDeck(deck)} className="rounded-xl border border-red-950 bg-red-950/20 px-3 py-3 text-xs font-bold text-red-400 hover:bg-red-950/40">删除</button>
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
