"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "../lib/supabase/client";
import type { SavedDeck, StoredDeck } from "./useDeckStorage";

export type CloudDeck = {
  id: string;
  user_id: string;
  name: string;
  series: string;
  entries: StoredDeck["entries"];
  total_cards: number;
  created_at: string;
  updated_at: string;
};

type Result = { ok: boolean; message: string };

export function useCloudDecks() {
  const [user, setUser] = useState<User | null>(null);
  const [cloudDecks, setCloudDecks] = useState<CloudDeck[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: userData } = await supabase.auth.getUser();
    const nextUser = userData.user ?? null;
    setUser(nextUser);

    if (!nextUser) {
      setCloudDecks([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("user_decks")
      .select("id,user_id,name,series,entries,total_cards,created_at,updated_at")
      .order("updated_at", { ascending: false });

    if (!error) setCloudDecks((data ?? []) as CloudDeck[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    void refresh();

    const { data } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => data.subscription.unsubscribe();
  }, [refresh]);

  const saveDeck = useCallback(async (deck: StoredDeck): Promise<Result> => {
    if (!deck.entries.length) return { ok: false, message: "当前卡组是空的，无法保存。" };

    const supabase = getSupabaseBrowserClient();
    const { data: userData } = await supabase.auth.getUser();
    const currentUser = userData.user;
    if (!currentUser) return { ok: false, message: "请先登入，才能永久保存到云端。" };

    const total = deck.entries.reduce((sum, item) => sum + item.quantity, 0);
    const { error } = await supabase.from("user_decks").insert({
      user_id: currentUser.id,
      name: deck.name || "我的卡组",
      series: deck.series,
      entries: deck.entries,
      total_cards: total,
    });

    if (error) return { ok: false, message: `云端保存失败：${error.message}` };
    await refresh();
    return { ok: true, message: `已永久保存「${deck.name || "我的卡组"}」到云端。` };
  }, [refresh]);

  const deleteCloudDeck = useCallback(async (id: string): Promise<Result> => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("user_decks").delete().eq("id", id);
    if (error) return { ok: false, message: `删除失败：${error.message}` };
    await refresh();
    return { ok: true, message: "云端卡组已删除。" };
  }, [refresh]);

  const syncLocalDecks = useCallback(async (decks: SavedDeck[]): Promise<Result> => {
    if (!decks.length) return { ok: false, message: "没有本机卡组需要同步。" };

    const supabase = getSupabaseBrowserClient();
    const { data: userData } = await supabase.auth.getUser();
    const currentUser = userData.user;
    if (!currentUser) return { ok: false, message: "请先登入。" };

    const rows = decks.map((deck) => ({
      user_id: currentUser.id,
      name: deck.name || "我的卡组",
      series: deck.series,
      entries: deck.entries,
      total_cards: deck.entries.reduce((sum, item) => sum + item.quantity, 0),
    }));

    const { error } = await supabase.from("user_decks").insert(rows);
    if (error) return { ok: false, message: `同步失败：${error.message}` };
    await refresh();
    return { ok: true, message: `已同步 ${rows.length} 个本机卡组到云端。` };
  }, [refresh]);

  const signOut = useCallback(async () => {
    await getSupabaseBrowserClient().auth.signOut();
  }, []);

  return { user, cloudDecks, loading, refresh, saveDeck, deleteCloudDeck, syncLocalDecks, signOut };
}
