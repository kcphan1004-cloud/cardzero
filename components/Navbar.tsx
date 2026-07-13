import Image from "next/image";
import Link from "next/link";

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
    // 换成你的 Tier List 网页网址
    href: "https://behdeck.com/",
    external: true,
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
    href: "https://www.youtube.com/@CardZero_%E5%8D%A1%E9%9B%B6%E7%A4%BE",
    external: true,
  },
];

function NavigationLink({
  item,
  mobile = false,
}: {
  item: NavigationItem;
  mobile?: boolean;
}) {
  const className = mobile
    ? "block border-b border-zinc-900 px-5 py-4 text-sm text-gray-300 transition last:border-0 hover:bg-red-950 hover:text-red-400"
    : "text-sm font-semibold text-gray-300 transition hover:text-red-500";

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {item.name}
        <span className="ml-1 text-xs text-gray-500">↗</span>
      </a>
    );
  }

  return (
    <Link href={item.href} className={className}>
      {item.name}
    </Link>
  );
}

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-red-950 bg-black/95 text-white backdrop-blur">
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

        {/* 电脑导航 */}
        <div className="hidden items-center gap-7 lg:flex">
          {navigation.map((item) => (
            <NavigationLink key={item.name} item={item} />
          ))}
        </div>

        {/* 手机导航 */}
        <details className="relative lg:hidden">
          <summary className="cursor-pointer list-none rounded-lg border border-red-800 px-4 py-2 text-sm font-bold text-red-400">
            菜单
          </summary>

          <div className="absolute right-0 mt-3 w-52 overflow-hidden rounded-xl border border-red-900 bg-zinc-950 shadow-2xl">
            {navigation.map((item) => (
              <NavigationLink
                key={item.name}
                item={item}
                mobile
              />
            ))}
          </div>
        </details>
      </nav>
    </header>
  );
}