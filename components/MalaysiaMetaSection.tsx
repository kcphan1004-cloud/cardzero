"use client";

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
        min-height: 52px;
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

export default function MalaysiaMetaSection() {
  return (
    <section
      id="malaysia-meta"
      className="scroll-mt-24 border-y border-red-950/15 bg-zinc-950 py-14 text-white"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.35fr_.65fr] lg:px-8">
        <div>
          <p className="text-xs font-black tracking-[0.3em] text-red-400">
            MALAYSIA META
          </p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">
            马来西亚 T表专区
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
            掌握最新 Union Arena 马来西亚比赛环境资料与 T表。
            资料由 BehDeck 提供，特别感谢八脚鱼授权卡零社展示相关内容。
          </p>

          <a
            href="https://behdeck.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex items-center justify-center rounded-xl bg-red-700 px-6 py-3 font-black text-white transition hover:bg-red-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/40"
          >
            查看 BehDeck 完整 T表与参考构筑
            <span className="ml-2" aria-hidden="true">
              ↗
            </span>
          </a>
        </div>

        <aside className="rounded-2xl border border-red-900/40 bg-black/40 p-6">
          <p className="text-sm font-bold text-zinc-400">CREDIT</p>
          <p className="mt-2 text-2xl font-black">BehDeck／八脚鱼</p>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            喜欢这些免费的环境资料吗？支持八脚鱼继续维护 BehDeck。
          </p>

          <iframe
            title="Support Ba Jiao Yu on Ko-fi"
            srcDoc={KOFI_WIDGET_HTML}
            className="mt-5 h-16 w-full border-0"
            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
          />
        </aside>
      </div>
    </section>
  );
}
