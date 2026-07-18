"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { getSupabaseBrowserClient } from "../../lib/supabase/client";

type AuthMode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] =
    useState<AuthMode>("login");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [isError, setIsError] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [checkingSession, setCheckingSession] =
    useState(true);

  const supabaseAvailable = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const supabase =
        getSupabaseBrowserClient();

      if (!supabase) {
        if (active) {
          setCheckingSession(false);
        }

        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) {
        return;
      }

      if (session?.user) {
        router.replace("/deck-builder");
        return;
      }

      setCheckingSession(false);
    }

    void checkSession();

    return () => {
      active = false;
    };
  }, [router]);

  function resetMessage() {
    setMessage("");
    setIsError(false);
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setPassword("");
    setConfirmPassword("");
    resetMessage();
  }

  async function handleLogin(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    resetMessage();

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setIsError(true);
      setMessage("请输入邮箱和密码。");
      return;
    }

    const supabase =
      getSupabaseBrowserClient();

    if (!supabase) {
      setIsError(true);
      setMessage(
        "登入系统尚未完成设定，请稍后再试。",
      );
      return;
    }

    setLoading(true);

    try {
      const { error } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      if (error) {
        setIsError(true);
        setMessage(
          translateAuthError(error.message),
        );
        return;
      }

      setMessage("登入成功，正在前往组牌工具。");

      router.push("/deck-builder");
      router.refresh();
    } catch (error) {
      console.error(
        "CardZero login error:",
        error,
      );

      setIsError(true);
      setMessage(
        "登入时发生错误，请稍后再试。",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    resetMessage();

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setIsError(true);
      setMessage("请输入邮箱和密码。");
      return;
    }

    if (password.length < 6) {
      setIsError(true);
      setMessage("密码至少需要 6 个字符。");
      return;
    }

    if (password !== confirmPassword) {
      setIsError(true);
      setMessage("两次输入的密码不一致。");
      return;
    }

    const supabase =
      getSupabaseBrowserClient();

    if (!supabase) {
      setIsError(true);
      setMessage(
        "注册系统尚未完成设定，请稍后再试。",
      );
      return;
    }

    setLoading(true);

    try {
      const emailRedirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/login`
          : undefined;

      const { data, error } =
        await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo,
          },
        });

      if (error) {
        setIsError(true);
        setMessage(
          translateAuthError(error.message),
        );
        return;
      }

      if (data.session) {
        setMessage(
          "注册成功，正在前往组牌工具。",
        );

        router.push("/deck-builder");
        router.refresh();
        return;
      }

      setMessage(
        "注册成功，请前往邮箱完成验证后再登入。",
      );

      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error(
        "CardZero registration error:",
        error,
      );

      setIsError(true);
      setMessage(
        "注册时发生错误，请稍后再试。",
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-8 py-7 text-center">
          <p className="text-sm text-zinc-400">
            正在检查登入状态……
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-12 text-white sm:px-6">
      <section className="mx-auto w-full max-w-md">
        <div className="overflow-hidden rounded-3xl border border-red-950 bg-zinc-950 shadow-[0_30px_100px_rgba(0,0,0,0.7)]">
          <div className="border-b border-zinc-900 px-6 py-7 sm:px-8">
            <p className="text-xs font-black tracking-[0.28em] text-red-500">
              CARDZERO ACCOUNT
            </p>

            <h1 className="mt-3 text-3xl font-black">
              {mode === "login"
                ? "玩家登入"
                : "建立玩家账号"}
            </h1>

            <p className="mt-3 text-sm leading-6 text-zinc-500">
              登入后可把卡组永久保存至云端，并在不同设备继续编辑。
            </p>
          </div>

          <div className="p-6 sm:p-8">
            {!supabaseAvailable && (
              <div className="mb-5 rounded-2xl border border-amber-900/60 bg-amber-950/20 px-4 py-4 text-sm leading-6 text-amber-300">
                登入系统尚未完成设定。网站其他功能仍可正常使用。
              </div>
            )}

            <div className="grid grid-cols-2 rounded-xl border border-zinc-800 bg-black p-1">
              <button
                type="button"
                onClick={() =>
                  changeMode("login")
                }
                className={`rounded-lg px-4 py-3 text-sm font-black transition ${
                  mode === "login"
                    ? "bg-red-700 text-white"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                登入
              </button>

              <button
                type="button"
                onClick={() =>
                  changeMode("register")
                }
                className={`rounded-lg px-4 py-3 text-sm font-black transition ${
                  mode === "register"
                    ? "bg-red-700 text-white"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                注册
              </button>
            </div>

            <form
              className="mt-6 space-y-4"
              onSubmit={
                mode === "login"
                  ? handleLogin
                  : handleRegister
              }
            >
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-xs font-bold text-zinc-400"
                >
                  邮箱
                </label>

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value,
                    )
                  }
                  placeholder="player@example.com"
                  disabled={loading}
                  className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-xs font-bold text-zinc-400"
                >
                  密码
                </label>

                <input
                  id="password"
                  type="password"
                  autoComplete={
                    mode === "login"
                      ? "current-password"
                      : "new-password"
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value,
                    )
                  }
                  placeholder="至少 6 个字符"
                  disabled={loading}
                  className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {mode === "register" && (
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-xs font-bold text-zinc-400"
                  >
                    确认密码
                  </label>

                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(
                        event.target.value,
                      )
                    }
                    placeholder="再次输入密码"
                    disabled={loading}
                    className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={
                  loading ||
                  !supabaseAvailable
                }
                className="flex w-full items-center justify-center rounded-xl bg-red-700 px-5 py-3.5 text-sm font-black text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
              >
                {loading
                  ? "处理中……"
                  : mode === "login"
                    ? "登入账号"
                    : "建立账号"}
              </button>
            </form>

            {message && (
              <div
                className={`mt-5 rounded-xl border px-4 py-3 text-sm leading-6 ${
                  isError
                    ? "border-red-900 bg-red-950/20 text-red-300"
                    : "border-emerald-900 bg-emerald-950/20 text-emerald-300"
                }`}
              >
                {message}
              </div>
            )}

            <div className="mt-7 border-t border-zinc-900 pt-5 text-center">
              <Link
                href="/deck-builder"
                className="text-sm font-bold text-zinc-500 transition hover:text-white"
              >
                暂不登入，继续使用组牌工具
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function translateAuthError(
  message: string,
) {
  const normalized =
    message.toLowerCase();

  if (
    normalized.includes(
      "invalid login credentials",
    )
  ) {
    return "邮箱或密码不正确。";
  }

  if (
    normalized.includes(
      "email not confirmed",
    )
  ) {
    return "邮箱尚未完成验证，请检查验证邮件。";
  }

  if (
    normalized.includes(
      "user already registered",
    )
  ) {
    return "这个邮箱已经注册，请直接登入。";
  }

  if (
    normalized.includes(
      "password should be at least",
    )
  ) {
    return "密码至少需要 6 个字符。";
  }

  if (
    normalized.includes(
      "unable to validate email address",
    )
  ) {
    return "邮箱格式不正确。";
  }

  if (
    normalized.includes(
      "email rate limit exceeded",
    )
  ) {
    return "发送邮件次数过多，请稍后再试。";
  }

  return message;
}