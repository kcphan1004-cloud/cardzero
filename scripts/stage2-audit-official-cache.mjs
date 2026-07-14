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
const OUTPUT_PATH = path.join(
  ROOT,
  "data",
  "stage2",
  "official-cache-audit.json",
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

async function listJsonFiles(directory) {
  try {
    const entries = await fs.readdir(
      directory,
      {
        withFileTypes: true,
      },
    );

    return entries
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.endsWith(".json"),
      )
      .map((entry) =>
        path.join(directory, entry.name),
      );
  } catch {
    return [];
  }
}

async function main() {
  const queue = JSON.parse(
    removeBom(
      await fs.readFile(QUEUE_PATH, "utf8"),
    ),
  );

  const cacheFiles = await listJsonFiles(
    CACHE_DIR,
  );
  const errorFiles = await listJsonFiles(
    ERROR_DIR,
  );

  const cachedNumbers = new Set();
  const cacheBySeries = new Map();
  let invalidCaches = 0;

  for (const filePath of cacheFiles) {
    try {
      const record = JSON.parse(
        removeBom(
          await fs.readFile(
            filePath,
            "utf8",
          ),
        ),
      );

      if (
        record.status !== "complete" ||
        !record.number
      ) {
        invalidCaches += 1;
        continue;
      }

      cachedNumbers.add(
        normalizeNumber(record.number),
      );
    } catch {
      invalidCaches += 1;
    }
  }

  const seriesMap = new Map();

  for (const item of queue) {
    const number = normalizeNumber(
      item.number,
    );
    const cached =
      cachedNumbers.has(number);

    for (
      const slug of item.seriesSlugs ?? []
    ) {
      const current =
        seriesMap.get(slug) ?? {
          slug,
          uniqueNumbers: 0,
          cachedNumbers: 0,
          missingNumbers: [],
        };

      current.uniqueNumbers += 1;

      if (cached) {
        current.cachedNumbers += 1;
      } else {
        current.missingNumbers.push(
          number,
        );
      }

      seriesMap.set(slug, current);
    }
  }

  const series = [
    ...seriesMap.values(),
  ]
    .map((item) => ({
      ...item,
      coverage:
        item.uniqueNumbers > 0
          ? item.cachedNumbers /
            item.uniqueNumbers
          : 0,
    }))
    .sort((a, b) =>
      a.slug.localeCompare(b.slug, "en"),
    );

  const report = {
    generatedAt:
      new Date().toISOString(),
    queueNumbers: queue.length,
    cachedNumbers:
      cachedNumbers.size,
    missingNumbers:
      queue.filter(
        (item) =>
          !cachedNumbers.has(
            normalizeNumber(item.number),
          ),
      ).length,
    errorFiles: errorFiles.length,
    invalidCaches,
    overallCoverage:
      queue.length > 0
        ? cachedNumbers.size /
          queue.length
        : 0,
    series,
  };

  await fs.writeFile(
    OUTPUT_PATH,
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );

  console.log(
    "CardZero 第二阶段缓存检查",
  );
  console.log(
    "========================",
  );
  console.log(
    `队列卡号：${report.queueNumbers}`,
  );
  console.log(
    `已有缓存：${report.cachedNumbers}`,
  );
  console.log(
    `尚未缓存：${report.missingNumbers}`,
  );
  console.log(
    `失败记录：${report.errorFiles}`,
  );
  console.log(
    `整体完成度：${(
      report.overallCoverage * 100
    ).toFixed(2)}%`,
  );
  console.log(
    `报告：${path.relative(ROOT, OUTPUT_PATH)}`,
  );

  console.log("");
  console.log("各系列完成度：");

  for (const item of series) {
    console.log(
      `${item.slug}: ` +
        `${item.cachedNumbers}/${item.uniqueNumbers} ` +
        `(${(item.coverage * 100).toFixed(1)}%)`,
    );
  }
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
