import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const SERIES_DIR = path.join(
  ROOT,
  "data",
  "card-series-generated",
);
const CACHE_DIR = path.join(
  ROOT,
  "data",
  "stage2",
  "official-cache",
);
const BACKUP_DIR = path.join(
  ROOT,
  "data",
  "stage2",
  "backups",
  "card-series-generated",
);
const REPORT_DIR = path.join(
  ROOT,
  "data",
  "stage2",
  "reports",
);

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
  const exportPosition = raw.indexOf(
    "export const",
  );

  if (exportPosition === -1) {
    throw new Error(
      `${fileName} 找不到 export const。`,
    );
  }

  const assignmentPosition = raw.indexOf(
    "=",
    exportPosition,
  );

  if (assignmentPosition === -1) {
    throw new Error(
      `${fileName} 找不到阵列赋值符号。`,
    );
  }

  const arrayStart = raw.indexOf(
    "[",
    assignmentPosition,
  );
  const arrayEnd = raw.lastIndexOf("];");

  if (
    arrayStart === -1 ||
    arrayEnd === -1 ||
    arrayEnd < arrayStart
  ) {
    throw new Error(
      `${fileName} 的卡牌阵列无法识别。`,
    );
  }

  const cards = JSON.parse(
    raw.slice(arrayStart, arrayEnd + 1),
  );

  if (!Array.isArray(cards)) {
    throw new Error(
      `${fileName} 不是卡牌阵列。`,
    );
  }

  return {
    cards,
    arrayStart,
    arrayEnd,
  };
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

function usefulCacheRecord(value) {
  return Boolean(
    value &&
      value.status === "complete" &&
      value.number &&
      value.type &&
      value.parseVersion >= 1,
  );
}

function makeActionPointUpdate(card) {
  return {
    ...card,
    color: "-",
    type: "行动点卡",
    rarity: "AP",
    cost: 0,
    ap: 0,
    bp: "-",
    feature: "-",
    generatedEnergy: "-",
    effect: "",
    trigger: "",
  };
}

function mergeDetail(card, detail) {
  const effect =
    detail.effect === "-"
      ? ""
      : detail.effect ?? card.effect;
  const trigger =
    detail.trigger === "-"
      ? ""
      : detail.trigger ?? card.trigger;

  return {
    ...card,
    name:
      !card.name ||
      card.name === "资料待补"
        ? detail.name || card.name
        : card.name,
    color:
      detail.color || card.color,
    type:
      detail.type || card.type,
    rarity:
      detail.rarity || card.rarity,
    cost:
      Number.isFinite(detail.cost)
        ? detail.cost
        : card.cost,
    ap:
      Number.isFinite(detail.ap)
        ? detail.ap
        : card.ap,
    bp:
      detail.bp || card.bp,
    feature:
      detail.feature || card.feature,
    generatedEnergy:
      detail.generatedEnergy ||
      card.generatedEnergy,
    effect,
    trigger,
    officialUrl:
      detail.officialDetailUrl ||
      card.officialUrl,
  };
}

async function main() {
  const seriesArgument = getArg(
    "series",
    "black-clover",
  );
  const dryRun = parseBoolean(
    getArg("dry-run", "false"),
  );

  console.log(
    "CardZero 第二阶段：合并日本官方卡牌详情",
  );
  console.log(
    "======================================",
  );
  console.log(`系列：${seriesArgument}`);
  console.log(`只检查不写入：${dryRun ? "是" : "否"}`);

  const cacheEntries = await fs.readdir(
    CACHE_DIR,
    {
      withFileTypes: true,
    },
  );

  const detailsByNumber = new Map();
  let invalidCacheFiles = 0;

  for (const entry of cacheEntries) {
    if (
      !entry.isFile() ||
      !entry.name.endsWith(".json")
    ) {
      continue;
    }

    try {
      const record = JSON.parse(
        removeBom(
          await fs.readFile(
            path.join(CACHE_DIR, entry.name),
            "utf8",
          ),
        ),
      );

      if (!usefulCacheRecord(record)) {
        invalidCacheFiles += 1;
        continue;
      }

      detailsByNumber.set(
        normalizeNumber(record.number),
        record,
      );
    } catch {
      invalidCacheFiles += 1;
    }
  }

  const requestedSeries = new Set(
    seriesArgument
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );

  const seriesEntries = await fs.readdir(
    SERIES_DIR,
    {
      withFileTypes: true,
    },
  );

  const seriesFiles = seriesEntries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".ts") &&
        !["index.ts", "types.ts"].includes(entry.name) &&
        !entry.name.includes(".before-"),
    )
    .map((entry) => entry.name)
    .filter((fileName) => {
      const slug = fileName.replace(
        /\.ts$/i,
        "",
      );

      return (
        requestedSeries.has("all") ||
        requestedSeries.size === 0 ||
        requestedSeries.has(slug)
      );
    })
    .sort((a, b) =>
      a.localeCompare(b, "en"),
    );

  if (seriesFiles.length === 0) {
    throw new Error(
      `找不到系列：${seriesArgument}`,
    );
  }

  await fs.mkdir(BACKUP_DIR, {
    recursive: true,
  });
  await fs.mkdir(REPORT_DIR, {
    recursive: true,
  });

  const reports = [];
  let totalRows = 0;
  let matchedRows = 0;
  let unmatchedRows = 0;
  let changedFiles = 0;

  for (const fileName of seriesFiles) {
    const filePath = path.join(
      SERIES_DIR,
      fileName,
    );
    const raw = removeBom(
      await fs.readFile(filePath, "utf8"),
    );
    const {
      cards,
      arrayStart,
      arrayEnd,
    } = readCardArray(raw, fileName);

    let matched = 0;
    let unmatched = 0;
    let changedRows = 0;
    const unmatchedNumbers = [];

    const updatedCards = cards.map((card) => {
      totalRows += 1;

      const number = normalizeNumber(
        card.number,
      );

      if (/-AP\d+$/i.test(number)) {
        matched += 1;
        matchedRows += 1;

        const updated =
          makeActionPointUpdate(card);

        if (
          JSON.stringify(updated) !==
          JSON.stringify(card)
        ) {
          changedRows += 1;
        }

        return updated;
      }

      const detail =
        detailsByNumber.get(number);

      if (!detail) {
        unmatched += 1;
        unmatchedRows += 1;
        unmatchedNumbers.push(number);
        return card;
      }

      matched += 1;
      matchedRows += 1;

      const updated = mergeDetail(
        card,
        detail,
      );

      if (
        JSON.stringify(updated) !==
        JSON.stringify(card)
      ) {
        changedRows += 1;
      }

      return updated;
    });

    const coverage =
      cards.length > 0
        ? matched / cards.length
        : 0;

    reports.push({
      file: fileName,
      rows: cards.length,
      matched,
      unmatched,
      changedRows,
      coverage,
      unmatchedNumbers: [
        ...new Set(unmatchedNumbers),
      ],
    });

    console.log(
      `${fileName}: 匹配 ${matched}/${cards.length}，` +
        `改变 ${changedRows}，未匹配 ${unmatched}`,
    );

    if (
      !dryRun &&
      changedRows > 0
    ) {
      const backupPath = path.join(
        BACKUP_DIR,
        fileName,
      );

      try {
        await fs.access(backupPath);
      } catch {
        await fs.writeFile(
          backupPath,
          raw,
          "utf8",
        );
      }

      const updatedRaw =
        raw.slice(0, arrayStart) +
        JSON.stringify(
          updatedCards,
          null,
          2,
        ) +
        raw.slice(arrayEnd + 1);

      await fs.writeFile(
        filePath,
        updatedRaw,
        "utf8",
      );

      changedFiles += 1;
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    seriesArgument,
    dryRun,
    cacheRecords:
      detailsByNumber.size,
    invalidCacheFiles,
    seriesFiles:
      seriesFiles.length,
    totalRows,
    matchedRows,
    unmatchedRows,
    changedFiles,
    series: reports,
  };

  const reportPath = path.join(
    REPORT_DIR,
    `apply-${seriesArgument.replace(/[^a-z0-9_-]+/gi, "_")}-${Date.now()}.json`,
  );

  await writeJsonAtomic(
    reportPath,
    report,
  );

  console.log("");
  console.log(
    "======================================",
  );
  console.log(
    `缓存卡号：${detailsByNumber.size}`,
  );
  console.log(
    `成功匹配：${matchedRows}/${totalRows}`,
  );
  console.log(
    `未匹配：${unmatchedRows}`,
  );
  console.log(
    `写入档案：${dryRun ? 0 : changedFiles}`,
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
