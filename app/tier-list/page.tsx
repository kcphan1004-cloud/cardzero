import fs from "node:fs";
import path from "node:path";
import BehDeckKofiButton from "../../components/BehDeckKofiButton";

export const metadata = {
  title: "马来西亚 T表｜卡零社 CardZero",
  description:
    "Union Arena 马来西亚比赛环境 T表，由 BehDeck 提供，并经八脚鱼授权卡零社展示。",
};

export const revalidate = 3600;

const BEHDECK_URL = "https://behdeck.com/";

type TierIcon = {
  image: string;
  href: string;
  alt: string;
};

type TierRow = {
  label: string;
  icons: TierIcon[];
};

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function pickString(
  record: Record<string, unknown>,
  keys: string[],
) {
  for (const key of keys) {
    const value = record[key];

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return "";
}

function normalizeImagePath(value: string) {
  const trimmed = value.trim().replaceAll("\\", "/");

  if (!trimmed) {
    return "";
  }

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }

  const publicIndex = trimmed.indexOf("/public/");

  if (publicIndex >= 0) {
    return trimmed.slice(publicIndex + "/public".length);
  }

  if (trimmed.startsWith("public/")) {
    return `/${trimmed.slice("public/".length)}`;
  }

  return trimmed.startsWith("/")
    ? trimmed
    : `/${trimmed}`;
}

function normalizeHref(value: string) {
  if (
    value.startsWith("https://") ||
    value.startsWith("http://")
  ) {
    return value;
  }

  return BEHDECK_URL;
}

function normalizeIcon(
  value: unknown,
  fallbackAlt: string,
): TierIcon | null {
  if (typeof value === "string") {
    const image = normalizeImagePath(value);

    return image
      ? {
          image,
          href: BEHDECK_URL,
          alt: fallbackAlt,
        }
      : null;
  }

  if (!isRecord(value)) {
    return null;
  }

  const image = normalizeImagePath(
    pickString(value, [
      "image",
      "imageUrl",
      "image_url",
      "imagePath",
      "image_path",
      "src",
      "localPath",
      "local_path",
      "path",
      "icon",
      "thumbnail",
    ]),
  );

  if (!image) {
    return null;
  }

  const href = normalizeHref(
    pickString(value, [
      "href",
      "url",
      "sourceUrl",
      "source_url",
      "behdeckUrl",
      "behdeck_url",
      "link",
      "originalUrl",
      "original_url",
    ]) || BEHDECK_URL,
  );

  const alt =
    pickString(value, [
      "alt",
      "name",
      "title",
      "deckName",
      "deck_name",
      "label",
    ]) || fallbackAlt;

  return {
    image,
    href,
    alt,
  };
}

function findItemArray(
  record: Record<string, unknown>,
) {
  const preferredKeys = [
    "items",
    "icons",
    "decks",
    "cards",
    "images",
    "entries",
    "data",
  ];

  for (const key of preferredKeys) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function normalizeRowsFromArray(
  values: unknown[],
): TierRow[] {
  const rows: TierRow[] = [];

  for (const [index, value] of values.entries()) {
    if (!isRecord(value)) {
      continue;
    }

    const label =
      pickString(value, [
        "tier",
        "label",
        "name",
        "title",
        "rank",
      ]) || `T${index + 1}`;

    const itemArray = findItemArray(value);

    if (itemArray.length === 0) {
      continue;
    }

    const icons = itemArray
      .map((item) =>
        normalizeIcon(item, `${label} 牌组`),
      )
      .filter(
        (item): item is TierIcon => item !== null,
      );

    if (icons.length > 0) {
      rows.push({
        label,
        icons,
      });
    }
  }

  return rows;
}

function searchRows(value: unknown): TierRow[] {
  if (Array.isArray(value)) {
    const directRows = normalizeRowsFromArray(value);

    if (directRows.length > 0) {
      return directRows;
    }

    for (const child of value) {
      const nested = searchRows(child);

      if (nested.length > 0) {
        return nested;
      }
    }

    return [];
  }

  if (!isRecord(value)) {
    return [];
  }

  const preferredContainers = [
    "tiers",
    "rows",
    "sections",
    "tierList",
    "tier_list",
    "data",
  ];

  for (const key of preferredContainers) {
    const child = value[key];
    const rows = searchRows(child);

    if (rows.length > 0) {
      return rows;
    }
  }

  for (const child of Object.values(value)) {
    const rows = searchRows(child);

    if (rows.length > 0) {
      return rows;
    }
  }

  return [];
}

function scanFallbackImages(): TierRow[] {
  const directory = path.join(
    process.cwd(),
    "public",
    "tier-list",
    "behdeck",
  );

  if (!fs.existsSync(directory)) {
    return [];
  }

  const imageExtensions = new Set([
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
  ]);

  const imagePaths: string[] = [];

  function walk(currentDirectory: string) {
    for (const entry of fs.readdirSync(
      currentDirectory,
      {
        withFileTypes: true,
      },
    )) {
      const absolutePath = path.join(
        currentDirectory,
        entry.name,
      );

      if (entry.isDirectory()) {
        walk(absolutePath);
        continue;
      }

      if (
        imageExtensions.has(
          path.extname(entry.name).toLowerCase(),
        )
      ) {
        imagePaths.push(
          `/${path
            .relative(
              path.join(process.cwd(), "public"),
              absolutePath,
            )
            .replaceAll("\\", "/")}`,
        );
      }
    }
  }

  walk(directory);

  if (imagePaths.length === 0) {
    return [];
  }

  return [
    {
      label: "META",
      icons: imagePaths.map((image, index) => ({
        image,
        href: BEHDECK_URL,
        alt: `马来西亚环境牌组 ${index + 1}`,
      })),
    },
  ];
}

function getTierRows() {
  const dataPath = path.join(
    process.cwd(),
    "data",
    "behdeck-tier-list.json",
  );

  try {
    const raw = fs.readFileSync(dataPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const rows = searchRows(parsed);

    if (rows.length > 0) {
      return rows;
    }
  } catch (error) {
    console.error(
      "读取 BehDeck T表资料失败：",
      error,
    );
  }

  return scanFallbackImages();
}

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

function TierRowView({
  row,
}: {
  row: TierRow;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border-[3px] border-red-950 bg-[#080808] shadow-[0_0_30px_rgba(127,29,29,0.12)]">
      <div className="grid grid-cols-[48px_1fr] sm:grid-cols-[64px_1fr]">
        <div className="flex min-h-16 items-center justify-center border-r-[3px] border-red-950 bg-gradient-to-b from-red-700 to-red-950 px-1 text-center">
          <span className="break-words text-sm font-black leading-tight text-white sm:text-lg">
            {row.label}
          </span>
        </div>

        <div className="grid grid-cols-8 gap-1.5 p-2 sm:grid-cols-10 sm:gap-2 sm:p-3 lg:grid-cols-12">
          {row.icons.map((icon, index) => (
            <a
              key={`${icon.image}-${index}`}
              href={icon.href}
              target="_blank"
              rel="noreferrer noopener"
              title={`${icon.alt}｜前往 BehDeck`}
              className="group relative aspect-[3/4] overflow-hidden rounded-md border border-white/10 bg-zinc-950 transition hover:z-10 hover:scale-110 hover:border-red-500 hover:shadow-[0_0_22px_rgba(239,68,68,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <img
                src={icon.image}
                alt={icon.alt}
                loading="lazy"
                className="h-full w-full object-cover transition duration-300 group-hover:brightness-110"
              />
              <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/65 to-transparent opacity-0 transition group-hover:opacity-100" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function TierListPage() {
  const tierRows = getTierRows();
  const totalIcons = tierRows.reduce(
    (total, row) => total + row.icons.length,
    0,
  );

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
            "linear-gradient(to bottom, black, transparent 78%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-9 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-red-700/70 bg-[#080808] shadow-[0_0_45px_rgba(185,28,28,0.22)]">
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
                掌握最新 Union Arena
                马来西亚比赛环境资料与 T表，由
                <strong className="mx-1 text-red-400">
                  BehDeck
                </strong>
                提供。
              </p>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
                🐙 特别感谢八脚鱼授权卡零社展示相关图片。
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#malaysia-tier-list"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-500"
                >
                  查看马来西亚 T表
                </a>

                <a
                  href={BEHDECK_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-500/60 bg-black/60 px-5 text-sm font-black text-red-200 transition hover:border-red-400 hover:bg-red-950/40"
                >
                  查看 BehDeck 完整资料
                  <ExternalArrow />
                </a>
              </div>
            </div>

            <div className="relative min-h-[310px] overflow-hidden border-t border-red-950 bg-[radial-gradient(circle_at_center,_rgba(127,29,29,.35),_transparent_58%)] lg:min-h-full lg:border-l lg:border-t-0">
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

                  <span className="rounded-full border border-white/15 bg-black/50 p-3 text-zinc-300">
                    <ExternalArrow />
                  </span>
                </div>

                <div className="relative z-10 mt-20">
                  <p className="text-xs font-bold tracking-[0.22em] text-red-300">
                    UNION ARENA · MALAYSIA
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    本页只展示马来西亚环境资料
                  </p>
                </div>
              </div>

              <MalaysiaSkyline />
            </div>
          </div>
        </section>

        <section
          id="malaysia-tier-list"
          className="scroll-mt-24 pt-10 sm:pt-14"
        >
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black tracking-[0.24em] text-red-400">
                MALAYSIA META TIER LIST
              </p>
              <h2 className="mt-2 text-3xl font-black sm:text-4xl">
                最新马来西亚环境 T表
              </h2>
              <p className="mt-3 text-sm leading-7 text-zinc-500">
                图片来源：BehDeck。点击牌组图标会前往对应的 BehDeck 原始页面。
              </p>
            </div>

            <div className="w-fit rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-zinc-400">
              {tierRows.length} 个分区 · {totalIcons} 个牌组
            </div>
          </div>

          {tierRows.length > 0 ? (
            <div className="space-y-4">
              {tierRows.map((row, index) => (
                <TierRowView
                  key={`${row.label}-${index}`}
                  row={row}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-red-950 bg-[#080808] px-6 py-16 text-center">
              <p className="text-xl font-black">
                暂时无法读取 T表资料
              </p>
              <p className="mt-3 text-sm leading-7 text-zinc-500">
                请确认 data/behdeck-tier-list.json 与
                public/tier-list/behdeck 图片资料夹仍然存在。
              </p>
            </div>
          )}
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-[1fr_.85fr]">
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
                  更多完整资料、牌组说明与最新更新，请前往 BehDeck 原始网站。
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
        </section>

        <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-6 text-zinc-600">
          本专区的 BehDeck T表图片经八脚鱼授权展示。资料内容与图片来源归 BehDeck
          所有；卡零社仅作索引、整理与社群分享用途。
        </p>
      </div>
    </main>
  );
}
