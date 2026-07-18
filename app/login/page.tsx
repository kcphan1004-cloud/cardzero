"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import {
  getSupabaseBrowserClient,
  isSupabaseBrowserConfigured,
} from "../../lib/supabase/client";

type Mode = "login" | "register" | "forgot";

type Notice = { type: "success" | "error"; text: string } | null;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const configured = isSupabaseBrowserConfigured();

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setChecking(false);
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session?.user) router.replace("/deck-builder");
      else setChecking(false);
    });

    return () => {
      active = false;
    };
  }, [router]);

  function selectMode(nextMode: Mode) {
    setMode(nextMode);
    setNotice(null);
    setPassword("");
    setConfirmPassword("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setNotice({ type: "error", text: "请输入邮箱。" });
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setNotice({ type: "error", text: "登入系统尚未完成设定，请稍后再试。" });
      return;
    }

    if (mode !== "forgot" && !password) {
      setNotice({ type: "error", text: "请输入密码。" });
      return;
    }

    if (mode === "register") {
      if (password.length < 6) {
        setNotice({ type: "error", text: "密码至少需要 6 个字符。" });
        return;
      }
      if (password !== confirmPassword) {
        setNotice({ type: "error", text: "两次输入的密码不一致。" });
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) throw error;
        router.push("/deck-builder");
        router.refresh();
        return;
      }

      if (mode === "register") {
        const redirectTo = `${window.location.origin}/auth/callback`;
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) throw error;

        if (data.session) {
          router.push("/deck-builder");
          router.refresh();
        } else {
          setNotice({
            type: "success",
            text: "注册成功。验证邮件已发送，请打开最新一封邮件完成验证。",
          });
        }
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setNotice({ type: "success", text: "密码重设邮件已发送，请检查收件箱和垃圾邮件。" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "操作失败，请稍后再试。";
      setNotice({ type: "error", text: translateAuthError(message) });
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    const normalizedEmail = email.trim().toLowerCase();
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !normalizedEmail) {
      setNotice({ type: "error", text: "请先输入需要验证的邮箱。" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: normalizedEmail,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);

    if (error) setNotice({ type: "error", text: translateAuthError(error.message) });
    else setNotice({ type: "success", text: "新的验证邮件已发送。旧邮件链接可能已经失效，请使用最新一封。" });
  }

  if (checking) {
    return <main className="grid min-h-screen place-items-center bg-black text-zinc-400">正在检查登入状态……</main>;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-10 text-white sm:px-6 sm:py-16">
      <div className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-red-900/20 blur-3xl" />

      <section className="relative mx-auto grid w-full max-w-5xl overflow-hidden rounded-[30px] border border-red-950 bg-zinc-950 shadow-[0_30px_120px_rgba(0,0,0,.85)] lg:grid-cols-[1.05fr_.95fr]">
        <div className="hidden border-r border-zinc-900 bg-[radial-gradient(circle_at_top_left,rgba(127,29,29,.36),transparent_55%)] p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.32em] text-red-500">CARDZERO PLAYER ACCOUNT</p>
            <h1 className="mt-6 text-5xl font-black leading-tight">你的卡组，<br />随时都在。</h1>
            <p className="mt-5 max-w-md text-base leading-8 text-zinc-400">
              登录后永久保存卡组、跨设备同步，并为之后的一键投稿和公开分享做好准备。
            </p>
          </div>

          <div className="space-y-3 text-sm text-zinc-300">
            <p>✓ 云端永久保存</p>
            <p>✓ 手机与电脑同步</p>
            <p>✓ 未登录仍可使用本机组牌</p>
          </div>
        </div>

        <div className="p-6 sm:p-9 lg:p-11">
          <p className="text-xs font-black tracking-[0.28em] text-red-500">CARDZERO ACCOUNT</p>
          <h2 className="mt-3 text-3xl font-black">
            {mode === "login" ? "玩家登录" : mode === "register" ? "建立玩家账号" : "重设密码"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-500">
            {mode === "forgot" ? "输入注册邮箱，我们会发送密码重设链接。" : "登录后可将卡组永久保存至云端。"}
          </p>

          {!configured && (
            <div className="mt-5 rounded-2xl border border-amber-900/60 bg-amber-950/20 px-4 py-3 text-sm text-amber-300">
              登录系统尚未完成环境设定，网站其他功能仍可正常使用。
            </div>
          )}

          {mode !== "forgot" && (
            <div className="mt-7 grid grid-cols-2 rounded-xl border border-zinc-800 bg-black p-1">
              <button type="button" onClick={() => selectMode("login")} className={`rounded-lg px-4 py-3 text-sm font-black transition ${mode === "login" ? "bg-red-700 text-white" : "text-zinc-500 hover:text-white"}`}>登录</button>
              <button type="button" onClick={() => selectMode("register")} className={`rounded-lg px-4 py-3 text-sm font-black transition ${mode === "register" ? "bg-red-700 text-white" : "text-zinc-500 hover:text-white"}`}>注册</button>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="邮箱">
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="player@example.com" className={inputClass} />
            </Field>

            {mode !== "forgot" && (
              <Field label="密码">
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="至少 6 个字符" className={inputClass} />
              </Field>
            )}

            {mode === "register" && (
              <Field label="确认密码">
                <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" placeholder="再次输入密码" className={inputClass} />
              </Field>
            )}

            <button type="submit" disabled={loading} className="flex w-full items-center justify-center rounded-xl bg-red-700 px-5 py-3.5 text-sm font-black transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? "处理中……" : mode === "login" ? "登录账号" : mode === "register" ? "建立账号" : "发送重设邮件"}
            </button>
          </form>

          {notice && (
            <div className={`mt-5 rounded-xl border px-4 py-3 text-sm leading-6 ${notice.type === "error" ? "border-red-900 bg-red-950/20 text-red-300" : "border-emerald-900 bg-emerald-950/20 text-emerald-300"}`}>
              {notice.text}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs font-bold">
            {mode === "login" ? (
              <button type="button" onClick={() => selectMode("forgot")} className="text-zinc-500 hover:text-white">忘记密码？</button>
            ) : (
              <button type="button" onClick={() => selectMode("login")} className="text-zinc-500 hover:text-white">返回登录</button>
            )}
            {mode === "register" && (
              <button type="button" onClick={resendVerification} disabled={loading} className="text-red-400 hover:text-red-300 disabled:opacity-50">重新发送验证邮件</button>
            )}
          </div>

          <div className="mt-8 border-t border-zinc-900 pt-6 text-center">
            <Link href="/deck-builder" className="text-sm font-bold text-zinc-500 transition hover:text-white">暂不登录，继续使用组牌工具</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

const inputClass = "w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-red-600";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-bold text-zinc-400">{label}</span>{children}</label>;
}

function translateAuthError(message: string) {
  const value = message.toLowerCase();
  if (value.includes("invalid login credentials")) return "邮箱或密码不正确。";
  if (value.includes("email not confirmed")) return "邮箱尚未验证，请使用最新一封验证邮件。";
  if (value.includes("user already registered")) return "这个邮箱已经注册，请直接登录。";
  if (value.includes("email rate limit exceeded")) return "发送邮件次数过多，请稍后再试。";
  if (value.includes("failed to fetch")) return "无法连接登入服务器，请检查 Supabase URL 与网络设定。";
  return message;
}
