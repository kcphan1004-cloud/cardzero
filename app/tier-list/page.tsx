import type { Metadata } from "next";
import tierDataJson from "../../data/behdeck-tier-list.json";

type TierItem = {
  id: string;
  title: string;
  href: string;
  image: string;
  alt: string;
};

type TierSection = {
  id: string;
  label: string;
  items: TierItem[];
};

type TierData = {
  source: string;
  sourceUrl: string;
  updatedAt: string;
  syncedAt: string;
  tiers: TierSection[];
};

const tierData = tierDataJson as TierData;

export const metadata: Metadata = {
  title: "Union Arena 环境 T 表｜卡零社",
  description:
    "马来西亚 Union Arena 环境 T 表。资料与图片来源 BehDeck／八脚鱼。",
};

export const dynamic = "force-static";

const tierAccent: Record<string, string> = {
  "Tier 1": "border-red-500 bg-red-950/35 text-red-100",
  "Tier 1.5": "border-orange-500 bg-orange-950/30 text-orange-100",
  "Tier 2": "border-amber-500 bg-amber-950/30 text-amber-100",
  "Tier 2.5": "border-yellow-500 bg-yellow-950/25 text-yellow-100",
  "Tier 3": "border-lime-500 bg-lime-950/25 text-lime-100",
  "Tier 4": "border-sky-500 bg-sky-950/25 text-sky-100",
  "Tier 5": "border-violet-500 bg-violet-950/25 text-violet-100",
  "Not Released in Asia":
    "border-zinc-500 bg-zinc-900/50 text-zinc-100",
};

function formatDate(value: string) {
  return value || "尚未同步";
}

export default function TierListPage() {
  const totalItems = tierData.tiers.reduce(
    (sum, tier) => sum + tier.items.length,
    0,
  );

  return (
    <main id="top" className="min-h-screen bg-[#070707] text-white">
      <div className="mx-auto w-full max-w-[1180px] px-4 py-4 sm:px-5 lg:px-6">
        <header className="rounded-xl border-2 border-zinc-700 bg-[#0d0d0d] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.22em] text-red-400">
                CARDZERO × BEHDECK
              </p>

              <h1 className="mt-1.5 text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
                马来西亚 Union Arena 环境 T 表
              </h1>
            </div>

            <a
              href={tierData.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-md border-2 border-red-500 bg-red-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-red-500"
            >
              前往 BehDeck
              <span aria-hidden="true" className="ml-1">
                ↗
              </span>
            </a>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t-2 border-zinc-800 pt-2 text-[9px] text-zinc-500">
            <span>
              更新时间：
              <b className="text-zinc-300">
                {formatDate(tierData.updatedAt)}
              </b>
            </span>

            <span>
              分区：
              <b className="text-zinc-300">
                {tierData.tiers.length}
              </b>
            </span>

            <span>
              牌组：
              <b className="text-zinc-300">
                {totalItems}
              </b>
            </span>

            <span className="hidden sm:inline">
              点击图案前往 BehDeck 原始页面
            </span>
          </div>
        </header>

        {tierData.tiers.length === 0 ? (
          <section className="mt-3 rounded-xl border-2 border-dashed border-zinc-700 bg-white/[0.03] px-4 py-10 text-center">
            <h2 className="text-base font-black">
              等待第一次同步
            </h2>

            <p className="mt-1 text-[10px] text-zinc-500">
              请运行 scripts/sync-behdeck-tier-list.mjs。
            </p>
          </section>
        ) : (
          <div className="mt-3 space-y-3">
            {tierData.tiers.map((tier) => (
              <section
                id={tier.id}
                key={tier.id}
                className="grid overflow-hidden rounded-xl border-[3px] border-zinc-600 bg-[#0b0b0b] shadow-[0_5px_18px_rgba(0,0,0,0.35)] md:grid-cols-[125px_1fr]"
              >
                <div className="flex items-center justify-between border-b-[3px] border-zinc-700 bg-[#101010] px-3 py-2.5 md:block md:border-b-0 md:border-r-[3px]">
                  <div
                    className={`inline-flex min-w-[86px] items-center justify-center rounded-md border-2 px-2 py-1 text-[10px] font-black ${
                      tierAccent[tier.label] ??
                      "border-zinc-500 bg-zinc-900 text-zinc-100"
                    }`}
                  >
                    {tier.label}
                  </div>

                  <span className="ml-2 text-[9px] font-semibold text-zinc-500 md:mt-1.5 md:block md:ml-0">
                    {tier.items.length} 个牌组
                  </span>
                </div>

                <div className="grid grid-cols-[repeat(3,62px)] justify-center gap-1.5 px-3 py-2.5 sm:grid-cols-[repeat(4,62px)] md:grid-cols-[repeat(6,62px)] lg:grid-cols-[repeat(8,62px)] xl:grid-cols-[repeat(10,62px)] 2xl:grid-cols-[repeat(12,62px)]">
                  {tier.items.map((item) => (
                    <a
                      key={item.id}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={item.title}
                      aria-label={`${item.title}，前往 BehDeck 原始页面`}
                      className="group h-[62px] w-[62px] overflow-hidden rounded-md border-2 border-zinc-700 bg-[#111] transition hover:-translate-y-0.5 hover:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <img
                        src={item.image}
                        alt={item.alt || item.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-contain p-1 transition duration-200 group-hover:scale-[1.04]"
                      />
                    </a>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <footer className="mt-3 rounded-lg border-2 border-zinc-800 bg-[#0d0d0d] px-3 py-2 text-center text-[9px] leading-4 text-zinc-500">
          图片、T 表排名及分析来源：
          <span className="font-semibold text-zinc-300">
            BehDeck／八脚鱼
          </span>
          。卡零社经授权作索引展示，特别感谢八脚鱼。
        </footer>
      </div>
    </main>
  );
}
