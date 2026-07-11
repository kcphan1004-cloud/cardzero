import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const projectRoot = path.resolve(currentDirectory, "..");

const tsvPath = path.join(projectRoot, "cards.tsv");
const imagesDirectory = path.join(projectRoot, "public", "cards");
const dataDirectory = path.join(projectRoot, "data");
const outputPath = path.join(dataDirectory, "cards.ts");

// 这里改成目前导入的作品名称
const DEFAULT_SERIES = "无职转生";

function removeExtension(fileName) {
  return fileName.replace(/\.(png|jpg|jpeg|webp)$/i, "");
}

function sanitizeFileName(fileName) {
  return fileName
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .trim();
}

function extractCardName(displayFileName, cardNumber) {
  const stem = removeExtension(displayFileName);

  const possiblePrefixes = [
    `${cardNumber}-`,
    `${cardNumber}_`,
  ];

  for (const prefix of possiblePrefixes) {
    if (stem.startsWith(prefix)) {
      return stem.slice(prefix.length).trim();
    }
  }

  const firstDash = stem.indexOf("-");

  if (firstDash !== -1) {
    return stem.slice(firstDash + 1).trim();
  }

  return stem;
}

function createCardId(imageStem, index) {
  const cleaned = imageStem
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || `card-${String(index + 1).padStart(4, "0")}`;
}

async function downloadImage(url, outputFile) {
  try {
    await fs.access(outputFile);
    console.log(`跳过已存在：${path.basename(outputFile)}`);
    return true;
  } catch {
    // 文件不存在，继续下载
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Referer: "https://www.unionarena-tcg.com/",
    },
  });

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} ${response.statusText}`,
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(outputFile, buffer);

  console.log(`下载成功：${path.basename(outputFile)}`);
  return true;
}

async function main() {
  await fs.mkdir(imagesDirectory, { recursive: true });
  await fs.mkdir(dataDirectory, { recursive: true });

  const rawTsv = await fs.readFile(tsvPath, "utf8");

  const lines = rawTsv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const cards = [];
  const usedImages = new Set();
  const usedIds = new Set();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const parts = line.split("\t");

    if (parts.length < 2) {
      console.warn(`跳过格式错误的第 ${index + 1} 行`);
      continue;
    }

    const displayFileName = parts[0].trim();
    const imageUrl = parts.slice(1).join("\t").trim();

    if (!/^https?:\/\//i.test(imageUrl)) {
      console.warn(`跳过无效网址：${imageUrl}`);
      continue;
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      console.warn(`无法解析网址：${imageUrl}`);
      continue;
    }

    // 使用官方图片网址中的真实文件名，
    // 可保留 _p1、_p2 等不同版本。
    const rawImageFileName = decodeURIComponent(
      path.basename(parsedUrl.pathname),
    );
    if (!/\.(png|jpg|jpeg|webp)$/i.test(rawImageFileName)) {
  console.log(`跳过非卡牌图片：${rawImageFileName}`);
  continue;
}

if (!/^UA\d+BT_/i.test(rawImageFileName)) {
  console.log(`跳过非卡牌文件：${rawImageFileName}`);
  continue;
}

    const imageFileName = sanitizeFileName(
      rawImageFileName || `card-${index + 1}.png`,
    );

    if (usedImages.has(imageFileName)) {
      console.log(`跳过重复图片：${imageFileName}`);
      continue;
    }

    usedImages.add(imageFileName);

    const imageStem = removeExtension(imageFileName);

    // 去掉 _p1、_p2 后作为卡牌编号
    const cardNumber = imageStem.replace(/_p\d+$/i, "");

    const cardName =
      extractCardName(displayFileName, cardNumber) ||
      cardNumber;

    let id = createCardId(imageStem, index);

    if (usedIds.has(id)) {
      id = `${id}-${index + 1}`;
    }

    usedIds.add(id);

    const outputFile = path.join(
      imagesDirectory,
      imageFileName,
    );

    try {
      await downloadImage(imageUrl, outputFile);
    } catch (error) {
      console.warn(
        `下载失败：${imageFileName}`,
        error instanceof Error ? error.message : error,
      );

      continue;
    }

    cards.push({
      id,
      number: cardNumber,
      name: cardName,
      series: DEFAULT_SERIES,
      color: "未分类",
      type: "资料待补",
      rarity: "-",
      cost: 0,
      ap: 0,
      bp: 0,
      effect: "卡牌资料整理中。",
      image: `/cards/${imageFileName}`,
    });
  }

  const typeDefinition = `export type Card = {
  id: string;
  number: string;
  name: string;
  series: string;
  color: string;
  type: string;
  rarity: string;
  cost: number;
  ap: number;
  bp: number;
  effect: string;
  image: string;
};

`;

  const fileContent =
    `${typeDefinition}` +
    `export const cards: Card[] = ${JSON.stringify(cards, null, 2)};\n`;

  await fs.writeFile(outputPath, fileContent, "utf8");

  console.log("");
  console.log(`完成：共导入 ${cards.length} 张卡牌`);
  console.log(`卡图位置：${imagesDirectory}`);
  console.log(`资料位置：${outputPath}`);
}

main().catch((error) => {
  console.error("导入失败：", error);
  process.exitCode = 1;
});