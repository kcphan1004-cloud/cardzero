import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const QUEUE_PATH = path.join(
  ROOT,
  "data",
  "stage2",
  "card-detail-queue.json",
);
const CACHE_DIR = path.join(
  ROOT,
  "data",
  "stage2",
  "official-cache",
);
const ERROR_DIR = path.join(
  ROOT,
  "data",
  "stage2",
  "official-errors",
);
const REPORT_DIR = path.join(
  ROOT,
  "data",
  "stage2",
  "reports",
);

const PARSE_VERSION = 1;
const OFFICIAL_IFRAME_URL =
  "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php";
const OFFICIAL_DETAIL_URL =
  "https://www.unionarena-tcg.com/jp/cardlist/detail.php";

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const item = process.argv.find((value) =>
    value.startsWith(prefix),
  );

  return item
    ? item.slice(prefix.length)
    : fallback;
}

function parseBoolean(value, fallback = false) {
  if (value === "") {
    return fallback;
  }

  return /^(1|true|yes|y)$/i.test(String(value));
}

function clampInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(
    minimum,
    Math.min(maximum, parsed),
  );
}

function sleep(milliseconds) {
  return new Promise((resolve) =>
    setTimeout(resolve, milliseconds),
  );
}

function removeBom(value) {
  return String(value ?? "").replace(/^\uFEFF/, "");
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t　]+/g, " ")
    .replace(/\r/g, "")
    .trim();
}

function normalizeMultiline(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) =>
      line
        .replace(/[ \t　]+/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .join("\n");
}

function normalizeNumber(value) {
  return normalizeText(value)
    .replace(/\\/g, "/")
    .replace(/_/g, "/")
    .toUpperCase();
}

function safeFileName(value) {
  return String(value ?? "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_");
}

function escapeRegExp(value) {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

function decodeHtmlEntities(value) {
  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    minus: "−",
    times: "×",
    middot: "・",
    ndash: "–",
    mdash: "—",
  };

  return String(value ?? "").replace(
    /&(#x?[0-9a-f]+|[a-z]+);/gi,
    (_, entity) => {
      const lower = entity.toLowerCase();

      try {
        if (lower.startsWith("#x")) {
          return String.fromCodePoint(
            Number.parseInt(lower.slice(2), 16),
          );
        }

        if (lower.startsWith("#")) {
          return String.fromCodePoint(
            Number.parseInt(lower.slice(1), 10),
          );
        }
      } catch {
        return "";
      }

      return named[lower] ?? `&${entity};`;
    },
  );
}

function getAttribute(tag, name) {
  const pattern = new RegExp(
    `\\b${escapeRegExp(name)}\\s*=\\s*(["'])([\\s\\S]*?)\\1`,
    "i",
  );
  const match = String(tag ?? "").match(pattern);

  return match
    ? decodeHtmlEntities(match[2])
    : "";
}

function extractElementByClass(html, className) {
  const pattern = new RegExp(
    `<([a-z][a-z0-9]*)\\b[^>]*class\\s*=\\s*(["'])` +
      `[^"']*\\b${escapeRegExp(className)}\\b[^"']*\\2[^>]*>` +
      `([\\s\\S]*?)<\\/\\1>`,
    "i",
  );

  const match = String(html ?? "").match(pattern);
  return match ? match[3] : "";
}

function extractImageData(fragment) {
  const images = [];

  String(fragment ?? "").replace(
    /<img\b[^>]*>/gi,
    (tag) => {
      images.push({
        alt: normalizeText(
          getAttribute(tag, "alt"),
        ),
        src: normalizeText(
          getAttribute(tag, "src"),
        ),
      });

      return tag;
    },
  );

  return images;
}

function iconTextFromTag(tag) {
  const alt = normalizeText(
    getAttribute(tag, "alt"),
  );

  if (alt) {
    return alt;
  }

  const src = normalizeText(
    getAttribute(tag, "src"),
  );

  const fileName =
    src.split("/").at(-1)?.replace(/\.[^.]+$/, "") ??
    "";

  return fileName
    .replace(/^ico_/, "")
    .replace(/_/g, " ");
}

function fragmentToText(
  fragment,
  { bracketImages = false } = {},
) {
  let html = String(fragment ?? "");

  html = html.replace(
    /<span\b[^>]*class\s*=\s*(["'])[^"']*\brubyData\b[^"']*\1[^>]*>[\s\S]*?<\/span>/gi,
    "",
  );

  html = html.replace(
    /<img\b[^>]*>/gi,
    (tag) => {
      const icon = iconTextFromTag(tag);

      if (!icon) {
        return "";
      }

      return bracketImages
        ? `\n[${icon}]\n`
        : ` ${icon} `;
    },
  );

  html = html
    .replace(/<br\b[^>]*>/gi, "\n")
    .replace(
      /<\/(?:p|div|li|dt|dd|tr|h[1-6])>/gi,
      "\n",
    )
    .replace(/<[^>]+>/g, " ");

  return normalizeMultiline(
    decodeHtmlEntities(html),
  );
}

function extractContents(html, blockClass) {
  const block = extractElementByClass(
    html,
    blockClass,
  );

  if (!block) {
    return "";
  }

  return (
    extractElementByClass(
      block,
      "cardDataContents",
    ) || block
  );
}

const COLOR_MAP = {
  赤: "红色",
  青: "蓝色",
  黄: "黄色",
  緑: "绿色",
  紫: "紫色",
  無色: "无色",
  red: "红色",
  blue: "蓝色",
  yellow: "黄色",
  green: "绿色",
  purple: "紫色",
  colorless: "无色",
};

const TYPE_MAP = {
  キャラクター: "角色卡",
  イベント: "事件卡",
  フィールド: "场地卡",
  アクションポイント: "行动点卡",
  ACTIONPOINT: "行动点卡",
};

function translateColor(value) {
  const normalized = normalizeText(value);

  if (COLOR_MAP[normalized]) {
    return COLOR_MAP[normalized];
  }

  const pieces = normalized
    .split(/[\/・,+]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => COLOR_MAP[part] ?? part);

  return [...new Set(pieces)].join("/") || "-";
}

function translateType(value) {
  const normalized = normalizeText(value);
  return TYPE_MAP[normalized] ?? normalized ?? "-";
}

function colorFromSource(src) {
  const match = String(src ?? "").match(
    /energy_(red|blue|yellow|green|purple|colorless)(\d+)?/i,
  );

  if (!match) {
    return {
      color: "",
      amount: 0,
    };
  }

  return {
    color: match[1].toLowerCase(),
    amount: Number(match[2] || 1),
  };
}

function parseEnergyIcon(image) {
  const alt = normalizeText(image?.alt);

  const altMatch = alt.match(
    /^(.+?)(\d+)$/,
  );

  if (altMatch) {
    return {
      color: altMatch[1],
      amount: Number(altMatch[2]),
    };
  }

  const fromSource = colorFromSource(
    image?.src,
  );

  if (fromSource.color) {
    return fromSource;
  }

  return {
    color: alt,
    amount: alt ? 1 : 0,
  };
}

function parseRequiredEnergy(html) {
  const block = extractContents(
    html,
    "needEnergyData",
  );
  const images = extractImageData(block);
  const values = images
    .map(parseEnergyIcon)
    .filter(
      (item) =>
        item.color && Number.isFinite(item.amount),
    );

  if (values.length === 0) {
    return {
      color: "-",
      cost: 0,
      raw: [],
    };
  }

  const colors = [
    ...new Set(
      values.map((item) =>
        translateColor(item.color),
      ),
    ),
  ];

  return {
    color: colors.join("/"),
    cost: values.reduce(
      (sum, item) => sum + item.amount,
      0,
    ),
    raw: values,
  };
}

function parseGeneratedEnergy(html) {
  const block = extractContents(
    html,
    "generatedEnergyData",
  );
  const images = extractImageData(block);
  const values = images
    .map(parseEnergyIcon)
    .filter(
      (item) =>
        item.color && Number.isFinite(item.amount),
    );

  if (values.length === 0) {
    return {
      display: "-",
      raw: [],
    };
  }

  const totals = new Map();

  for (const item of values) {
    const color = translateColor(item.color);
    totals.set(
      color,
      (totals.get(color) ?? 0) + item.amount,
    );
  }

  return {
    display: [...totals.entries()]
      .map(
        ([color, amount]) =>
          `${color}×${amount}`,
      )
      .join("/"),
    raw: values,
  };
}

function parseInteger(value, fallback = 0) {
  const match = normalizeText(value).match(
    /-?\d+/,
  );

  return match
    ? Number(match[0])
    : fallback;
}

function parseOfficialHtml(html, requestedNumber) {
  const nameFragment = extractElementByClass(
    html,
    "cardNameCol",
  );
  const numberFragment =
    extractElementByClass(
      html,
      "cardNumData",
    );
  const rarityFragment =
    extractElementByClass(
      html,
      "rareData",
    );

  const requiredEnergy =
    parseRequiredEnergy(html);
  const generatedEnergy =
    parseGeneratedEnergy(html);

  const typeJa = fragmentToText(
    extractContents(html, "categoryData"),
  );
  const bp = fragmentToText(
    extractContents(html, "bpData"),
  );
  const feature = fragmentToText(
    extractContents(html, "attributeData"),
  );
  const effect = fragmentToText(
    extractContents(html, "effectData"),
    { bracketImages: true },
  );
  const trigger = fragmentToText(
    extractContents(html, "triggerData"),
    { bracketImages: true },
  );

  const parsedNumber = normalizeNumber(
    fragmentToText(numberFragment),
  );
  const expectedNumber =
    normalizeNumber(requestedNumber);

  if (!parsedNumber) {
    throw new Error(
      "官方页面内找不到卡号。",
    );
  }

  if (
    expectedNumber &&
    parsedNumber !== expectedNumber
  ) {
    throw new Error(
      `官方页面卡号不一致：期待 ${expectedNumber}，实际 ${parsedNumber}`,
    );
  }

  if (!typeJa) {
    throw new Error(
      "官方页面内找不到卡牌类型。",
    );
  }

  const type = translateType(typeJa);

  return {
    status: "complete",
    parseVersion: PARSE_VERSION,
    fetchedAt: new Date().toISOString(),
    number: parsedNumber,
    name: fragmentToText(nameFragment),
    color: requiredEnergy.color,
    type,
    typeJa,
    rarity:
      fragmentToText(rarityFragment) || "-",
    cost: requiredEnergy.cost,
    ap: parseInteger(
      fragmentToText(
        extractContents(html, "apData"),
      ),
      0,
    ),
    bp:
      type === "角色卡"
        ? bp || "-"
        : "-",
    feature: feature || "-",
    generatedEnergy:
      generatedEnergy.display,
    effect:
      effect === "-" ? "" : effect,
    trigger:
      trigger === "-" ? "" : trigger,
    officialDetailUrl:
      `${OFFICIAL_DETAIL_URL}?card_no=${encodeURIComponent(parsedNumber)}`,
    sourceUrl:
      `${OFFICIAL_IFRAME_URL}?card_no=${encodeURIComponent(parsedNumber)}`,
    raw: {
      requiredEnergy:
        requiredEnergy.raw,
      generatedEnergy:
        generatedEnergy.raw,
    },
  };
}

async function fetchText(url, retries = 3) {
  let lastError;

  for (
    let attempt = 1;
    attempt <= retries;
    attempt += 1
  ) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) " +
            "Chrome/150.0.0.0 Safari/537.36 CardZero/1.0",
          Accept:
            "text/html,application/xhtml+xml",
          "Accept-Language":
            "ja,en-US;q=0.8,en;q=0.7",
          Referer:
            "https://www.unionarena-tcg.com/jp/cardlist/",
        },
      });

      const body = await response.text();

      if (response.ok) {
        return body;
      }

      lastError = new Error(
        `HTTP ${response.status} ${response.statusText}`,
      );
    } catch (error) {
      lastError = error;
    }

    if (attempt < retries) {
      await sleep(1000 * attempt);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError));
}

async function writeJsonAtomic(filePath, data) {
  const temporaryPath = `${filePath}.tmp`;

  await fs.writeFile(
    temporaryPath,
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8",
  );

  await fs.rename(
    temporaryPath,
    filePath,
  );
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function makeActionPointRecord(item) {
  return {
    status: "complete",
    parseVersion: PARSE_VERSION,
    fetchedAt: new Date().toISOString(),
    number: normalizeNumber(item.number),
    name: item.name || "",
    color: "-",
    type: "行动点卡",
    typeJa: "アクションポイント",
    rarity: "AP",
    cost: 0,
    ap: 0,
    bp: "-",
    feature: "-",
    generatedEnergy: "-",
    effect: "",
    trigger: "",
    officialDetailUrl: "",
    sourceUrl: "",
    raw: {
      syntheticActionPoint: true,
    },
  };
}

async function main() {
  const seriesArgument = getArg(
    "series",
    "all",
  );
  const limit = clampInteger(
    getArg("limit", "0"),
    0,
    0,
    1000000,
  );
  const offset = clampInteger(
    getArg("offset", "0"),
    0,
    0,
    1000000,
  );
  const concurrency = clampInteger(
    getArg("concurrency", "2"),
    2,
    1,
    4,
  );
  const delay = clampInteger(
    getArg("delay", "450"),
    450,
    200,
    5000,
  );
  const force = parseBoolean(
    getArg("force", "false"),
  );

  console.log(
    "CardZero 第二阶段：下载日本官方卡牌详情",
  );
  console.log(
    "======================================",
  );
  console.log(`系列：${seriesArgument}`);
  console.log(`并发：${concurrency}`);
  console.log(`每个工作线程间隔：${delay}ms`);
  console.log(`强制重抓：${force ? "是" : "否"}`);

  const queue = JSON.parse(
    removeBom(
      await fs.readFile(QUEUE_PATH, "utf8"),
    ),
  );

  if (!Array.isArray(queue)) {
    throw new Error(
      "card-detail-queue.json 不是阵列。",
    );
  }

  const requestedSeries = new Set(
    seriesArgument
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );

  let selected = queue.filter((item) => {
    if (
      requestedSeries.has("all") ||
      requestedSeries.size === 0
    ) {
      return true;
    }

    return item.seriesSlugs?.some(
      (slug) => requestedSeries.has(slug),
    );
  });

  selected = selected.slice(
    offset,
    limit > 0
      ? offset + limit
      : undefined,
  );

  await fs.mkdir(CACHE_DIR, {
    recursive: true,
  });
  await fs.mkdir(ERROR_DIR, {
    recursive: true,
  });
  await fs.mkdir(REPORT_DIR, {
    recursive: true,
  });

  const pending = [];
  let cached = 0;
  let actionPoints = 0;

  for (const item of selected) {
    const cachePath = path.join(
      CACHE_DIR,
      `${safeFileName(item.number)}.json`,
    );

    if (
      !force &&
      await fileExists(cachePath)
    ) {
      cached += 1;
      continue;
    }

    if (
      item.isActionPoint ||
      /-AP\d+$/i.test(item.number)
    ) {
      await writeJsonAtomic(
        cachePath,
        makeActionPointRecord(item),
      );
      actionPoints += 1;
      continue;
    }

    pending.push({
      ...item,
      cachePath,
    });
  }

  console.log(`选中卡号：${selected.length}`);
  console.log(`已有缓存：${cached}`);
  console.log(`行动点卡：${actionPoints}`);
  console.log(`需要下载：${pending.length}`);

  let nextIndex = 0;
  let completed = 0;
  const failures = [];

  async function worker(workerNumber) {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= pending.length) {
        return;
      }

      const item = pending[currentIndex];
      const number = normalizeNumber(
        item.number,
      );
      const url =
        `${OFFICIAL_IFRAME_URL}?card_no=${encodeURIComponent(number)}`;

      try {
        const html = await fetchText(url);
        const detail = parseOfficialHtml(
          html,
          number,
        );

        await writeJsonAtomic(
          item.cachePath,
          detail,
        );

        const errorPath = path.join(
          ERROR_DIR,
          `${safeFileName(number)}.json`,
        );

        if (await fileExists(errorPath)) {
          await fs.rm(errorPath, {
            force: true,
          });
        }

        completed += 1;

        console.log(
          `[${completed + failures.length}/${pending.length}] ` +
            `${number}｜${detail.name}`,
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : String(error);

        const failure = {
          number,
          name: item.name,
          seriesSlugs:
            item.seriesSlugs ?? [],
          sourceUrl: url,
          error: message,
          failedAt:
            new Date().toISOString(),
        };

        failures.push(failure);

        await writeJsonAtomic(
          path.join(
            ERROR_DIR,
            `${safeFileName(number)}.json`,
          ),
          failure,
        );

        console.error(
          `[失败] ${number}｜${message}`,
        );
      }

      await sleep(delay);
    }
  }

  await Promise.all(
    Array.from(
      {
        length: Math.min(
          concurrency,
          Math.max(1, pending.length),
        ),
      },
      (_, index) => worker(index + 1),
    ),
  );

  const report = {
    generatedAt: new Date().toISOString(),
    seriesArgument,
    selected: selected.length,
    alreadyCached: cached,
    syntheticActionPoints: actionPoints,
    attemptedDownloads: pending.length,
    successfulDownloads: completed,
    failedDownloads: failures.length,
    concurrency,
    delay,
    parseVersion: PARSE_VERSION,
    failures,
  };

  const reportPath = path.join(
    REPORT_DIR,
    `fetch-${safeFileName(seriesArgument)}-${Date.now()}.json`,
  );

  await writeJsonAtomic(
    reportPath,
    report,
  );

  console.log("");
  console.log(
    "======================================",
  );
  console.log(`下载成功：${completed}`);
  console.log(`下载失败：${failures.length}`);
  console.log(
    `缓存位置：${path.relative(ROOT, CACHE_DIR)}`,
  );
  console.log(
    `报告：${path.relative(ROOT, reportPath)}`,
  );
}

main().catch((error) => {
  console.error("");
  console.error(
    "执行失败：",
    error instanceof Error
      ? error.message
      : error,
  );
  process.exitCode = 1;
});
