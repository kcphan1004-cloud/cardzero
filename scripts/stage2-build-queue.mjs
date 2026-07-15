import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const SERIES_DIR = path.join(
  ROOT,
  "data",
  "card-series-generated",
);
const OUTPUT_DIR = path.join(ROOT, "data", "stage2");
const QUEUE_PATH = path.join(
  OUTPUT_DIR,
  "card-detail-queue.json",
);
const SUMMARY_PATH = path.join(
  OUTPUT_DIR,
  "card-detail-summary.json",
);

function removeBom(value) {
  return String(value ?? "").replace(/^\uFEFF/, "");
}

function normalizeNumber(value) {
  return String(value ?? "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/_/g, "/")
    .toUpperCase();
}

function readCardArray(raw, fileName) {
  const exportPosition = raw.indexOf("export const");

  if (exportPosition === -1) {
    throw new Error(`${fileName} 找不到 export const。`);
  }

  const assignmentPosition = raw.indexOf(
    "=",
    exportPosition,
  );

  if (assignmentPosition === -1) {
    throw new Error(`${fileName} 找不到阵列赋值符号。`);
  }

  const arrayStart = raw.indexOf("[", assignmentPosition);
  const arrayEnd = raw.lastIndexOf("];");

  if (
    arrayStart === -1 ||
    arrayEnd === -1 ||
    arrayEnd < arrayStart
  ) {
    throw new Error(`${fileName} 的卡牌阵列无法识别。`);
  }

  const cards = JSON.parse(
    raw.slice(arrayStart, arrayEnd + 1),
  );

  if (!Array.isArray(cards)) {
    throw new Error(`${fileName} 不是卡牌阵列。`);
  }

  return cards;
}

async function main() {
  console.log("CardZero 第二阶段：建立全系列详细资料队列");
  console.log("========================================");

  const entries = await fs.readdir(SERIES_DIR, {
    withFileTypes: true,
  });

  const files = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".ts") &&
        !["index.ts", "types.ts"].includes(entry.name) &&
        !entry.name.includes(".before-"),
    )
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "en"));

  const uniqueCards = new Map();
  const seriesSummary = [];
  let totalRows = 0;

  for (const fileName of files) {
    const filePath = path.join(SERIES_DIR, fileName);
    const raw = removeBom(
      await fs.readFile(filePath, "utf8"),
    );
    const cards = readCardArray(raw, fileName);
    const slug = fileName.replace(/\.ts$/i, "");

    totalRows += cards.length;

    const numbersInSeries = new Set();

    for (const card of cards) {
      const number = normalizeNumber(card.number);

      if (!number) {
        continue;
      }

      numbersInSeries.add(number);

      const existing = uniqueCards.get(number);

      if (existing) {
        existing.seriesSlugs.add(slug);
        existing.seriesNames.add(
          String(card.series ?? "").trim(),
        );
        existing.variants.add(
          String(card.variant ?? "").trim(),
        );
        existing.images.add(
          String(card.image ?? "").trim(),
        );
        continue;
      }

      uniqueCards.set(number, {
        number,
        name: String(card.name ?? "").trim(),
        seriesSlugs: new Set([slug]),
        seriesNames: new Set([
          String(card.series ?? "").trim(),
        ]),
        variants: new Set([
          String(card.variant ?? "").trim(),
        ]),
        images: new Set([
          String(card.image ?? "").trim(),
        ]),
        isActionPoint: /-AP\d+$/i.test(number),
        current: {
          color: card.color ?? "",
          type: card.type ?? "",
          rarity: card.rarity ?? "",
          cost: card.cost ?? 0,
          ap: card.ap ?? 0,
          bp: card.bp ?? "",
          feature: card.feature ?? "",
          generatedEnergy: card.generatedEnergy ?? "",
          effect: card.effect ?? "",
          trigger: card.trigger ?? "",
        },
      });
    }

    seriesSummary.push({
      slug,
      file: fileName,
      rows: cards.length,
      uniqueNumbers: numbersInSeries.size,
    });
  }

  const queue = [...uniqueCards.values()]
    .map((item) => ({
      ...item,
      seriesSlugs: [...item.seriesSlugs].filter(Boolean),
      seriesNames: [...item.seriesNames].filter(Boolean),
      variants: [...item.variants].filter(Boolean),
      images: [...item.images].filter(Boolean),
    }))
    .sort((a, b) =>
      a.number.localeCompare(b.number, "en"),
    );

  const summary = {
    generatedAt: new Date().toISOString(),
    seriesFiles: files.length,
    totalRows,
    uniqueCardNumbers: queue.length,
    actionPointNumbers: queue.filter(
      (item) => item.isActionPoint,
    ).length,
    regularCardNumbers: queue.filter(
      (item) => !item.isActionPoint,
    ).length,
    series: seriesSummary,
  };

  await fs.mkdir(OUTPUT_DIR, {
    recursive: true,
  });

  await fs.writeFile(
    QUEUE_PATH,
    `${JSON.stringify(queue, null, 2)}\n`,
    "utf8",
  );

  await fs.writeFile(
    SUMMARY_PATH,
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );

  console.log(`系列档案：${files.length}`);
  console.log(`卡图记录：${totalRows}`);
  console.log(`独立卡号：${queue.length}`);
  console.log(
    `普通卡号：${summary.regularCardNumbers}`,
  );
  console.log(
    `行动点卡号：${summary.actionPointNumbers}`,
  );
  console.log(
    `队列：${path.relative(ROOT, QUEUE_PATH)}`,
  );
  console.log(
    `摘要：${path.relative(ROOT, SUMMARY_PATH)}`,
  );
}

main().catch((error) => {
  console.error("");
  console.error(
    "执行失败：",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
