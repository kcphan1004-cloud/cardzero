import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative flex min-h-[85vh] items-center overflow-hidden">
      <Image
        src="/banner/homebanner.jpeg"
        alt="卡零社首页 Banner"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />

      {/* 右侧文字遮罩 */}
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute inset-0 bg-gradient-to-l from-black/90 via-black/40 to-transparent" />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl justify-center px-6 py-24 md:justify-end">
        <div className="max-w-2xl text-center md:ml-auto md:text-right">
          <p className="text-sm font-bold tracking-[0.4em] text-red-500">
            EVERY CARD MATTERS
          </p>

          <h1 className="mt-5 text-4xl font-black leading-tight md:text-6xl">
            卡零社 CardZero

            <span className="block text-red-500">
              华语 Union Arena 平台
            </span>
          </h1>

          <p className="mt-6 text-lg leading-8 text-gray-200">
            浏览卡牌资料、线上组牌、查看 T 表、投稿内容并分享你的牌组。
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-4 md:justify-end">
            <Link
              href="/cards"
              className="rounded-lg bg-red-700 px-8 py-4 font-bold transition hover:bg-red-600"
            >
              浏览卡牌
            </Link>

            <Link
              href="/deck-builder"
              className="rounded-lg border border-red-600 bg-black/40 px-8 py-4 font-bold text-red-400 transition hover:bg-red-700 hover:text-white"
            >
              开始组牌
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}