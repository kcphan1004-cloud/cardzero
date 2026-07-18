"use client";

import Image from "next/image";

const KOFI_WIDGET_HTML = String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <base target="_blank" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: transparent;
        overflow: hidden;
        font-family: Arial, sans-serif;
      }
      body {
        min-height: 54px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    </style>
  </head>
  <body>
    <script type='text/javascript' src='https://storage.ko-fi.com/cdn/widget/Widget_2.js'></script>
    <script type='text/javascript'>
      kofiwidget2.init('Support Ba Jiao Yu on Ko-fi', '#4297ff', 'Z6Q4202DKA');
      kofiwidget2.draw();
    </script>
  </body>
</html>`;

const buttonClass =
  "inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-red-700 bg-red-700 px-5 py-3 text-center text-sm font-black text-white transition hover:border-red-500 hover:bg-red-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/30";

export default function TierListPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6 lg:px-8 lg:py-14">
      <section className="mx-auto w-full max-w-[1500px]">
        <header className="relative overflow-hidden rounded-[28px] border border-red-950 bg-zinc-950 px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(rgba(127,29,29,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(127,29,29,.2) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div aria-hidden="true" className="absolute -right-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-red-800/25 blur-3xl" />

          <div className="relative max-w-3xl">
            <p className="text-xs font-black tracking-[0.32em] text-red-500">
              CARDZERO META PARTNERS
            </p>
            <h1 className="mt-3 whitespace-nowrap text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
              Union Arena T表专区
            </h1>
            <p className="mt-3 whitespace-nowrap text-xs leading-6 text-zinc-400 sm:text-sm">
              查看马来西亚、台湾与中国地区的 Union Arena 环境资料。所有链接均会前往对应资料提供者的原始页面。
            </p>
          </div>
        </header>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {/* 1. Malaysia / BehDeck */}
          <article className="flex flex-col overflow-hidden rounded-[26px] border border-red-900/60 bg-zinc-950 shadow-[0_24px_80px_rgba(0,0,0,.45)]">
            <div className="relative flex flex-col p-6 sm:p-7">
              <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(127,29,29,.28),transparent_50%)]" />

              <div className="relative flex items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-black tracking-[0.28em] text-red-500">MALAYSIA META</p>
                  <h2 className="mt-3 whitespace-nowrap text-xl font-black sm:text-2xl">马来西亚 T表专区</h2>
                  <p className="mt-1 text-base font-black text-zinc-300 sm:text-lg">BehDeck</p>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    特别感谢【BehDeck aka BaJiaoYu】提供 Union Arena T表资讯
                  </p>
                </div>

                <div className="relative h-24 w-44 shrink-0 overflow-hidden rounded-xl bg-white p-2 sm:h-28 sm:w-52">
                  <Image
                    src="/images/tier-list/behdeck-logo.png"
                    alt="BehDeck"
                    fill
                    sizes="208px"
                    className="object-contain p-2"
                    priority
                  />
                </div>
              </div>

              <div className="relative mt-7">
                <a
                  href="https://behdeck.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClass}
                >
                  查看 BehDeck 完整 T表与参考构筑
                  <span className="ml-2" aria-hidden="true">↗</span>
                </a>
              </div>

              <div className="relative mt-7">
                <div className="rounded-2xl border border-[#4297ff]/40 bg-[#07121f] p-5">
                  <p className="text-xs font-black tracking-[0.22em] text-[#70b5ff]">SUPPORT BA JIAO YU</p>
                  <iframe
                    title="Support Ba Jiao Yu on Ko-fi"
                    srcDoc={KOFI_WIDGET_HTML}
                    className="mt-4 h-16 w-full border-0"
                    sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
                  />
                </div>
              </div>
            </div>
          </article>

          {/* 2. Taiwan / Mr.Kado */}
          <article className="flex flex-col overflow-hidden rounded-[26px] border border-red-900/60 bg-zinc-950 shadow-[0_24px_80px_rgba(0,0,0,.45)]">
            <div className="relative flex flex-col p-6 sm:p-7">
              <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(127,29,29,.28),transparent_50%)]" />

              <div className="relative flex items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-black tracking-[0.28em] text-red-500">TAIWAN META</p>
                  <h2 className="mt-3 whitespace-nowrap text-xl font-black sm:text-2xl">台湾 T表专区</h2>
                  <p className="mt-1 text-base font-black text-zinc-300 sm:text-lg">Mr.Kado_TCG</p>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    特别感谢【卡牌先生】提供 Union Arena T表资讯
                  </p>
                </div>

                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-white p-2 sm:h-28 sm:w-28">
                  <Image
                    src="/images/tier-list/mr-kado-logo.png"
                    alt="Mr.Kado_TCG"
                    fill
                    sizes="112px"
                    className="object-contain p-2"
                  />
                </div>
              </div>

              <div className="relative mt-7 space-y-3">
                <a
                  href="https://www.instagram.com/p/DZ2r3pnRRhf/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA=="
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClass}
                >
                  查看 Mr.Kado T表
                  <span className="ml-2" aria-hidden="true">↗</span>
                </a>

                <a
                  href="https://www.instagram.com/p/DagGSCJTKJN/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA=="
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClass}
                >
                  查看 Mr.Kado 3v3 T表
                  <span className="ml-2" aria-hidden="true">↗</span>
                </a>
              </div>

            </div>
          </article>

          {/* 3. China / UA Ricky */}
          <article className="flex flex-col overflow-hidden rounded-[26px] border border-red-900/60 bg-zinc-950 shadow-[0_24px_80px_rgba(0,0,0,.45)] lg:col-span-2 xl:col-span-1">
            <div className="relative flex flex-col p-6 sm:p-7">
              <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(127,29,29,.28),transparent_50%)]" />

              <div className="relative flex items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-black tracking-[0.28em] text-red-500">CHINA META</p>
                  <h2 className="mt-3 whitespace-nowrap text-xl font-black sm:text-2xl">中国 T表专区</h2>
                  <p className="mt-1 text-base font-black text-zinc-300 sm:text-lg">UA Ricky</p>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    特别感谢【UA Ricky】提供 Union Arena T表资讯
                  </p>
                </div>

                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-zinc-800 sm:h-28 sm:w-28">
                  <Image
                    src="/images/tier-list/ua-ricky-logo.png"
                    alt="UA Ricky"
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                </div>
              </div>

              <div className="relative mt-7">
                <a
                  href="https://deck.xingkaji.com/deck/#/pages/liqi_print/liqi_print"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClass}
                >
                  查看 UA Ricky T表
                  <span className="ml-2" aria-hidden="true">↗</span>
                </a>
              </div>

            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
