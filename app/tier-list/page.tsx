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
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

function RightArrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function MalaysiaSkyline() {
  return (
    <svg
      viewBox="0 0 720 230"
      aria-hidden="true"
      className="absolute bottom-0 left-0 h-auto w-full text-red-500/50"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M0 214h720" />
      <path d="M34 214v-52h46v52M44 162v-19h26v19" />
      <path d="M112 214v-86h42v86M124 128v-26h18v26" />
      <path d="M185 214v-48h76v48M205 166v-20h36v20" />
      <path d="M320 214v-142h34v142M337 72V24M330 56h14" />
      <path d="M386 214v-168h43v168M407 46V8M398 29h18" />
      <path d="M461 214v-124h44v124M474 90V58h18v32" />
      <path d="M540 214v-74h64v74M559 140v-21h26v21" />
      <path d="M632 214v-96h45v96M644 118V88h20v30" />
      <path d="M295 214c14-30 24-62 27-96M455 214c-12-37-20-76-22-118" />
      <path d="M344 91h41M344 119h41M344 148h41M344 177h41" />
      <path d="M429 70h34M429 99h34M429 128h34M429 157h34M429 186h34" />
      <path d="M55 190h150M498 184h178" />
    </svg>
  );
}

function TaiwanBackdrop() {
  return (
    <svg
      viewBox="0 0 720 260"
      aria-hidden="true"
      className="absolute inset-x-0 bottom-0 h-auto w-full text-red-500/45"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M0 238h720" />
      <path d="M62 238v-58h70v58M78 180v-20h38v20" />
      <path d="M166 238v-88h44v88M177 150v-25h22v25" />
      <path d="M278 238v-118h42v118M299 120V76M291 99h16" />
      <path d="M370 238v-172h54v172M397 66V20M386 43h22" />
      <path d="M452 238v-104h46v104M464 134v-30h22v30" />
      <path d="M532 238v-68h74v68M551 170v-22h36v22" />
      <path d="M636 238v-94h42v94" />
      <circle cx="604" cy="86" r="44" opacity=".25" />
      <circle cx="604" cy="86" r="74" opacity=".15" />
      <path d="M112 210h128M487 210h170" />
      <path d="M350 238c12-31 20-62 22-95M434 238c-9-34-14-71-15-110" />
    </svg>
  );
}

type TaiwanLinkCardProps = {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  label: string;
};

function TaiwanLinkCard({
  href,
  eyebrow,
  title,
  description,
  label,
}: TaiwanLinkCardProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="group relative min-h-[250px] overflow-hidden rounded-2xl border border-red-800/70 bg-[#090909] p-6 shadow-[0_0_28px_rgba(127,29,29,.16)] transition hover:-translate-y-1 hover:border-red-400 hover:shadow-[0_0_38px_rgba(239,68,68,.25)] sm:p-8"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(circle at 90% 10%, rgba(220,38,38,.28), transparent 30%), linear-gradient(135deg, rgba(255,255,255,.03), transparent 45%)",
        }}
      />

      <div
        aria-hidden="true"
        className="absolute right-5 top-5 h-28 w-28 rounded-full border border-red-500/20"
      />
      <div
        aria-hidden="true"
        className="absolute right-10 top-10 h-16 w-16 rounded-full border border-red-500/20"
      />

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-black tracking-[0.24em] text-red-400">
              {eyebrow}
            </p>

            <h3 className="mt-3 text-3xl font-black text-white sm:text-4xl">
              {title}
            </h3>
          </div>

          <span className="rounded-full border border-white/15 bg-black/50 p-3 text-zinc-300 transition group-hover:border-red-400 group-hover:text-white">
            <ExternalArrow />
          </span>
        </div>

        <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-400">
          {description}
        </p>

        <div className="mt-auto flex items-center justify-between pt-8">
          <span className="rounded-full border border-red-500/30 bg-red-950/35 px-3 py-1.5 text-xs font-bold text-red-300">
            Instagram
          </span>

          <span className="flex items-center gap-2 text-sm font-black text-white transition group-hover:translate-x-1">
            {label}
            <RightArrow />
          </span>
        </div>
      </div>
    </a>
  );
}

export default function TierListPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(127,29,29,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(127,29,29,.12) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
          maskImage:
            "linear-gradient(to bottom, black, transparent 82%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-9 lg:px-8">
        <nav className="mb-6 flex flex-wrap gap-2">
          <a
            href="#malaysia-meta"
            className="rounded-full border border-red-500/30 bg-red-950/25 px-4 py-2 text-xs font-black text-red-200 transition hover:border-red-400 hover:bg-red-950/45"
          >
            Malaysia Meta
          </a>

          <a
            href="#taiwan-meta"
            className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-black text-zinc-300 transition hover:border-red-500/50 hover:text-white"
          >
            Taiwan Meta
          </a>
        </nav>

        <section
          id="malaysia-meta"
          className="scroll-mt-24"
        >
          <div className="relative overflow-hidden rounded-3xl border border-red-700/70 bg-[#080808] shadow-[0_0_45px_rgba(185,28,28,0.22)]">
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-70"
              style={{
                background:
                  "radial-gradient(circle at 80% 20%, rgba(220,38,38,.28), transparent 28%), radial-gradient(circle at 10% 90%, rgba(127,29,29,.25), transparent 30%), linear-gradient(135deg, rgba(255,255,255,.025), transparent 40%)",
              }}
            />

            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(135deg, transparent 0 24px, rgba(239,68,68,.22) 25px, transparent 26px 52px)",
              }}
            />

            <div className="relative grid min-h-[520px] lg:grid-cols-[1.15fr_.85fr]">
              <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-14">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-red-500/30 bg-red-950/30 px-3 py-1.5 text-[10px] font-black tracking-[0.26em] text-red-300 sm:text-xs">
                  <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,.9)]" />
                  MALAYSIA META
                </div>

                <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
                  马来西亚
                  <span className="ml-2 bg-gradient-to-b from-white via-red-100 to-red-500 bg-clip-text text-transparent">
                    T表专区
                  </span>
                </h1>

                <div className="mt-5 h-1 w-20 rounded-full bg-red-600 shadow-[0_0_18px_rgba(220,38,38,.75)]" />

                <p className="mt-6 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base sm:leading-8">
                  掌握最新 Union Arena 马来西亚比赛环境资料与 T表，由
                  <strong className="mx-1 text-red-400">
                    BehDeck
                  </strong>
                  提供。
                </p>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
                  🐙 特别感谢八脚鱼授权卡零社展示相关图片。
                </p>

                <a
                  href={BEHDECK_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-7 inline-flex min-h-12 w-fit items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-500"
                >
                  查看 BehDeck 完整 T表
                  <ExternalArrow />
                </a>
              </div>

              <a
                href={BEHDECK_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="group relative min-h-[310px] overflow-hidden border-t border-red-950 bg-[radial-gradient(circle_at_center,_rgba(127,29,29,.35),_transparent_58%)] lg:min-h-full lg:border-l lg:border-t-0"
              >
                <div
                  aria-hidden="true"
                  className="absolute -right-20 -top-20 h-72 w-72 rounded-full border border-red-500/20"
                />
                <div
                  aria-hidden="true"
                  className="absolute -right-6 -top-6 h-52 w-52 rounded-full border border-red-500/20"
                />
                <div
                  aria-hidden="true"
                  className="absolute right-10 top-10 h-28 w-28 rounded-full border border-red-500/20"
                />

                <div className="relative z-10 flex h-full min-h-[310px] flex-col justify-between p-7 sm:p-10">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-7xl font-black italic tracking-tighter text-white sm:text-8xl">
                        MY
                      </p>
                      <p className="mt-1 text-2xl font-black italic text-zinc-300">
                        BehDeck
                      </p>
                    </div>

                    <span className="rounded-full border border-white/15 bg-black/50 p-3 text-zinc-300 transition group-hover:border-red-400 group-hover:text-white">
                      <ExternalArrow />
                    </span>
                  </div>

                  <div className="relative z-10 mt-20">
                    <p className="text-xs font-bold tracking-[0.22em] text-red-300">
                      UNION ARENA · MALAYSIA
                    </p>
                    <p className="mt-2 text-sm text-zinc-500">
                      点击前往 BehDeck 查看完整环境资料
                    </p>
                  </div>
                </div>

                <MalaysiaSkyline />
              </a>
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_.85fr]">
            <a
              href={BEHDECK_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="group relative overflow-hidden rounded-2xl border border-red-600/70 bg-gradient-to-r from-red-950 via-red-900/60 to-black p-6 shadow-[0_0_30px_rgba(185,28,28,.18)] transition hover:border-red-400 hover:shadow-[0_0_38px_rgba(239,68,68,.25)] sm:p-8"
            >
              <div
                aria-hidden="true"
                className="absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle,_rgba(239,68,68,.22),_transparent_65%)]"
              />

              <div className="relative flex items-center justify-between gap-5">
                <div>
                  <p className="text-xs font-black tracking-[0.22em] text-red-300">
                    PROVIDED BY BEHDECK
                  </p>

                  <h2 className="mt-2 text-xl font-black leading-snug sm:text-2xl">
                    查看 BehDeck 完整 T表与参考构筑
                  </h2>

                  <p className="mt-3 text-sm leading-7 text-zinc-400">
                    最新马来西亚环境资料、牌组说明与参考构筑，请前往 BehDeck 原始网站。
                  </p>
                </div>

                <span className="shrink-0 rounded-full border border-red-400/50 bg-black/40 p-3 text-red-200 transition group-hover:translate-x-1 group-hover:-translate-y-1">
                  <ExternalArrow />
                </span>
              </div>
            </a>

            <div className="rounded-2xl border border-red-950 bg-[#0a0a0a] p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-red-500/30 bg-red-950/40 text-3xl">
                  🐙
                </div>

                <div>
                  <h2 className="text-xl font-black">
                    喜欢这些免费的环境资料吗？
                  </h2>

                  <p className="mt-2 text-sm leading-7 text-zinc-400">
                    支持八脚鱼继续维护 BehDeck，为马来西亚 Union Arena
                    社群整理更多环境资讯。
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <BehDeckKofiButton />
              </div>
            </div>
          </div>
        </section>

        <section
          id="taiwan-meta"
          className="scroll-mt-24 pt-14 sm:pt-20"
        >
          <div className="relative overflow-hidden rounded-3xl border border-red-800/70 bg-[#080808] p-6 shadow-[0_0_42px_rgba(127,29,29,.18)] sm:p-10 lg:p-12">
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-65"
              style={{
                background:
                  "radial-gradient(circle at 85% 15%, rgba(220,38,38,.26), transparent 28%), radial-gradient(circle at 15% 95%, rgba(127,29,29,.24), transparent 34%)",
              }}
            />

            <TaiwanBackdrop />

            <div className="relative z-10 max-w-3xl">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-red-500/30 bg-red-950/30 px-3 py-1.5 text-[10px] font-black tracking-[0.26em] text-red-300 sm:text-xs">
                <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,.9)]" />
                TAIWAN META
              </div>

              <h2 className="mt-5 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
                台湾
                <span className="ml-2 bg-gradient-to-b from-white via-red-100 to-red-500 bg-clip-text text-transparent">
                  T表专区
                </span>
              </h2>

              <div className="mt-5 h-1 w-20 rounded-full bg-red-600 shadow-[0_0_18px_rgba(220,38,38,.75)]" />

              <p className="mt-6 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base sm:leading-8">
                查看台湾 Union Arena 环境 T表与 3v3 环境资料。
                点击下方卡片会直接跳转至对应的 Instagram 贴文。
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <TaiwanLinkCard
              href={TAIWAN_TIER_LIST_URL}
              eyebrow="TAIWAN META"
              title="台湾 T表"
              description="查看台湾地区最新 Union Arena 环境 T表与牌组分布资讯。"
              label="查看 T表"
            />

            <TaiwanLinkCard
              href={TAIWAN_3V3_URL}
              eyebrow="TAIWAN 3V3 META"
              title="台湾 3v3 T表"
              description="查看台湾 Union Arena 3v3 团队赛环境 T表与相关牌组资讯。"
              label="查看 3v3 T表"
            />
          </div>

          <p className="mt-5 text-center text-xs leading-6 text-zinc-600">
            台湾专区目前使用外部链接方式展示，点击后会在新分页打开 Instagram。
          </p>
        </section>

        <p className="mx-auto mt-12 max-w-3xl text-center text-xs leading-6 text-zinc-600">
          马来西亚资料由 BehDeck 提供，并特别感谢八脚鱼授权相关展示。
          台湾专区链接会跳转至对应的 Instagram 原始贴文。
        </p>
      </div>
    </main>
  );
}
