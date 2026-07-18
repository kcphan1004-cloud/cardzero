"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "../lib/supabase/client";
import type { SavedDeck, StoredDeck } from "./useDeckStorage";

export const CLOUD_DECK_EDIT_KEY = "cardzero.cloud-deck-edit.v1";

export type CloudDeck = {
  id: string;
  user_id: string;
  name: string;
  series: string;
  entries: StoredDeck["entries"];
  total_cards: number;
  cover_cards?: string[];
  created_at: string;
  updated_at: string;
};

type Result = { ok: boolean; message: string };

export function useCloudDecks() {
  const [user, setUser] = useState<User | null>(null);
  const [cloudDecks, setCloudDecks] = useState<CloudDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setUser(null);
      setCloudDecks([]);
      setError("云端卡组功能尚未完成设定。");
      setLoading(false);
      return;
    }

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const nextUser = userData.user ?? null;
      setUser(nextUser);

      if (!nextUser) {
        setCloudDecks([]);
        return;
      }

      const { data, error: decksError } = await supabase
        .from("user_decks")
        .select("id,user_id,name,series,entries,total_cards,cover_cards,created_at,updated_at")
        .order("updated_at", { ascending: false });

      if (decksError) throw decksError;
      setCloudDecks((data ?? []) as CloudDeck[]);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "读取云端卡组失败。";
      setError(message);
      setCloudDecks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    void refresh();
    if (!supabase) return;

    const { data } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => data.subscription.unsubscribe();
  }, [refresh]);

  const saveDeck = useCallback(
    async (deck: StoredDeck, cloudDeckId?: string | null, coverCards: string[] = []): Promise<Result> => {
      if (!deck.entries.length) {
        return { ok: false, message: "当前卡组是空的，无法保存。" };
      }

      const supabase = getSupabaseBrowserClient();
      if (!supabase) return { ok: false, message: "云端卡组功能尚未完成设定。" };

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) return { ok: false, message: `读取登入状态失败：${userError.message}` };

      const currentUser = userData.user;
      if (!currentUser) return { ok: false, message: "请先登入，才能永久保存到云端。" };

      const total = deck.entries.reduce((sum, item) => sum + item.quantity, 0);
      const payload = {
        user_id: currentUser.id,
        name: deck.name || "我的卡组",
        series: deck.series,
        entries: deck.entries,
        total_cards: total,
        cover_cards: coverCards.slice(0, 2),
        updated_at: new Date().toISOString(),
      };

      const query = cloudDeckId
        ? supabase.from("user_decks").update(payload).eq("id", cloudDeckId).eq("user_id", currentUser.id)
        : supabase.from("user_decks").insert(payload);

      const { error: saveError } = await query;
      if (saveError) return { ok: false, message: `云端保存失败：${saveError.message}` };

      await refresh();
      return {
        ok: true,
        message: cloudDeckId
          ? `已更新「${deck.name || "我的卡组"}」。`
          : `已永久保存「${deck.name || "我的卡组"}」到云端。`,
      };
    },
    [refresh],
  );

  const duplicateCloudDeck = useCallback(async (deck: CloudDeck): Promise<Result> => {
    const copy: StoredDeck = {
      version: 2,
      name: `${deck.name} 副本`,
      series: deck.series,
      entries: deck.entries.map((entry) => ({ ...entry })),
      updatedAt: new Date().toISOString(),
    };
    return await saveDeck(copy, null, deck.cover_cards ?? []);
  }, [saveDeck]);

  const deleteCloudDeck = useCallback(async (id: string): Promise<Result> => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return { ok: false, message: "云端卡组功能尚未完成设定。" };

    const { error: deleteError } = await supabase.from("user_decks").delete().eq("id", id);
    if (deleteError) return { ok: false, message: `删除失败：${deleteError.message}` };

    await refresh();
    return { ok: true, message: "云端卡组已删除。" };
  }, [refresh]);

  const syncLocalDecks = useCallback(async (decks: SavedDeck[]): Promise<Result> => {
    if (!decks.length) return { ok: false, message: "没有本机卡组需要同步。" };

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return { ok: false, message: "云端卡组功能尚未完成设定。" };

    const { data: userData } = await supabase.auth.getUser();
    const currentUser = userData.user;
    if (!currentUser) return { ok: false, message: "请先登入。" };

    const rows = decks.map((deck) => ({
      user_id: currentUser.id,
      name: deck.name || "我的卡组",
      series: deck.series,
      entries: deck.entries,
      total_cards: deck.entries.reduce((sum, item) => sum + item.quantity, 0),
      cover_cards: [],
    }));

    const { error: insertError } = await supabase.from("user_decks").insert(rows);
    if (insertError) return { ok: false, message: `同步失败：${insertError.message}` };

    await refresh();
    return { ok: true, message: `已同步 ${rows.length} 个本机卡组到云端。` };
  }, [refresh]);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
  }, []);

  return {
    user,
    cloudDecks,
    loading,
    error,
    refresh,
    saveDeck,
    duplicateCloudDeck,
    deleteCloudDeck,
    syncLocalDecks,
    signOut,
  };
}
