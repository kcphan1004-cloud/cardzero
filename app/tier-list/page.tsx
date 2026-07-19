"use client";

import Image from "next/image";

const KOFI_WIDGET_HTML = String.raw`<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><base target="_blank" />
<style>html,body{margin:0;padding:0;overflow:hidden;background:transparent;font-family:Arial,sans-serif}body{min-height:54px;display:flex;align-items:center;justify-content:center}</style>
</head><body>
<script type="text/javascript" src="https://storage.ko-fi.com/cdn/widget/Widget_2.js"></script>
<script type="text/javascript">kofiwidget2.init("Support Ba Jiao Yu on Ko-fi","#4297ff","Z6Q4202DKA");kofiwidget2.draw();</script>
</body></html>`;

type Partner = {
  region: string;
  provider: string;
  creditName: string;
  logo: string;
  logoAlt: string;
  logoClassName?: string;
  links: { label: string; href: string }[];
  supportBaJiaoYu?: boolean;
};

const partners: Partner[] = [
  {
    region: "马来西亚",
    provider: "BehDeck",
    creditName: "BehDeck aka BaJiaoYu",
    logo: "/images/tier-list/behdeck-logo.png",
    logoAlt: "BehDeck",
    logoClassName: "object-contain p-4",
    links: [{ label: "查看 BehDeck 完整 T表与参考构筑", href: "https://behdeck.com/" }],
    supportBaJiaoYu: true,
  },
  {
    region: "台湾",
    provider: "Mr.Kado_TCG",
    creditName: "卡牌先生",
    logo: "/images/tier-list/mr-kado-logo.png",
    logoAlt: "Mr.Kado TCG",
    logoClassName: "object-contain p-4",
    links: [
      { label: "查看 Mr.Kado T表", href: "https://www.instagram.com/p/DZ2r3pnRRhf/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==" },
      { label: "查看 Mr.Kado 3v3 T表", href: "https://www.instagram.com/p/DagGSCJTKJN/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==" },
    ],
  },
  {
    region: "中国",
    provider: "UA Ricky",
    creditName: "UA Ricky",
    logo: "/images/tier-list/ua-ricky-logo.png",
    logoAlt: "UA Ricky",
    logoClassName: "object-cover",
    links: [{ label: "查看 UA Ricky T表", href: "https://deck.xingkaji.com/deck/#/pages/liqi_print/liqi_print" }],
  },
  {
    region: "日本",
    provider: "Torecards",
    creditName: "Torecards",
    logo: "/images/tier-list/torecards-logo.png",
    logoAlt: "Torecards",
    logoClassName: "object-contain p-3",
    links: [{ label: "查看 Torecards 日本 T表", href: "https://torecards.com/unionarenatier/" }],
  },
];

function PartnerCard({ partner }: { partner: Partner }) {
  return (
    <article className="flex min-h-full flex-col overflow-hidden rounded-[30px] border border-red-950 bg-[#09090b]">
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <p className="text-[11px] font-black tracking-[0.28em] text-red-500">META</p>
            <h2 className="mt-3 text-2xl font-black leading-tight text-white sm:text-[28px]">
              {partner.region} T表专区
            </h2>
            <p className="mt-2 text-lg font-black text-zinc-300">{partner.provider}</p>
          </div>

          <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-2xl bg-white sm:h-28 sm:w-36">
            <Image
              src={partner.logo}
              alt={partner.logoAlt}
              fill
              sizes="144px"
              className={partner.logoClassName ?? "object-contain"}
            />
          </div>
        </div>

        <p className="mt-6 text-sm leading-7 text-zinc-300">
          特别感谢【{partner.creditName}】提供 Union Arena T表资讯
        </p>

        <div className="mt-6 space-y-3">
          {partner.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-14 w-full items-center justify-center rounded-xl bg-red-600 px-5 text-center text-sm font-black text-white transition hover:bg-red-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/35"
            >
              {link.label}<span className="ml-2" aria-hidden="true">↗</span>
            </a>
          ))}
        </div>

        {partner.supportBaJiaoYu ? (
          <div className="mt-auto pt-8">
            <div className="rounded-2xl border border-blue-500/55 bg-blue-950/20 p-5">
              <p className="text-xs font-black tracking-[0.24em] text-blue-400">SUPPORT BA JIAO YU</p>
              <iframe
                title="Support Ba Jiao Yu on Ko-fi"
                srcDoc={KOFI_WIDGET_HTML}
                sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
                loading="lazy"
                className="mt-4 h-16 w-full border-0"
              />
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function TierListPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-[1580px]">
        <section className="relative overflow-hidden rounded-[34px] border border-red-950 bg-[#09090b] px-6 py-9 sm:px-10 sm:py-11 lg:px-16">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(rgba(127,29,29,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(127,29,29,.2) 1px, transparent 1px)",
              backgroundSize: "42px 42px",
            }}
          />
          <div aria-hidden="true" className="absolute -right-24 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-red-800/25 blur-3xl" />

          <div className="relative">
            <p className="text-xs font-black tracking-[0.3em] text-red-500">CARDZERO META PARTNERS</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              Union Arena T表专区
            </h1>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-zinc-400 sm:text-base">
              查看马来西亚、台湾、中国与日本地区的 Union Arena 环境资料。所有链接均会前往对应资料提供者的原始页面。
            </p>
          </div>
        </section>

        <section className="mt-7 grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-4">
          {partners.map((partner) => (
            <PartnerCard key={partner.region} partner={partner} />
          ))}
        </section>
      </div>
    </main>
  );
}
