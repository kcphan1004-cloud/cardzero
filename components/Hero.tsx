import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative flex min-h-[88vh] items-center overflow-hidden">
      <Image
        src="/banner/homebanner.jpg"
        alt="卡零社首页 Banner"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />

      <div className="absolute inset-0 bg-black/45" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/45 to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-24">
        <Image
          src="/logo/cardzero_logo.jpg"
          alt="卡零社 CardZero"
          width={360}
          height={360}
          priority
          className="h-auto w-52 object-contain md:w-72"
        />

        <p className="mt-7 text-sm font-bold tracking-[0.4em] text-red-500">
          EVERY CARD MATTERS
        </p>

        <h1 className="mt-4 text-4xl font-black md:text-6xl">
          卡零社 CardZero
          <span className="block text-red-500">
            华语 Union Arena 平台
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-300">
          浏览卡牌列表、线上组牌、查看 T 表、投稿内容并分享你的牌组。
        </p>

        <div className="mt-9 flex flex-wrap gap-4">
          <Link
            href="/cards"
            className="rounded-lg bg-red-700 px-8 py-4 font-bold hover:bg-red-600"
          >
            浏览卡牌
          </Link>

          <Link
            href="/deck-builder"
            className="rounded-lg border border-red-600 bg-black/40 px-8 py-4 font-bold text-red-400 hover:bg-red-700 hover:text-white"
          >
            开始组牌
          </Link>
        </div>
      </div>
    </section>
  );
}