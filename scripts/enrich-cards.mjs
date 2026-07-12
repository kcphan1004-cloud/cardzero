import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import * as cheerio from "cheerio";

const projectRoot = process.cwd();
const translationsPath = path.join(
  projectRoot,
  "data",
  "card-translations.json",
);

const tsvPath = path.join(projectRoot, "cards.tsv");
const outputPath = path.join(projectRoot, "data", "cards.ts");
const backupPath = path.join(
  projectRoot,
  "data",
  "cards.backup.ts",
);
const cachePath = path.join(
  projectRoot,
  "data",
  "card-details-cache.json",
);

const COLOR_MAP = {
  赤: "红色",
  青: "蓝色",
  緑: "绿色",
  黄: "黄色",
  紫: "紫色",
};

const TYPE_MAP = {
  キャラクター: "角色卡",
  イベント: "事件卡",
  フィールド: "场地卡",
  アクションポイントカード: "AP卡",
};

function sleep(milliseconds) {
  return new Promise((resolve) =>
    setTimeout(resolve, milliseconds),
  );
}

function sanitizeFileName(fileName) {
  return fileName
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .trim();
}

function removeExtension(fileName) {
  return fileName.replace(
    /\.(png|jpg|jpeg|webp)$/i,
    "",
  );
}

function normalizeText(value) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractMatch(text, pattern, fallback = "") {
  const match = text.match(pattern);

  return match?.[1]
    ? normalizeText(match[1])
    : fallback;
}

function extractCardName(displayFileName, baseCode) {
  const stem = removeExtension(displayFileName);

  const prefixes = [
    `${baseCode}-`,
    `${baseCode}_`,
  ];

  for (const prefix of prefixes) {
    if (stem.startsWith(prefix)) {
      return stem.slice(prefix.length).trim();
    }
  }

  return stem;
}

function getBaseCode(imageFileName) {
  return removeExtension(imageFileName)
    .replace(/_p\d+$/i, "");
}

function convertToOfficialNumber(baseCode) {
  const separatorIndex = baseCode.indexOf("_");

  if (separatorIndex === -1) {
    return baseCode;
  }

  return (
    baseCode.slice(0, separatorIndex) +
    "/" +
    baseCode.slice(separatorIndex + 1)
  );
}

function getVariant(imageFileName) {
  const match = removeExtension(imageFileName).match(
    /_p(\d+)$/i,
  );

  if (!match) {
    return "普通版";
  }

  return `异图版 ${match[1]}`;
}

function createId(imageFileName, index) {
  const stem = removeExtension(imageFileName);

  const cleaned = stem
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return (
    cleaned ||
    `card-${String(index + 1).padStart(4, "0")}`
  );
}

async function readCache() {
  try {
    const raw = await fs.readFile(cachePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}async function readTranslations() {
  try {
    const raw = await fs.readFile(
      translationsPath,
      "utf8",
    );

    return JSON.parse(
      raw.replace(/^\uFEFF/, ""),
    );
  } catch (error) {
    console.warn(
      "无法读取翻译资料，将使用空翻译。",
      error instanceof Error
        ? error.message
        : error,
    );

    return {};
  }
}

async function saveCache(cache) {
  await fs.writeFile(
    cachePath,
    JSON.stringify(cache, null, 2),
    "utf8",
  );
}

async function fetchCardDetails(officialNumber) {
  const detailUrl =
    "https://www.unionarena-tcg.com/jp/cardlist/" +
    "detail_iframe.php?card_no=" +
    encodeURIComponent(officialNumber);

  const response = await fetch(detailUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 CardZero Development Tool",
      Referer:
        "https://www.unionarena-tcg.com/jp/cardlist/",
    },
  });

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} ${response.statusText}`,
    );
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // 将图片的 alt 文字放进页面文字中，
  // 例如「レイド」「ドロー」「スペシャル」。
  $("img[alt]").each((_, element) => {
    const alt = $(element).attr("alt")?.trim();

    if (alt) {
      $(element).replaceWith(` ${alt} `);
    }
  });

  const bodyText = normalizeText($("body").text());

  const rarityPattern = new RegExp(
    `${escapeRegExp(officialNumber)}\\s+([A-Z]+)\\b`,
    "i",
  );

  const rarity = extractMatch(
    bodyText,
    rarityPattern,
    "-",
  );

  const energyMatch = bodyText.match(
    /必要\s*エナジー\s*([赤青緑黄紫])\s*(\d+)/,
  );

  const japaneseColor = energyMatch?.[1] ?? "";
  const cost = Number(energyMatch?.[2] ?? 0);

  const ap = Number(
    extractMatch(
      bodyText,
      /消費\s*AP\s*(\d+)/,
      "0",
    ),
  );

  const japaneseType = extractMatch(
    bodyText,
    /カード\s*種類\s*(キャラクター|イベント|フィールド|アクションポイントカード)/,
    "资料待补",
  );

  const bp = extractMatch(
    bodyText,
    /BP\s*([0-9]+\+?|－|-)/,
    "-",
  );

  const feature = extractMatch(
    bodyText,
    /特徴\s*(.*?)\s*発生\s*エナジー/,
    "-",
  );

  const generatedEnergy = extractMatch(
    bodyText,
    /発生\s*エナジー\s*([赤青緑黄紫－\-\s]+)/,
    "-",
  );

  const effect = extractMatch(
    bodyText,
    /効果\s*(.*?)\s*トリガー/,
    "卡牌效果整理中。",
  );

  const trigger = extractMatch(
    bodyText,
    /トリガー\s*(.*?)\s*(?:収録商品|カードリスト)/,
    "-",
  );

  const series = extractMatch(
    bodyText,
    /収録商品\s*(.*?)\s*〖/,
    "无职转生",
  );

  return {
    series,
    color: COLOR_MAP[japaneseColor] ?? "未分类",
    type: TYPE_MAP[japaneseType] ?? japaneseType,
    rarity,
    cost,
    ap,
    bp,
    feature,
    generatedEnergy,
    effect,
    trigger,
    officialUrl: detailUrl,
  };
}

async function main() {
  const rawTsv = await fs.readFile(tsvPath, "utf8");

  const lines = rawTsv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const cache = await readCache();
  const translations =
  await readTranslations();

console.log(
  `读取翻译：${Object.keys(translations).length} 笔`,
);
  const cards = [];
  const usedIds = new Set();

  try {
    await fs.copyFile(outputPath, backupPath);
    console.log("已备份旧资料：data/cards.backup.ts");
  } catch {
    console.log("没有旧资料需要备份。");
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    // 同时支持 Tab 或一般空白分隔。
    const match = line.match(
      /^(.*?)\s+(https?:\/\/\S+)$/,
    );

    if (!match) {
      console.warn(`跳过格式错误：第 ${index + 1} 行`);
      continue;
    }

    const displayFileName = match[1].trim();
    const imageUrl = match[2].trim();

    let parsedUrl;

    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      console.warn(`跳过无效网址：${imageUrl}`);
      continue;
    }

    const rawImageFileName = decodeURIComponent(
      path.basename(parsedUrl.pathname),
    );

    // 排除 SVG、Logo 和非 UA 卡图。
    if (
      !/^UA\d+BT_/i.test(rawImageFileName) ||
      !/\.(png|jpg|jpeg|webp)$/i.test(
        rawImageFileName,
      )
    ) {
      console.log(
        `跳过非卡牌文件：${rawImageFileName}`,
      );
      continue;
    }

    const imageFileName =
      sanitizeFileName(rawImageFileName);

    const baseCode = getBaseCode(imageFileName);

    const officialNumber =
      convertToOfficialNumber(baseCode);

    const name = extractCardName(
      displayFileName,
      baseCode,
    );

    let details = cache[officialNumber];

    if (!details) {
      try {
        console.log(
          `读取 ${officialNumber} 的官方资料……`,
        );

        details =
          await fetchCardDetails(officialNumber);

        cache[officialNumber] = details;
        await saveCache(cache);

        // 减少对官网的连续请求。
        await sleep(350);
      } catch (error) {
        console.warn(
          `读取失败：${officialNumber}`,
          error instanceof Error
            ? error.message
            : error,
        );

        details = {
          series: "无职转生",
          color: "未分类",
          type: "资料待补",
          rarity: "-",
          cost: 0,
          ap: 0,
          bp: "-",
          feature: "-",
          generatedEnergy: "-",
          effect: "卡牌资料整理中。",
          trigger: "-",
          officialUrl: "",
        };
      }
    } else {
      console.log(
        `使用缓存：${officialNumber}`,
      );
    }

    let id = createId(imageFileName, index);

    if (usedIds.has(id)) {
      id = `${id}-${index + 1}`;
    }

    usedIds.add(id);

    const translation =
  translations[officialNumber] ?? {};

cards.push({
  id,
  number: officialNumber,
  name,
  nameZh: translation.nameZh ?? "",
  ...details,
  effectZh: translation.effectZh ?? "",
  triggerZh: translation.triggerZh ?? "",
  variant: getVariant(imageFileName),
  image: `/cards/${imageFileName}`,
});

const typeDefinition = `export type Card = {
  id: string;
  number: string;
  name: string;
  nameZh?: string;
  series: string;
  color: string;
  type: string;
  rarity: string;
  cost: number;
  ap: number;
  bp: string;
  feature: string;
  generatedEnergy: string;
  effect: string;
  effectZh?: string;
  trigger: string;
  triggerZh?: string;
  officialUrl: string;
  variant: string;
  image: string;
};

`;

  const fileContent =
    typeDefinition +
    `export const cards: Card[] = ${JSON.stringify(
      cards,
      null,
      2,
    )};\n`;

  await fs.writeFile(
    outputPath,
    fileContent,
    "utf8",
  );

  await saveCache(cache);

  console.log("");
  console.log(
    `完成：已生成 ${cards.length} 张卡牌资料`,
  );
  console.log(
    "输出位置：data/cards.ts",
  );
}

main().catch((error) => {
  console.error("处理失败：", error);
  process.exitCode = 1;

}