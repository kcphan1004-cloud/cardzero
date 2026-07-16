"use client";

const regionLinks = [
  {
    code: "MY",
    flag: "🇲🇾",
    title: "马来西亚 T表",
    subtitle: "Malaysia Meta",
    provider: "BehDeck",
    description: "前往卡零社首页的马来西亚 T表合作专区。",
    href: "/#malaysia-meta",
    external: false,
    accent: "from-red-950/80 via-zinc-950 to-zinc-950",
    landmark: "KL",
  },
  {
    code: "TW",
    flag: "🇹🇼",
    title: "台湾 T表",
    subtitle: "Taiwan Meta",
    provider: "Instagram",
    description: "查看台湾 Union Arena 环境 T表。",
    href: "https://www.instagram.com/p/DZ2r3pnRRhf/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    external: true,
    accent: "from-red-950/80 via-zinc-950 to-zinc-950",
    landmark: "TAIPEI",
  },
  {
    code: "TW 3v3",
    flag: "🇹🇼",
    title: "台湾 3v3 T表",
    subtitle: "Taiwan 3v3 Meta",
    provider: "Instagram",
    description: "查看台湾 Union Arena 3v3 环境 T表。",
    href: "https://www.instagram.com/p/DagGSCJTKJN/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    external: true,
    accent: "from-red-950/80 via-zinc-950 to-zinc-950",
    landmark: "3v3",
  },
];

export default function TierListPage() {
  return (
    <main className="min-h-screen bg-[#f5f2ec] text-zinc-950">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="relative overflow-hidden rounded-[28px] border border-red-950/25 bg-black px-6 py-12 text-white shadow-[0_24px_80px_rgba(60,0,0,0.22)] sm:px-10 lg:px-14 lg:py-16">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage:
                "linear-gradient(rgba(127,29,29,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(127,29,29,.18) 1px, transparent 1px)",
              backgroundSize: "34px 34px",
            }}
          />
          <div
            aria-hidden="true"
            className="absolute -right-16 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-red-700/25 blur-3xl"
          />
          <div className="relative max-w-3xl">
            <p className="mb-3 text-xs font-black tracking-[0.32em] text-red-400 sm:text-sm">
              CARDZERO META LINKS
            </p>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-7xl">
              Union Arena{" "}
              <span className="bg-gradient-to-b from-white via-red-200 to-red-500 bg-clip-text text-transparent">
                环境T表
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">
              选择地区，前往对应的 Union Arena 环境资料与 T表来源。
            </p>
          </div>
        </div>

        <section className="mt-8">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[0.25em] text-red-700">
                SELECT REGION
              </p>
              <h2 className="mt-1 text-2xl font-black sm:text-3xl">
                选择地区
              </h2>
            </div>
            <p className="hidden text-sm text-zinc-500 sm:block">
              点击卡片前往相关页面
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {regionLinks.map((item) => (
              <a
                key={item.code}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                className="group relative min-h-[330px] overflow-hidden rounded-[24px] border border-red-900/45 bg-zinc-950 p-6 text-white shadow-[0_18px_50px_rgba(15,0,0,0.18)] transition duration-300 hover:-translate-y-1 hover:border-red-500 hover:shadow-[0_24px_65px_rgba(127,29,29,0.28)] focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/35 sm:p-7"
                aria-label={`${item.title}，${item.external ? "将在新分页打开" : "前往首页合作专区"}`}
              >
                <div
                  aria-hidden="true"
                  className={`absolute inset-0 bg-gradient-to-br ${item.accent}`}
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(239,68,68,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,.16) 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                  }}
                />
                <div
                  aria-hidden="true"
                  className="absolute -bottom-20 -right-12 text-[150px] font-black leading-none text-red-700/10 transition duration-300 group-hover:text-red-600/15"
                >
                  {item.landmark}
                </div>

                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between">
                    <span className="text-3xl" aria-hidden="true">
                      {item.flag}
                    </span>
                    <span className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/5 text-xl transition group-hover:border-red-400/60 group-hover:bg-red-500/10">
                      ↗
                    </span>
                  </div>

                  <div className="mt-10">
                    <p className="text-5xl font-black italic tracking-tight sm:text-6xl">
                      {item.code}
                    </p>
                    <p className="mt-3 text-xl font-black">{item.title}</p>
                    <p className="mt-1 text-sm font-bold uppercase tracking-[0.18em] text-red-400">
                      {item.subtitle}
                    </p>
                  </div>

                  <div className="mt-auto pt-8">
                    <div className="h-px w-full bg-gradient-to-r from-red-600/70 to-transparent" />
                    <div className="mt-4 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold tracking-[0.18em] text-zinc-500">
                          SOURCE
                        </p>
                        <p className="mt-1 font-bold text-zinc-200">
                          {item.provider}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-zinc-400">
                          {item.description}
                        </p>
                      </div>
                      <span className="shrink-0 text-3xl text-red-400 transition group-hover:translate-x-1">
                        →
                      </span>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        <div className="mt-7 rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm leading-6 text-zinc-600 shadow-sm">
          <strong className="text-zinc-900">链接安排：</strong>
          台湾与台湾 3v3 卡片会直接打开 Instagram；马来西亚卡片会先回到卡零社首页的
          BehDeck 合作专区，再由该专区前往 BehDeck。
        </div>
      </section>
    </main>
  );
}
