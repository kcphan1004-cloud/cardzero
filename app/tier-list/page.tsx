import BehDeckKofiButton from "../../components/BehDeckKofiButton";

export const metadata = {
  title: "环境 T表｜卡零社 CardZero",
  description:
    "Union Arena 马来西亚与台湾比赛环境资料专区。",
};

const BEHDECK_URL = "https://behdeck.com/";

const TAIWAN_TIER_LIST_URL =
  "https://www.instagram.com/p/DZ2r3pnRRhf/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==";

const TAIWAN_3V3_URL =
  "https://www.instagram.com/p/DagGSCJTKJN/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==";

function ExternalArrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

function ProviderLogo({
  provider,
}: {
  provider: "behdeck" | "mr-kado";
}) {
  if (provider === "behdeck") {
    return (
      <div
        aria-label="BehDeck"
        className="flex min-w-[126px] items-center justify-center rounded-2xl border border-red-500/35 bg-black/65 px-4 py-3 shadow-[0_0_24px_rgba(239,68,68,.16)] backdrop-blur"
      >
        <div className="text-right">
          <p className="text-lg font-black italic tracking-tight text-white">
            Beh<span className="text-red-500">Deck</span>
          </p>
          <p className="mt-0.5 text-[8px] font-bold tracking-[0.22em] text-zinc-500">
            META DATABASE
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      aria-label="Mr.Kado_TCG"
      className="flex min-w-[142px] items-center justify-center rounded-2xl border border-red-500/35 bg-black/65 px-4 py-3 shadow-[0_0_24px_rgba(239,68,68,.16)] backdrop-blur"
    >
      <div className="text-right">
        <p className="text-base font-black italic tracking-tight text-white">
          Mr.Kado<span className="text-red-500">_TCG</span>
        </p>
        <p className="mt-0.5 text-[8px] font-bold tracking-[0.22em] text-zinc-500">
          TAIWAN META
        </p>
      </div>
    </div>
  );
}

function MalaysiaSkyline() {
  return (
    <svg
      viewBox="0 0 720 250"
      aria-hidden="true"
      className="absolute inset-x-0 bottom-0 h-auto w-full text-red-500/35"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M0 232h720" />
      <path d="M34 232v-52h46v52M44 180v-19h26v19" />
      <path d="M112 232v-86h42v86M124 146v-26h18v26" />
      <path d="M185 232v-48h76v48M205 184v-20h36v20" />
      <path d="M320 232v-142h34v142M337 90V42M330 74h14" />
      <path d="M386 232v-168h43v168M407 64V26M398 47h18" />
      <path d="M461 232v-124h44v124M474 108V76h18v32" />
      <path d="M540 232v-74h64v74M559 158v-21h26v21" />
      <path d="M632 232v-96h45v96M644 136v-30h20v30" />
      <path d="M295 232c14-30 24-62 27-96M455 232c-12-37-20-76-22-118" />
    </svg>
  );
}

function TaiwanSkyline() {
  return (
    <svg
      viewBox="0 0 720 250"
      aria-hidden="true"
      className="absolute inset-x-0 bottom-0 h-auto w-full text-red-500/35"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M0 232h720" />
      <path d="M58 232v-68h74v68M76 164v-20h38v20" />
      <path d="M164 232v-98h50v98M177 134v-28h24v28" />
      <path d="M279 232v-128h44v128M301 104V60M292 83h18" />
      <path d="M366 232v-176h58v176M395 56V10M384 33h22" />
      <path d="M452 232v-112h48v112M465 120V88h22v32" />
      <path d="M536 232v-72h78v72M556 160v-22h36v22" />
      <path d="M640 232v-96h44v96" />
      <circle cx="610" cy="80" r="42" opacity=".25" />
      <circle cx="610" cy="80" r="72" opacity=".12" />
    </svg>
  );
}

function LargeLinkButton({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: React.ReactNode;
  secondary?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={
        secondary
          ? "group flex min-h-16 items-center justify-between gap-4 rounded-2xl border-2 border-red-500/55 bg-black/65 px-6 text-base font-black text-red-100 transition hover:border-red-300 hover:bg-red-950/40"
          : "group flex min-h-16 items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-red-700 to-red-600 px-6 text-base font-black text-white shadow-[0_0_24px_rgba(220,38,38,.22)] transition hover:from-red-600 hover:to-red-500 hover:shadow-[0_0_32px_rgba(239,68,68,.3)]"
      }
    >
      <span>{children}</span>

      <span className="shrink-0 transition group-hover:translate-x-1 group-hover:-translate-y-1">
        <ExternalArrow />
      </span>
    </a>
  );
}

export default function TierListPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(rgba(127,29,29,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(127,29,29,.12) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
          maskImage:
            "linear-gradient(to bottom, black, transparent 88%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-3 py-7 sm:px-6 sm:py-10 lg:px-8">
        <header className="mb-7">
          <p className="text-xs font-black tracking-[0.28em] text-red-400">
            UNION ARENA META
          </p>

          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            环境 T表专区
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-500">
            选择地区，前往查看对应的 Union Arena 环境资料与 T表。
          </p>
        </header>

        <section className="grid items-stretch gap-5 md:grid-cols-2">
          {/* 马来西亚 */}
          <article className="relative flex min-h-[650px] flex-col overflow-hidden rounded-3xl border border-red-700/70 bg-[#080808] p-6 shadow-[0_0_40px_rgba(185,28,28,.18)] sm:p-8 lg:p-10">
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-65"
              style={{
                background:
                  "radial-gradient(circle at 90% 10%, rgba(220,38,38,.27), transparent 31%), radial-gradient(circle at 5% 95%, rgba(127,29,29,.24), transparent 36%), linear-gradient(135deg, rgba(255,255,255,.025), transparent 48%)",
              }}
            />

            <div
              aria-hidden="true"
              className="absolute -right-16 -top-16 h-64 w-64 rounded-full border border-red-500/20"
            />
            <div
              aria-hidden="true"
              className="absolute right-4 top-4 h-36 w-36 rounded-full border border-red-500/20"
            />

            <div className="relative z-10 flex h-full flex-col">
              <div className="flex items-start justify-between gap-4">
                <span className="inline-flex rounded-full border border-red-500/30 bg-red-950/30 px-3 py-1.5 text-[10px] font-black tracking-[0.22em] text-red-300">
                  MALAYSIA META
                </span>

                <ProviderLogo provider="behdeck" />
              </div>

              <h2 className="mt-10 text-3xl font-black leading-tight sm:text-4xl">
                马来西亚
                <span className="ml-2 bg-gradient-to-b from-white to-red-500 bg-clip-text text-transparent">
                  T表专区
                </span>
              </h2>

              <p className="mt-2 text-lg font-black italic text-zinc-300">
                BehDeck
              </p>

              <div className="mt-4 h-1 w-16 rounded-full bg-red-600" />

              <p className="mt-5 text-sm leading-7 text-zinc-300">
                掌握最新 Union Arena 马来西亚比赛环境资料与 T表。
              </p>

              <p className="mt-3 text-sm leading-7 text-zinc-500">
                🐙 特别感谢 BehDeck 提供相关 T表的资讯。
              </p>

              <div className="relative z-10 mt-auto space-y-4 pt-16">
                <LargeLinkButton href={BEHDECK_URL}>
                  查看 BehDeck 完整 T表与参考构筑
                </LargeLinkButton>

                <div className="rounded-2xl border border-red-950 bg-black/65 p-5">
                  <p className="text-sm font-black text-white">
                    喜欢这些免费的环境资料吗？
                  </p>

                  <p className="mt-1 text-xs leading-6 text-zinc-500">
                    支持八脚鱼继续维护 BehDeck。
                  </p>

                  <div className="mt-4">
                    <BehDeckKofiButton />
                  </div>
                </div>
              </div>
            </div>

            <MalaysiaSkyline />
          </article>

          {/* 台湾 */}
          <article className="relative flex min-h-[650px] flex-col overflow-hidden rounded-3xl border border-red-700/70 bg-[#080808] p-6 shadow-[0_0_40px_rgba(185,28,28,.18)] sm:p-8 lg:p-10">
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-65"
              style={{
                background:
                  "radial-gradient(circle at 90% 10%, rgba(220,38,38,.27), transparent 31%), radial-gradient(circle at 5% 95%, rgba(127,29,29,.24), transparent 36%), linear-gradient(135deg, rgba(255,255,255,.025), transparent 48%)",
              }}
            />

            <div
              aria-hidden="true"
              className="absolute -right-16 -top-16 h-64 w-64 rounded-full border border-red-500/20"
            />
            <div
              aria-hidden="true"
              className="absolute right-4 top-4 h-36 w-36 rounded-full border border-red-500/20"
            />

            <div className="relative z-10 flex h-full flex-col">
              <div className="flex items-start justify-between gap-4">
                <span className="inline-flex rounded-full border border-red-500/30 bg-red-950/30 px-3 py-1.5 text-[10px] font-black tracking-[0.22em] text-red-300">
                  TAIWAN META
                </span>

                <ProviderLogo provider="mr-kado" />
              </div>

              <h2 className="mt-10 text-3xl font-black leading-tight sm:text-4xl">
                台湾
                <span className="ml-2 bg-gradient-to-b from-white to-red-500 bg-clip-text text-transparent">
                  T表专区
                </span>
              </h2>

              <p className="mt-2 text-lg font-black italic text-zinc-300">
                Mr.Kado_TCG
              </p>

              <div className="mt-4 h-1 w-16 rounded-full bg-red-600" />

              <p className="mt-5 text-sm leading-7 text-zinc-300">
                查看台湾 Union Arena 环境 T表以及 3v3 团队赛环境资料。
              </p>

              <p className="mt-3 text-sm leading-7 text-zinc-500">
                特别感谢 Mr.Kado_TCG 提供相关 T表的资讯。
              </p>

              <div className="relative z-10 mt-auto space-y-4 pt-16">
                <div className="grid grid-cols-2 gap-3">
                  <LargeLinkButton href={TAIWAN_TIER_LIST_URL}>
                    查看Mr.Kado T表
                  </LargeLinkButton>

                  <LargeLinkButton
                    href={TAIWAN_3V3_URL}
                    secondary
                  >
                    查看Mr.Kado 3v3 T表
                  </LargeLinkButton>
                </div>
              </div>
            </div>

            <TaiwanSkyline />
          </article>
        </section>

        <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-6 text-zinc-600">
          马来西亚资料由 BehDeck 提供；台湾资料由 Mr.Kado_TCG 提供。
          所有按钮会跳转至对应的原始资料页面。
        </p>
      </div>
    </main>
  );
}
