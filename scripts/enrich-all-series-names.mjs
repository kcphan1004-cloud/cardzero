import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const MANIFEST_ROOT = path.join(ROOT, "data", "download-manifests");
const SERIES_ROOT = path.join(ROOT, "data", "card-series-generated");
const BACKUP_ROOT = path.join(ROOT, "data", "card-series-backups");
const REPORT_PATH = path.join(
  ROOT,
  "data",
  "all-series-name-enrichment-report.json",
);

function removeBom(value) {
  return String(value ?? "").replace(/^\uFEFF/, "");
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePath(value) {
  return normalizeText(value)
    .replace(/\\/g, "/");
}

function normalizeNumber(value) {
  return normalizeText(value)
    .replace(/\\/g, "/")
    .replace(/_/g, "/")
    .toUpperCase();
}

function parseAltText(alt) {
  const cleaned = normalizeText(alt);

  const match = cleaned.match(
    /^((?:UA|EX|PC|PR|UAPR)[A-Z0-9-]*\/[A-Z0-9-]+)\s+(.+)$/i,
  );

  if (!match) {
    return null;
  }

  return {
    number: normalizeNumber(match[1]),
    name: normalizeText(match[2]),
  };
}

async function readJson(filePath) {
  const raw = removeBom(await fs.readFile(filePath, "utf8")).trim();

  if (!raw) {
    throw new Error(`${path.relative(ROOT, filePath)} 是空文件。`);
  }

  return JSON.parse(raw);
}

function extractImages(manifest) {
  if (Array.isArray(manifest)) {
    return manifest;
  }

  if (Array.isArray(manifest?.images)) {
    return manifest.images;
  }

  return [];
}

function readCardArrayFromTypeScript(raw, fileName) {
  const exportPosition = raw.indexOf("export const");

  if (exportPosition === -1) {
    throw new Error(`${fileName} 找不到 export const。`);
  }

  const assignmentPosition = raw.indexOf("=", exportPosition);

  if (assignmentPosition === -1) {
    throw new Error(`${fileName} 找不到阵列赋值符号。`);
  }

  const arrayStart = raw.indexOf("[", assignmentPosition);
  const arrayEndMarker = raw.lastIndexOf("];");

  if (
    arrayStart === -1 ||
    arrayEndMarker === -1 ||
    arrayEndMarker < arrayStart
  ) {
    throw new Error(`${fileName} 的阵列格式无法识别。`);
  }

  const cards = JSON.parse(
    raw.slice(arrayStart, arrayEndMarker + 1),
  );

  if (!Array.isArray(cards)) {
    throw new Error(`${fileName} 的资料不是阵列。`);
  }

  return {
    cards,
    arrayStart,
    arrayEnd: arrayEndMarker,
  };
}

async function loadManifestIndex() {
  const entries = await fs.readdir(MANIFEST_ROOT, {
    withFileTypes: true,
  });

  const manifestFiles = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".images.json"),
    )
    .map((entry) => path.join(MANIFEST_ROOT, entry.name));

  const byImage = new Map();
  const byNumber = new Map();
  const unparsed = [];
  let imageRecords = 0;

  for (const manifestPath of manifestFiles) {
    const manifest = await readJson(manifestPath);
    const images = extractImages(manifest);

    for (const image of images) {
      imageRecords += 1;

      const parsed = parseAltText(image?.alt);

      if (!parsed) {
        unparsed.push({
          manifest: path.basename(manifestPath),
          alt: normalizeText(image?.alt),
          localPath: normalizePath(image?.localPath),
        });
        continue;
      }

      const localPath = normalizePath(image?.localPath);

      if (localPath) {
        byImage.set(localPath, parsed);
      }

      if (!byNumber.has(parsed.number)) {
        byNumber.set(parsed.number, parsed);
      }
    }
  }

  return {
    manifestFiles,
    imageRecords,
    byImage,
    byNumber,
    unparsed,
  };
}

async function main() {
  console.log("CardZero 全系列卡名快速补全工具");
  console.log("================================");

  const manifestIndex = await loadManifestIndex();

  console.log(
    `读取 ${manifestIndex.manifestFiles.length} 个 manifest，` +
      `${manifestIndex.imageRecords} 笔卡图记录。`,
  );

  const entries = await fs.readdir(SERIES_ROOT, {
    withFileTypes: true,
  });

  const seriesFiles = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".ts") &&
        ![
          "index.ts",
          "types.ts",
        ].includes(entry.name) &&
        !entry.name.includes(".before-"),
    )
    .map((entry) => path.join(SERIES_ROOT, entry.name))
    .sort((a, b) => a.localeCompare(b, "en"));

  await fs.mkdir(BACKUP_ROOT, {
    recursive: true,
  });

  const seriesReports = [];
  let totalRows = 0;
  let totalUpdated = 0;
  let totalAlreadyNamed = 0;
  let totalUnmatched = 0;

  for (const filePath of seriesFiles) {
    const fileName = path.basename(filePath);
    const raw = removeBom(await fs.readFile(filePath, "utf8"));

    const {
      cards,
      arrayStart,
      arrayEnd,
    } = readCardArrayFromTypeScript(raw, fileName);

    const backupPath = path.join(BACKUP_ROOT, fileName);

    try {
      await fs.access(backupPath);
    } catch {
      await fs.writeFile(backupPath, raw, "utf8");
    }

    let updated = 0;
    let alreadyNamed = 0;
    let unmatched = 0;

    const updatedCards = cards.map((card) => {
      totalRows += 1;

      if (
        card.name &&
        card.name !== "资料待补"
      ) {
        alreadyNamed += 1;
        totalAlreadyNamed += 1;
        return card;
      }

      const imagePath = normalizePath(card.image);
      const number = normalizeNumber(card.number);

      const source =
        manifestIndex.byImage.get(imagePath) ||
        manifestIndex.byNumber.get(number);

      if (!source) {
        unmatched += 1;
        totalUnmatched += 1;
        return card;
      }

      updated += 1;
      totalUpdated += 1;

      return {
        ...card,
        number: source.number || card.number,
        name: source.name || card.name,
      };
    });

    if (updated > 0) {
      const updatedRaw =
        raw.slice(0, arrayStart) +
        JSON.stringify(updatedCards, null, 2) +
        raw.slice(arrayEnd + 1);

      await fs.writeFile(filePath, updatedRaw, "utf8");
    }

    seriesReports.push({
      file: fileName,
      rows: cards.length,
      updated,
      alreadyNamed,
      unmatched,
    });

    console.log(
      `${fileName}: 更新 ${updated}，已有名称 ${alreadyNamed}，未匹配 ${unmatched}`,
    );
  }

  const report = {
    generatedAt: new Date().toISOString(),
    manifestFiles: manifestIndex.manifestFiles.length,
    manifestImageRecords: manifestIndex.imageRecords,
    seriesFiles: seriesFiles.length,
    totalRows,
    totalUpdated,
    totalAlreadyNamed,
    totalUnmatched,
    unparsedAltCount: manifestIndex.unparsed.length,
    series: seriesReports,
    unparsedAlt: manifestIndex.unparsed,
    note:
      "本工具只补入卡号与日文卡名，不会修改颜色、费用、AP、BP、效果、翻译或图片路径。",
  };

  await fs.writeFile(
    REPORT_PATH,
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );

  console.log("");
  console.log("================================");
  console.log(`系列档案：${seriesFiles.length}`);
  console.log(`总记录：${totalRows}`);
  console.log(`本次补名：${totalUpdated}`);
  console.log(`原本已有名称：${totalAlreadyNamed}`);
  console.log(`未匹配：${totalUnmatched}`);
  console.log(`报告：${path.relative(ROOT, REPORT_PATH)}`);
  console.log(`备份：${path.relative(ROOT, BACKUP_ROOT)}`);
}

main().catch((error) => {
  console.error("");
  console.error(
    "执行失败：",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
