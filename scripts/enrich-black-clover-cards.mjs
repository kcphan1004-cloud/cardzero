import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();

const MANIFEST_DIR = path.join(
  ROOT,
  "data",
  "download-manifests",
);

const RAW_OUTPUT_PATH = path.join(
  ROOT,
  "data",
  "raw-card-data",
  "black-clover.json",
);

const CARD_TABLE_PATH = path.join(
  ROOT,
  "data",
  "card-series-generated",
  "black-clover.ts",
);

const BACKUP_PATH = path.join(
  ROOT,
  "data",
  "card-series-generated",
  "black-clover.before-name-enrichment.ts",
);

const REPORT_PATH = path.join(
  ROOT,
  "data",
  "raw-card-data",
  "black-clover-enrichment-report.json",
);

const POSSIBLE_MANIFEST_NAMES = [
  "black-clover.images.json",
  "black-clover-2.images.json",
  "black-clover-3.images.json",
];

function removeBom(value) {
  return String(value ?? "").replace(/^\uFEFF/, "");
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCardNumber(value) {
  return normalizeText(value)
    .replace(/\\/g, "/")
    .replace(/_/g, "/")
    .toUpperCase();
}

function parseAltText(alt) {
  const cleaned = normalizeText(alt);

  // 官方卡图 alt 常见格式：
  // UA20BT/BCV-1-001 メギキュラ
  // UA20ST/BCV-1-AP01 アクションポイントカード(ブラッククローバー)
  const match = cleaned.match(
    /^((?:UA|EX|PC|PR|UAPR)[A-Z0-9-]*\/[A-Z0-9-]+)\s+(.+)$/i,
  );

  if (!match) {
    return null;
  }

  return {
    number: normalizeCardNumber(match[1]),
    name: normalizeText(match[2]),
  };
}

async function readJson(filePath) {
  const raw = removeBom(
    await fs.readFile(filePath, "utf8"),
  ).trim();

  if (!raw) {
    throw new Error(
      `${path.relative(ROOT, filePath)} 是空文件。`,
    );
  }

  return JSON.parse(raw);
}

async function findManifestFiles() {
  const found = [];

  for (const fileName of POSSIBLE_MANIFEST_NAMES) {
    const filePath = path.join(
      MANIFEST_DIR,
      fileName,
    );

    try {
      const stats = await fs.stat(filePath);

      if (stats.isFile() && stats.size > 0) {
        found.push(filePath);
      }
    } catch {
      // 这个候选档案不存在时继续检查下一个。
    }
  }

  // 兼容资料夹名称以后有变化的情况。
  if (found.length === 0) {
    const entries = await fs.readdir(
      MANIFEST_DIR,
      { withFileTypes: true },
    );

    for (const entry of entries) {
      if (
        entry.isFile() &&
        /black[-_ ]?clover.*\.images\.json$/i.test(
          entry.name,
        )
      ) {
        found.push(
          path.join(
            MANIFEST_DIR,
            entry.name,
          ),
        );
      }
    }
  }

  return [...new Set(found)];
}

function extractImagesFromManifest(manifest) {
  if (Array.isArray(manifest)) {
    return manifest;
  }

  if (Array.isArray(manifest?.images)) {
    return manifest.images;
  }

  return [];
}

function readCardArrayFromTypeScript(raw) {
  const exportPosition = raw.indexOf(
    "export const",
  );

  if (exportPosition === -1) {
    throw new Error(
      "black-clover.ts 内找不到 export const。",
    );
  }

  const arrayStart = raw.indexOf(
    "[",
    exportPosition,
  );

  const arrayEndMarker = raw.lastIndexOf(
    "];",
  );

  if (
    arrayStart === -1 ||
    arrayEndMarker === -1 ||
    arrayEndMarker < arrayStart
  ) {
    throw new Error(
      "black-clover.ts 的卡牌阵列格式无法识别。",
    );
  }

  const jsonText = raw.slice(
    arrayStart,
    arrayEndMarker + 1,
  );

  const cards = JSON.parse(jsonText);

  if (!Array.isArray(cards)) {
    throw new Error(
      "black-clover.ts 的资料不是阵列。",
    );
  }

  return {
    cards,
    arrayStart,
    arrayEnd: arrayEndMarker,
  };
}

async function main() {
  console.log(
    "CardZero 黑色五叶草卡名补全工具",
  );
  console.log(
    "================================",
  );

  const manifestFiles =
    await findManifestFiles();

  if (manifestFiles.length === 0) {
    throw new Error(
      [
        "找不到黑色五叶草下载清单。",
        "请确认以下档案至少存在一个：",
        "data/download-manifests/black-clover.images.json",
        "data/download-manifests/black-clover-2.images.json",
      ].join("\n"),
    );
  }

  console.log("找到下载清单：");

  for (const filePath of manifestFiles) {
    console.log(
      `- ${path.relative(ROOT, filePath)}`,
    );
  }

  const cardMap = new Map();
  const unparsedAlt = [];

  for (const manifestPath of manifestFiles) {
    const manifest =
      await readJson(manifestPath);

    const images =
      extractImagesFromManifest(manifest);

    const pageUrl =
      normalizeText(manifest?.pageUrl);

    for (const image of images) {
      const parsed = parseAltText(
        image?.alt,
      );

      if (!parsed) {
        unparsedAlt.push({
          manifest:
            path.basename(manifestPath),
          alt: normalizeText(image?.alt),
          localPath: normalizeText(
            image?.localPath,
          ),
        });
        continue;
      }

      const existing =
        cardMap.get(parsed.number) ?? {
          number: parsed.number,
          name: parsed.name,
          nameZh: "",
          series: "黑色五叶草",
          product:
            parsed.number.split("/")[0] ??
            "",
          officialUrl: pageUrl,
          images: [],
        };

      if (
        !existing.name ||
        existing.name === "资料待补"
      ) {
        existing.name = parsed.name;
      }

      const localPath = normalizeText(
        image?.localPath,
      );

      if (
        localPath &&
        !existing.images.includes(localPath)
      ) {
        existing.images.push(localPath);
      }

      if (!existing.officialUrl && pageUrl) {
        existing.officialUrl = pageUrl;
      }

      cardMap.set(
        parsed.number,
        existing,
      );
    }
  }

  const rawCards = [
    ...cardMap.values(),
  ].sort((a, b) =>
    a.number.localeCompare(
      b.number,
      undefined,
      {
        numeric: true,
        sensitivity: "base",
      },
    ),
  );

  if (rawCards.length === 0) {
    throw new Error(
      "下载清单里没有成功解析到卡号与卡名。",
    );
  }

  await fs.mkdir(
    path.dirname(RAW_OUTPUT_PATH),
    { recursive: true },
  );

  await fs.writeFile(
    RAW_OUTPUT_PATH,
    `${JSON.stringify(rawCards, null, 2)}\n`,
    "utf8",
  );

  console.log("");
  console.log(
    `已从图片 alt 解析 ${rawCards.length} 个独立卡号。`,
  );
  console.log(
    `输出：${path.relative(ROOT, RAW_OUTPUT_PATH)}`,
  );

  const tableRaw = removeBom(
    await fs.readFile(
      CARD_TABLE_PATH,
      "utf8",
    ),
  );

  const {
    cards,
    arrayStart,
    arrayEnd,
  } = readCardArrayFromTypeScript(
    tableRaw,
  );

  try {
    await fs.access(BACKUP_PATH);
  } catch {
    await fs.writeFile(
      BACKUP_PATH,
      tableRaw,
      "utf8",
    );
  }

  let matchedRows = 0;
  let unmatchedRows = 0;
  let apRows = 0;

  const unmatchedNumbers = [];

  const updatedCards = cards.map(
    (card) => {
      const normalizedNumber =
        normalizeCardNumber(card?.number);

      const source =
        cardMap.get(normalizedNumber);

      if (!source) {
        unmatchedRows += 1;

        if (normalizedNumber) {
          unmatchedNumbers.push(
            normalizedNumber,
          );
        }

        return card;
      }

      matchedRows += 1;

      const isActionPoint =
        /-AP\d+$/i.test(
          normalizedNumber,
        );

      if (isActionPoint) {
        apRows += 1;
      }

      return {
        ...card,
        number: source.number,
        name: source.name,
        series: "黑色五叶草",
        type: isActionPoint
          ? "行动点卡"
          : card.type,
        rarity: isActionPoint
          ? "AP"
          : card.rarity,
        officialUrl:
          source.officialUrl ||
          card.officialUrl,
      };
    },
  );

  const updatedRaw =
    tableRaw.slice(0, arrayStart) +
    JSON.stringify(
      updatedCards,
      null,
      2,
    ) +
    tableRaw.slice(arrayEnd + 1);

  await fs.writeFile(
    CARD_TABLE_PATH,
    updatedRaw,
    "utf8",
  );

  const report = {
    generatedAt:
      new Date().toISOString(),
    manifests: manifestFiles.map(
      (filePath) =>
        path.relative(ROOT, filePath),
    ),
    uniqueCardNumbers:
      rawCards.length,
    generatedTableRows:
      cards.length,
    matchedRows,
    unmatchedRows,
    actionPointRows: apRows,
    unparsedAltCount:
      unparsedAlt.length,
    unmatchedNumbers: [
      ...new Set(unmatchedNumbers),
    ],
    unparsedAlt,
    note:
      "本工具只从官方下载清单的图片 alt 补入卡号与日文卡名。颜色、费用、AP、BP、效果与 Trigger 不存在于原下载清单中，因此不会凭空填写。",
  };

  await fs.writeFile(
    REPORT_PATH,
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );

  console.log("");
  console.log(
    "black-clover.ts 更新完成",
  );
  console.log(
    `成功匹配：${matchedRows} 行`,
  );
  console.log(
    `未匹配：${unmatchedRows} 行`,
  );
  console.log(
    `行动点卡：${apRows} 行`,
  );
  console.log(
    `无法解析 alt：${unparsedAlt.length} 笔`,
  );
  console.log(
    `备份：${path.relative(ROOT, BACKUP_PATH)}`,
  );
  console.log(
    `报告：${path.relative(ROOT, REPORT_PATH)}`,
  );
  console.log("");
  console.log(
    "下一阶段才补颜色、费用、AP、BP、效果与 Trigger。",
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
