"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "../../../lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("正在验证账号……");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    async function completeAuth() {
      const url = new URL(window.location.href);
      const queryError = url.searchParams.get("error_description");
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      const hashError = hash.get("error_description");

      if (queryError || hashError) {
        if (!active) return;
        setFailed(true);
        setMessage(decodeURIComponent(queryError || hashError || "验证链接无效。"));
        return;
      }

      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setFailed(true);
        setMessage("登入系统尚未完成设定。");
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (!active) return;

      if (error || !data.session) {
        setFailed(true);
        setMessage("验证链接无效或已经过期，请回到登录页重新发送验证邮件。");
        return;
      }

      setMessage("验证成功，正在前往组牌工具……");
      window.setTimeout(() => {
        router.replace("/deck-builder");
        router.refresh();
      }, 800);
    }

    void completeAuth();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center bg-black px-4 text-white">
      <section className="w-full max-w-md rounded-3xl border border-red-950 bg-zinc-950 p-8 text-center shadow-2xl">
        <p className="text-xs font-black tracking-[0.24em] text-red-500">CARDZERO ACCOUNT</p>
        <h1 className="mt-4 text-2xl font-black">{failed ? "账号验证未完成" : "账号验证"}</h1>
        <p className="mt-4 text-sm leading-7 text-zinc-400">{message}</p>
        {failed && <Link href="/login" className="mt-6 inline-flex rounded-xl bg-red-700 px-5 py-3 text-sm font-black hover:bg-red-600">返回登录页</Link>}
      </section>
    </main>
  );
}
