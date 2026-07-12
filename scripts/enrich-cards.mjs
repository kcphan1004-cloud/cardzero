import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import * as cheerio from "cheerio";

const projectRoot = process.cwd();

const tsvPath = path.join(
  projectRoot,
  "cards.tsv",
);

const outputPath = path.join(
  projectRoot,
  "data",
  "cards.ts",
);

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

const translationsPath = path.join(
  projectRoot,
  "data",
  "card-translations.json",
);

const REQUEST_DELAY = 350;

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
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function removeBom(text) {
  return String(text).replace(/^\uFEFF/, "");
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeFileName(fileName) {
  return String(fileName)
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .trim();
}

function removeExtension(fileName) {
  return String(fileName).replace(
    /\.(png|jpg|jpeg|webp)$/i,
    "",
  );
}

function escapeRegExp(value) {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

function extractMatch(
  text,
  pattern,
  fallback = "",
) {
  const match = text.match(pattern);

  if (!match?.[1]) {
    return fallback;
  }

  return normalizeText(match[1]);
}

function parseTsvLine(line) {
  const tabIndex = line.indexOf("\t");

  if (tabIndex !== -1) {
    const displayFileName = line
      .slice(0, tabIndex)
      .trim();

    const imageUrl = line
      .slice(tabIndex + 1)
      .trim();

    return {
      displayFileName,
      imageUrl,
    };
  }

  const match = line.match(
    /^(.*?)\s+(https?:\/\/\S+)$/,
  );

  if (!match) {
    return null;
  }

  return {
    displayFileName: match[1].trim(),
    imageUrl: match[2].trim(),
  };
}

function isCardImage(fileName) {
  return (
    /^UA[A-Z0-9]*_/i.test(fileName) &&
    /\.(png|jpg|jpeg|webp)$/i.test(fileName)
  );
}

function getBaseCode(imageFileName) {
  return removeExtension(imageFileName).replace(
    /_p\d+$/i,
    "",
  );
}

function convertToOfficialNumber(baseCode) {
  const separatorIndex =
    baseCode.indexOf("_");

  if (separatorIndex === -1) {
    return baseCode;
  }

  return (
    baseCode.slice(0, separatorIndex) +
    "/" +
    baseCode.slice(separatorIndex + 1)
  );
}

function extractCardName(
  displayFileName,
  baseCode,
) {
  const stem = removeExtension(
    displayFileName,
  );

  const possiblePrefixes = [
    `${baseCode}-`,
    `${baseCode}_`,
  ];

  for (const prefix of possiblePrefixes) {
    if (stem.startsWith(prefix)) {
      return stem
        .slice(prefix.length)
        .trim();
    }
  }

  const firstDash = stem.indexOf("-");

  if (firstDash !== -1) {
    const possibleName = stem
      .slice(firstDash + 1)
      .trim();

    if (possibleName) {
      return possibleName;
    }
  }

  return stem;
}

function getVariant(imageFileName) {
  const match = removeExtension(
    imageFileName,
  ).match(/_p(\d+)$/i);

  if (!match) {
    return "普通版";
  }

  return `异图版 ${match[1]}`;
}

function createId(imageFileName, index) {
  const stem = removeExtension(
    imageFileName,
  );

  const cleaned = stem
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (cleaned) {
    return cleaned;
  }

  return `card-${String(index + 1).padStart(
    4,
    "0",
  )}`;
}

async function readJsonFile(
  filePath,
  fallbackValue,
) {
  try {
    const raw = removeBom(
      await fs.readFile(filePath, "utf8"),
    ).trim();

    if (!raw) {
      return fallbackValue;
    }

    return JSON.parse(raw);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return fallbackValue;
    }

    throw new Error(
      `无法读取 ${path.basename(filePath)}：${
        error instanceof Error
          ? error.message
          : String(error)
      }`,
    );
  }
}

async function saveJsonFile(
  filePath,
  value,
) {
  const content =
    JSON.stringify(value, null, 2) + "\n";

  await fs.writeFile(
    filePath,
    content,
    "utf8",
  );
}

function createFallbackDetails(
  officialNumber,
) {
  return {
    series: "无职转生",
    color: "未分类",
    type: "资料待补",
    rarity: "-",
    cost: 0,
    ap: 0,
    bp: "-",
    feature: "-",
    generatedEnergy: "-",
    effect: "卡牌效果整理中。",
    trigger: "-",
    officialUrl:
      "https://www.unionarena-tcg.com/jp/cardlist/" +
      "detail_iframe.php?card_no=" +
      encodeURIComponent(officialNumber),
  };
}

async function fetchCardDetails(
  officialNumber,
) {
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

  // 把图片 alt 文字转换为一般文字，
  // 例如 Raid、Trigger、Draw 等图标。
  $("img[alt]").each((_, element) => {
    const alt = normalizeText(
      $(element).attr("alt"),
    );

    if (alt) {
      $(element).replaceWith(` ${alt} `);
    }
  });

  const bodyText = normalizeText(
    $("body").text(),
  );

  const rarityPattern = new RegExp(
    `${escapeRegExp(
      officialNumber,
    )}\\s+([A-Z]+)\\b`,
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

  const japaneseColor =
    energyMatch?.[1] ?? "";

  const cost = Number(
    energyMatch?.[2] ?? 0,
  );

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
    /発生\s*エナジー\s*(.*?)\s*(?:効果|トリガー|収録商品)/,
    "-",
  );

  const effect = extractMatch(
    bodyText,
    /効果\s*(.*?)\s*トリガー/,
    "卡牌效果整理中。",
  );

  const trigger = extractMatch(
    bodyText,
    /トリガー\s*(.*?)\s*(?:収録商品|カードリスト|$)/,
    "-",
  );

  const series = extractMatch(
    bodyText,
    /収録商品\s*(.*?)\s*(?:カードリスト|$)/,
    "无职转生",
  );

  return {
    series,
    color:
      COLOR_MAP[japaneseColor] ??
      "未分类",
    type:
      TYPE_MAP[japaneseType] ??
      japaneseType,
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

async function backupOldCardsFile() {
  try {
    await fs.copyFile(
      outputPath,
      backupPath,
    );

    console.log(
      "已备份旧资料：data/cards.backup.ts",
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      console.log(
        "没有旧的 cards.ts 需要备份。",
      );

      return;
    }

    throw error;
  }
}

async function main() {
  console.log(
    "CardZero 卡牌资料整理开始",
  );
  console.log("");

  const rawTsv = removeBom(
    await fs.readFile(tsvPath, "utf8"),
  );

  const lines = rawTsv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const cache = await readJsonFile(
    cachePath,
    {},
  );

  const translations =
    await readJsonFile(
      translationsPath,
      {},
    );

  console.log(
    `读取缓存：${Object.keys(cache).length} 笔`,
  );

  console.log(
    `读取翻译：${
      Object.keys(translations).length
    } 笔`,
  );

  console.log("");

  await backupOldCardsFile();

  const cards = [];
  const usedIds = new Set();
  const usedImages = new Set();

  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    const parsedLine =
      parseTsvLine(lines[index]);

    if (!parsedLine) {
      console.warn(
        `跳过格式错误：第 ${
          index + 1
        } 行`,
      );

      continue;
    }

    const {
      displayFileName,
      imageUrl,
    } = parsedLine;

    let parsedUrl;

    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      console.warn(
        `跳过无效网址：${imageUrl}`,
      );

      continue;
    }

    const rawImageFileName =
      decodeURIComponent(
        path.basename(
          parsedUrl.pathname,
        ),
      );

    if (
      !isCardImage(rawImageFileName)
    ) {
      console.log(
        `跳过非卡牌文件：${rawImageFileName}`,
      );

      continue;
    }

    const imageFileName =
      sanitizeFileName(
        rawImageFileName,
      );

    if (
      usedImages.has(imageFileName)
    ) {
      console.log(
        `跳过重复图片：${imageFileName}`,
      );

      continue;
    }

    usedImages.add(imageFileName);

    const baseCode =
      getBaseCode(imageFileName);

    const officialNumber =
      convertToOfficialNumber(
        baseCode,
      );

    const name = extractCardName(
      displayFileName,
      baseCode,
    );

    let details = cache[
      officialNumber
    ];

    if (details) {
      console.log(
        `使用缓存：${officialNumber}`,
      );
    } else {
      try {
        console.log(
          `读取官方资料：${officialNumber}`,
        );

        details =
          await fetchCardDetails(
            officialNumber,
          );

        cache[officialNumber] =
          details;

        // 每成功读取一张就储存，
        // 中途停止不会丢失已完成资料。
        await saveJsonFile(
          cachePath,
          cache,
        );

        await sleep(REQUEST_DELAY);
      } catch (error) {
        console.warn(
          `读取失败：${officialNumber}：${
            error instanceof Error
              ? error.message
              : String(error)
          }`,
        );

        details =
          createFallbackDetails(
            officialNumber,
          );
      }
    }

    const translation =
      translations[
        officialNumber
      ] ?? {};

    let id = createId(
      imageFileName,
      index,
    );

    if (usedIds.has(id)) {
      id = `${id}-${index + 1}`;
    }

    usedIds.add(id);

    cards.push({
      id,
      number: officialNumber,
      name,

      nameZh: String(
        translation.nameZh ?? "",
      ),

      series: String(
        details.series ??
          "无职转生",
      ),

      color: String(
        details.color ??
          "未分类",
      ),

      type: String(
        details.type ??
          "资料待补",
      ),

      rarity: String(
        details.rarity ?? "-",
      ),

      cost: Number(
        details.cost ?? 0,
      ),

      ap: Number(
        details.ap ?? 0,
      ),

      bp: String(
        details.bp ?? "-",
      ),

      feature: String(
        details.feature ?? "-",
      ),

      generatedEnergy: String(
        details.generatedEnergy ??
          "-",
      ),

      effect: String(
        details.effect ??
          "卡牌效果整理中。",
      ),

      effectZh: String(
        translation.effectZh ?? "",
      ),

      trigger: String(
        details.trigger ?? "-",
      ),

      triggerZh: String(
        translation.triggerZh ?? "",
      ),

      officialUrl: String(
        details.officialUrl ?? "",
      ),

      variant:
        getVariant(imageFileName),

      image:
        `/cards/${imageFileName}`,
    });
  }

  const typeDefinition = `export type Card = {
  id: string;
  number: string;
  name: string;
  nameZh: string;
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
  effectZh: string;
  trigger: string;
  triggerZh: string;
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

  await saveJsonFile(
    cachePath,
    cache,
  );

  const translatedCards =
    cards.filter(
      (card) =>
        card.nameZh ||
        card.effectZh ||
        card.triggerZh,
    ).length;

  console.log("");
  console.log(
    "==============================",
  );

  console.log(
    `完成：已生成 ${cards.length} 张卡牌资料`,
  );

  console.log(
    `包含翻译：${translatedCards} 张`,
  );

  console.log(
    "输出位置：data/cards.ts",
  );

  console.log(
    "==============================",
  );
}

main().catch((error) => {
  console.error(
    "处理失败：",
    error instanceof Error
      ? error.message
      : error,
  );

  process.exitCode = 1;
});