import Image from "next/image";
import Link from "next/link";

const navigation = [
  { name: "首页", href: "/" },
  { name: "卡牌列表", href: "/cards" },
  { name: "线上组牌", href: "/deck-builder" },
  { name: "T表", href: "/tier-list" },
  { name: "投稿专区", href: "/submit" },
  { name: "牌组分享", href: "/decks" },
  { name: "视频专区", href: "https://www.youtube.com/@CardZero_%E5%8D%A1%E9%9B%B6%E7%A4%BE" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-red-950 bg-black/95 text-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo/cardzero_logo.jpg"
            alt="卡零社 CardZero"
            width={150}
            height={70}
            priority
            className="h-14 w-auto object-contain"
          />
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {navigation.map((item) => (
            <Link
  key={item.href}
  href={item.href}
  target={item.name === "视频专区" ? "_blank" : undefined}
  rel={item.name === "视频专区" ? "noopener noreferrer" : undefined}
  className="text-sm font-semibold text-gray-300 transition hover:text-red-500"
>
  {item.name}
</Link>
          ))}
        </div>

        <details className="relative lg:hidden">
          <summary className="cursor-pointer list-none rounded-lg border border-red-800 px-4 py-2 text-sm text-red-400">
            菜单
          </summary>

          <div className="absolute right-0 mt-3 w-52 overflow-hidden rounded-xl border border-red-900 bg-zinc-950 shadow-2xl">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block border-b border-zinc-900 px-5 py-4 text-sm text-gray-300 last:border-0 hover:bg-red-950 hover:text-red-400"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </details>
      </nav>
    </header>
  );
}