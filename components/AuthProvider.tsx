"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "../lib/supabase/client";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  signOut: () => Promise<{ ok: boolean; message: string }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseBrowserClient();
  const configured = Boolean(supabase);

  useEffect(() => {
    let active = true;

    if (!supabase) {
      setLoading(false);
      return;
    }

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) console.error("Failed to read auth session:", error.message);
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  async function signOut() {
    if (!supabase) {
      return { ok: false, message: "登入系统尚未完成设定。" };
    }

    const { error } = await supabase.auth.signOut();
    if (error) return { ok: false, message: `登出失败：${error.message}` };

    return { ok: true, message: "已成功登出。" };
  }

  const value = useMemo(
    () => ({ user, session, loading, configured, signOut }),
    [user, session, loading, configured],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
