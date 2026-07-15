import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-red-950/60">
      <div className="relative min-h-[720px] md:min-h-[620px]">
        {/* 手机背景图 */}
        <img
          src="/images/homebanner-mobile.png"
          alt=""
          aria-hidden="true"
          loading="eager"
          className="absolute inset-0 h-full w-full object-cover object-center md:hidden"
        />

        {/* 电脑背景图 */}
        <img
          src="/images/homebanner-desktop.jpg"
          alt=""
          aria-hidden="true"
          loading="eager"
          className="absolute inset-0 hidden h-full w-full object-cover object-center md:block"
        />

        {/* 手机底部渐黑；电脑右侧渐黑 */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/95 md:bg-gradient-to-l md:from-black/90 md:via-black/30 md:to-transparent" />

        <div className="relative z-10 mx-auto flex min-h-[720px] max-w-7xl items-end px-5 pb-9 md:min-h-[620px] md:items-center md:justify-end md:px-8 md:pb-0">
          <div className="w-full md:max-w-xl">
            {/* 手机文字 */}
            <div className="mb-5 text-center md:hidden">
              <p className="text-lg font-black text-white">
                华语 Union Arena 平台
              </p>

              <p className="mt-2 text-xs leading-5 text-zinc-300">
                浏览卡牌资料、线上组牌、查看 T 表与分享牌组。
              </p>
            </div>

            {/* 电脑文字 */}
            <div className="hidden md:block">
              <p className="text-sm font-bold tracking-[0.28em] text-red-400">
                EVERY CARD MATTERS
              </p>

              <h1 className="mt-4 text-5xl font-black leading-tight">
                卡零社 CardZero
              </h1>

              <h2 className="mt-3 text-4xl font-black text-red-500">
                华语 Union Arena 平台
              </h2>

              <p className="mt-7 text-base leading-8 text-zinc-200">
                浏览卡牌资料、线上组牌、查看 T 表、
                投稿内容并分享你的牌组。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 md:mt-8">
              <Link
                href="/card"
                className="flex min-h-14 items-center justify-center rounded-xl bg-red-600 px-6 text-base font-black text-white transition hover:bg-red-500"
              >
                浏览卡牌
              </Link>

              <Link
                href="/deck-builder"
                className="flex min-h-14 items-center justify-center rounded-xl border-2 border-red-500 bg-black/60 px-6 text-base font-black text-red-400 backdrop-blur transition hover:bg-red-500/10"
              >
                开始组牌
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
