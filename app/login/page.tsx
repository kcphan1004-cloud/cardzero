"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(mode: "login" | "register") {
    setBusy(true);
    setNotice("");
    const supabase = getSupabaseBrowserClient();
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/login` } });

    setBusy(false);
    if (result.error) {
      setNotice(result.error.message);
      return;
    }

    if (mode === "register" && !result.data.session) {
      setNotice("注册成功，请到邮箱完成验证后再登入。");
      return;
    }

    router.push("/deck-builder");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-black px-4 py-16 text-white">
      <section className="mx-auto max-w-md rounded-3xl border border-red-950 bg-zinc-950 p-6 sm:p-8">
        <p className="text-xs font-black tracking-[0.25em] text-red-500">CARDZERO ACCOUNT</p>
        <h1 className="mt-3 text-3xl font-black">玩家登入</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">登入后可把卡组永久保存到云端，并在不同设备同步。</p>

        <div className="mt-7 space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-red-600" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密码（至少 6 个字符）" className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-red-600" />
        </div>

        {notice ? <p className="mt-4 rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-300">{notice}</p> : null}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button disabled={busy || !email || password.length < 6} onClick={() => void submit("login")} className="rounded-xl bg-red-700 px-4 py-3 font-black disabled:opacity-40">登入</button>
          <button disabled={busy || !email || password.length < 6} onClick={() => void submit("register")} className="rounded-xl border border-zinc-700 px-4 py-3 font-black disabled:opacity-40">注册</button>
        </div>
      </section>
    </main>
  );
}
