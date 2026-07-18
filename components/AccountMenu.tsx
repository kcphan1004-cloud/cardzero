"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useAuth } from "./AuthProvider";

export default function AccountMenu() {
  const {
    user,
    loading,
    configured,
    signOut,
  } = useAuth();

  const [open, setOpen] =
    useState(false);

  const wrapperRef =
    useRef<HTMLDivElement>(null);

  const router = useRouter();

  useEffect(() => {
    function closeFromOutside(
      event: MouseEvent | TouchEvent,
    ) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    }

    function closeFromEscape(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      closeFromOutside,
    );

    document.addEventListener(
      "touchstart",
      closeFromOutside,
    );

    window.addEventListener(
      "keydown",
      closeFromEscape,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        closeFromOutside,
      );

      document.removeEventListener(
        "touchstart",
        closeFromOutside,
      );

      window.removeEventListener(
        "keydown",
        closeFromEscape,
      );
    };
  }, []);

  if (loading) {
    return (
      <div
        className="h-10 w-24 animate-pulse rounded-xl bg-zinc-900"
        aria-label="正在读取登录状态"
      />
    );
  }

  if (!configured || !user) {
    return (
      <Link
        href="/login"
        className="inline-flex h-10 items-center justify-center rounded-xl border border-red-900/70 bg-red-950/30 px-4 text-sm font-black text-red-200 transition hover:border-red-600 hover:bg-red-700 hover:text-white"
      >
        登录 / 注册
      </Link>
    );
  }

  const email =
    user.email ?? "CardZero 玩家";

  const rawDisplayName =
    user.user_metadata?.display_name;

  const displayName =
    typeof rawDisplayName === "string" &&
    rawDisplayName.trim()
      ? rawDisplayName.trim()
      : user.email?.split("@")[0] ||
        "玩家";

  const initial =
    displayName
      .charAt(0)
      .toUpperCase();

  async function handleSignOut() {
    await signOut();

    setOpen(false);

    router.push("/");
    router.refresh();
  }

  return (
    <div
      ref={wrapperRef}
      className="relative"
    >
      <button
        type="button"
        onClick={() =>
          setOpen(
            (current) => !current,
          )
        }
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-10 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 pr-3 text-left transition hover:border-red-700"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-red-700 text-xs font-black text-white">
          {initial}
        </span>

        <span className="hidden max-w-36 truncate text-xs font-bold text-zinc-200 xl:block">
          {displayName}
        </span>

        <span
          className={`text-xs text-zinc-500 transition ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          ⌄
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] z-[120] w-64 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-[0_24px_80px_rgba(0,0,0,.75)]"
        >
          <div className="border-b border-zinc-900 px-4 py-4">
            <p className="text-[10px] font-black tracking-[0.2em] text-red-500">
              CARDZERO PLAYER
            </p>

            <p className="mt-2 truncate text-sm font-bold text-white">
              {displayName}
            </p>

            <p className="mt-1 truncate text-xs text-zinc-500">
              {email}
            </p>

            <p className="mt-2 text-xs text-emerald-400">
              ● 云端同步已启用
            </p>
          </div>

          <div className="p-2">
            <Link
              href="/deck-builder"
              onClick={() =>
                setOpen(false)
              }
              className="block rounded-xl px-3 py-3 text-sm font-bold text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
            >
              我的卡组
            </Link>

            <Link
              href="/account"
              onClick={() =>
                setOpen(false)
              }
              className="block rounded-xl px-3 py-3 text-sm font-bold text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
            >
              账号设置
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              className="block w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-red-400 transition hover:bg-red-950/40 hover:text-red-300"
            >
              登出
            </button>
          </div>
        </div>
      )}
    </div>
  );
}