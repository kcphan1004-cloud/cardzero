import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();

const sourcePath = path.join(
  projectRoot,
  "data",
  "cards.ts",
);

const outputDirectory = path.join(
  projectRoot,
  "data",
  "card-series",
);

// 可以在这里指定每个系列的英文档名。
const SERIES_FILE_NAMES = {
  无职转生: "mushoku-tensei",
  链锯人: "chainsaw-man",
  蓝色监狱: "blue-lock",
};

function removeBom(text) {
  return String(text ?? "").replace(
    /^\uFEFF/,
    "",
  );
}

function readCardsArray(raw) {
  const exportMarker =
    "export const cards: Card[] =";

  const exportPosition =
    raw.indexOf(exportMarker);

  if (exportPosition === -1) {
    throw new Error(
      "无法在 data/cards.ts 找到 cards 阵列。",
    );
  }

  const arrayStart = raw.indexOf(
    "[",
    exportPosition + exportMarker.length,
  );

  const arrayEnd = raw.lastIndexOf("];");

  if (
    arrayStart === -1 ||
    arrayEnd === -1 ||
    arrayEnd < arrayStart
  ) {
    throw new Error(
      "data/cards.ts 的卡牌阵列格式不正确。",
    );
  }

  const jsonText = raw.slice(
    arrayStart,
    arrayEnd + 1,
  );

  return JSON.parse(jsonText);
}

function readCardType(raw) {
  const match = raw.match(
    /export type Card = \{[\s\S]*?\n\};/,
  );

  if (!match) {
    throw new Error(
      "无法在 data/cards.ts 找到 Card 类型。",
    );
  }

  return match[0];
}

function sanitizeFileName(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getFallbackFileName(
  series,
  seriesCards,
  index,
) {
  const firstNumber =
    seriesCards[0]?.number ?? "";

  // 例如 UA54BT/MST-1-001 会取出 mst。
  const codeMatch = firstNumber.match(
    /^[^/]+\/([A-Za-z0-9]+)-/,
  );

  if (codeMatch?.[1]) {
    return codeMatch[1].toLowerCase();
  }

  const sanitized =
    sanitizeFileName(series);

  if (
    sanitized &&
    /^[a-z0-9-]+$/.test(sanitized)
  ) {
    return sanitized;
  }

  return `series-${String(index + 1).padStart(
    2,
    "0",
  )}`;
}

function toVariableName(fileName) {
  const words = fileName
    .split("-")
    .filter(Boolean);

  const camelCase = words
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase();
      }

      return (
        word.charAt(0).toUpperCase() +
        word.slice(1).toLowerCase()
      );
    })
    .join("");

  return `${camelCase || "series"}Cards`;
}

async function clearOldSeriesFiles() {
  await fs.mkdir(outputDirectory, {
    recursive: true,
  });

  const entries = await fs.readdir(
    outputDirectory,
    {
      withFileTypes: true,
    },
  );

  for (const entry of entries) {
    if (
      entry.isFile() &&
      entry.name.endsWith(".ts")
    ) {
      await fs.unlink(
        path.join(
          outputDirectory,
          entry.name,
        ),
      );
    }
  }
}

async function main() {
  console.log(
    "CardZero 卡牌系列分档开始",
  );

  const raw = removeBom(
    await fs.readFile(sourcePath, "utf8"),
  );

  const cards = readCardsArray(raw);
  const cardType = readCardType(raw);

  if (!Array.isArray(cards)) {
    throw new Error(
      "data/cards.ts 的 cards 不是阵列。",
    );
  }

  const groupedCards = new Map();

  for (const card of cards) {
    const series = String(
      card.series || "未分类",
    ).trim();

    if (!groupedCards.has(series)) {
      groupedCards.set(series, []);
    }

    groupedCards.get(series).push(card);
  }

  await clearOldSeriesFiles();

  await fs.writeFile(
    path.join(
      outputDirectory,
      "types.ts",
    ),
    `${cardType}\n`,
    "utf8",
  );

  const imports = [];
  const exports = [];
  const allCardVariables = [];
  const seriesEntries = [];
  const usedFileNames = new Set();

  let seriesIndex = 0;

  for (const [
    series,
    seriesCards,
  ] of groupedCards.entries()) {
    let fileName =
      SERIES_FILE_NAMES[series] ||
      getFallbackFileName(
        series,
        seriesCards,
        seriesIndex,
      );

    let uniqueFileName = fileName;
    let duplicateIndex = 2;

    while (
      usedFileNames.has(uniqueFileName)
    ) {
      uniqueFileName =
        `${fileName}-${duplicateIndex}`;

      duplicateIndex += 1;
    }

    usedFileNames.add(uniqueFileName);

    const variableName =
      toVariableName(uniqueFileName);

    const fileContent = `import type { Card } from "./types";

export const ${variableName}: Card[] = ${JSON.stringify(
      seriesCards,
      null,
      2,
    )};
`;

    await fs.writeFile(
      path.join(
        outputDirectory,
        `${uniqueFileName}.ts`,
      ),
      fileContent,
      "utf8",
    );

    imports.push(
      `import { ${variableName} } from "./${uniqueFileName}";`,
    );

    exports.push(
      `export { ${variableName} } from "./${uniqueFileName}";`,
    );

    allCardVariables.push(
      `...${variableName}`,
    );

    seriesEntries.push(
      `  ${JSON.stringify(
        series,
      )}: ${variableName},`,
    );

    console.log(
      `${series}：${seriesCards.length} 张 → ${uniqueFileName}.ts`,
    );

    seriesIndex += 1;
  }

  const indexContent = `${imports.join(
    "\n",
  )}

export type { Card } from "./types";

${exports.join("\n")}

export const cards = [
  ${allCardVariables.join(",\n  ")}
];

export const cardsBySeries = {
${seriesEntries.join("\n")}
};

export const seriesNames =
  Object.keys(cardsBySeries);
`;

  await fs.writeFile(
    path.join(
      outputDirectory,
      "index.ts",
    ),
    indexContent,
    "utf8",
  );

  console.log("");
  console.log(
    "==============================",
  );
  console.log(
    `完成：${cards.length} 张卡牌`,
  );
  console.log(
    `系列数量：${groupedCards.size}`,
  );
  console.log(
    "输出位置：data/card-series",
  );
  console.log(
    "==============================",
  );
}

main().catch((error) => {
  console.error(
    "分档失败：",
    error instanceof Error
      ? error.message
      : error,
  );

  process.exitCode = 1;
});