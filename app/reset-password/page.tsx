"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "../../lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 6) return setMessage("密码至少需要 6 个字符。");
    if (password !== confirm) return setMessage("两次输入的密码不一致。");

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return setMessage("登入系统尚未完成设定。");

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) return setMessage(`更新失败：${error.message}`);
    setMessage("密码已更新，正在返回登录页……");
    window.setTimeout(() => router.replace("/login"), 900);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-black px-4 text-white">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-red-950 bg-zinc-950 p-8 shadow-2xl">
        <p className="text-xs font-black tracking-[0.24em] text-red-500">CARDZERO ACCOUNT</p>
        <h1 className="mt-3 text-3xl font-black">设置新密码</h1>
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="新密码" className="mt-7 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-red-600" />
        <input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="确认新密码" className="mt-4 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-red-600" />
        <button disabled={loading} className="mt-5 w-full rounded-xl bg-red-700 px-5 py-3.5 text-sm font-black hover:bg-red-600 disabled:opacity-50">{loading ? "更新中……" : "更新密码"}</button>
        {message && <p className="mt-4 rounded-xl border border-zinc-800 px-4 py-3 text-sm text-zinc-300">{message}</p>}
      </form>
    </main>
  );
}
