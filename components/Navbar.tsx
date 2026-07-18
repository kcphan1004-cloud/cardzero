"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import AccountMenu from "./AccountMenu";

type NavigationItem = {
  name: string;
  href: string;
  external: boolean;
};

const navigation: NavigationItem[] = [
  {
    name: "首页",
    href: "/",
    external: false,
  },
  {
    name: "卡牌列表",
    href: "/card",
    external: false,
  },
  {
    name: "线上组牌",
    href: "/deck-builder",
    external: false,
  },
  {
    name: "T表",
    href: "/tier-list",
    external: false,
  },
  {
    name: "投稿专区",
    href: "/submit",
    external: false,
  },
  {
    name: "牌组分享",
    href: "/deck",
    external: false,
  },
  {
    name: "视频专区",
    href: "/video",
    external: false,
  },
];

function NavigationLink({
  item,
  mobile = false,
  onNavigate,
}: {
  item: NavigationItem;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const className = mobile
    ? "block w-full border-b border-zinc-900 px-5 py-4 text-left text-sm text-gray-300 transition last:border-0 hover:bg-red-950 hover:text-red-400"
    : "text-sm font-semibold text-gray-300 transition hover:text-red-500";

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={onNavigate}
      >
        {item.name}
        <span className="ml-1 text-xs text-gray-500">
          ↗
        </span>
      </a>
    );
  }

  return (
    <Link
      href={item.href}
      className={className}
      onClick={onNavigate}
    >
      {item.name}
    </Link>
  );
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] =
    useState(false);

  const menuRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(
      event: MouseEvent | TouchEvent,
    ) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node,
        )
      ) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handlePointerDown,
    );
    document.addEventListener(
      "touchstart",
      handlePointerDown,
    );
    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown,
      );
      document.removeEventListener(
        "touchstart",
        handlePointerDown,
      );
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-red-950 bg-black/95 text-white backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
        <Link
          href="/"
          className="flex items-center"
          onClick={() =>
            setMenuOpen(false)
          }
        >
          <Image
            src="/logo/cardzero_logo.jpg"
            alt="卡零社 CardZero"
            width={150}
            height={70}
            priority
            className="h-14 w-auto object-contain"
          />
        </Link>

        {/* 电脑导航 */}
        <div className="hidden items-center gap-7 lg:flex">
          {navigation.map((item) => (
            <NavigationLink
              key={item.name}
              item={item}
            />
          ))}
        </div>

        {/* 手机导航 */}
        <div
          ref={menuRef}
          className="relative lg:hidden"
        >
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() =>
              setMenuOpen(
                (current) => !current,
              )
            }
            className="flex items-center gap-2 rounded-lg border border-red-800 px-4 py-2 text-sm font-bold text-red-400 transition hover:border-red-600 hover:bg-red-950/40"
          >
            <span>
              {menuOpen ? "关闭" : "菜单"}
            </span>

            <span
              aria-hidden="true"
              className={`text-xs transition-transform ${
                menuOpen
                  ? "rotate-180"
                  : ""
              }`}
            >
              ▼
            </span>
          </button>

          {menuOpen && (
            <div
              id="mobile-navigation"
              className="absolute right-0 top-full z-50 mt-3 w-56 overflow-hidden rounded-xl border border-red-900 bg-zinc-950 shadow-2xl shadow-black/70"
            >
              {navigation.map((item) => (
                <NavigationLink
                  key={item.name}
                  item={item}
                  mobile
                  onNavigate={() =>
                    setMenuOpen(false)
                  }
                />
              ))}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
