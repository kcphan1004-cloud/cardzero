import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative flex min-h-[85vh] items-center overflow-hidden">
      <Image
        src="/banner/home-banner.jpeg"
        alt="卡零社首页 Banner"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />

      <div className="absolute inset-0 bg-black/45" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-24">
        <Image
          src="/logo/cardzero_logo.jpg"
          alt="卡零社 CardZero"
          width={420}
          height={420}
          priority
          className="h-auto w-64 rounded-2xl object-contain md:w-80"
        />

        <p className="mt-6 text-sm font-bold tracking-[0.4em] text-red-500">
          EVERY CARD MATTERS
        </p>

        <h1 className="mt-4 max-w-3xl text-4xl font-black md:text-6xl">
          华语 Union Arena
          <span className="block text-red-500">
            卡牌资料与组牌平台
          </span>
        </h1>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/cards"
            className="rounded-lg bg-red-700 px-8 py-4 font-bold hover:bg-red-600"
          >
            浏览卡牌
          </Link>

          <Link
            href="/deck-builder"
            className="rounded-lg border border-red-600 bg-black/40 px-8 py-4 font-bold text-red-400"
          >
            开始组牌
          </Link>
        </div>
      </div>
    </section>
  );
}