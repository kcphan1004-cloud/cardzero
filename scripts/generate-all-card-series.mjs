import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const IMAGE_ROOT = path.join(ROOT, "public", "cards");
const OUTPUT_ROOT = path.join(ROOT, "data", "card-series-generated");
const MAP_PATH = path.join(ROOT, "scripts", "series-name-map.json");

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".avif",
]);

function canonicalSeriesSlug(folderName) {
  let slug = String(folderName).trim().toLowerCase();

  // 这些是不明官方编号资料夹，不要误删尾部数字。
  if (!slug.startsWith("series-")) {
    slug = slug.replace(/-\d+$/, "");
  }

  // 无职转生旧资料夹别名。
  if (slug === "mushoku") {
    return "mushoku-tensei";
  }

  return slug;
}

function safeIdentifier(slug) {
  const words = slug
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .split("-")
    .filter(Boolean);

  let identifier = words
    .map((word, index) => {
      const cleaned = word.replace(/[^a-zA-Z0-9]/g, "");
      if (!cleaned) return "";
      if (index === 0) return cleaned.toLowerCase();
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
    })
    .join("");

  if (!identifier) identifier = "series";
  if (/^\d/.test(identifier)) identifier = `series${identifier}`;

  return `${identifier}Cards`;
}

function normalizeCardNumber(fileName) {
  const stem = path.parse(fileName).name
    .replace(/%2F/gi, "/")
    .replace(/\\/g, "/");

  // 常见格式：UA54BT_MST-1-001 → UA54BT/MST-1-001
  const slashNormalized = stem.replace(/_/g, "/");

  const commonMatch = slashNormalized.match(
    /((?:UA|EX|ST|PR)[A-Z0-9-]*\/[A-Z0-9-]+-\d{2,4})/i,
  );

  if (commonMatch?.[1]) {
    return commonMatch[1].toUpperCase();
  }

  return slashNormalized;
}

function detectVariant(fileName) {
  const stem = path.parse(fileName).name.toLowerCase();

  if (
    /(?:^|[_-])(alt|parallel|foil|sp|star|signed|p\d+)(?:$|[_-])/.test(stem)
  ) {
    return "异图";
  }

  return "普通版";
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

async function listImagesRecursively(directory) {
  const output = [];
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      output.push(...(await listImagesRecursively(fullPath)));
      continue;
    }

    if (!entry.isFile()) continue;

    const extension = path.extname(entry.name).toLowerCase();
    if (IMAGE_EXTENSIONS.has(extension)) {
      output.push(fullPath);
    }
  }

  return output;
}

async function loadSeriesNameMap() {
  try {
    const raw = await fs.readFile(MAP_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function makeCardTypeFile() {
  return `export type Card = {
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
}

async function main() {
  console.log("CardZero 全系列基础卡表生成器");
  console.log("--------------------------------");

  const folderEntries = await fs.readdir(IMAGE_ROOT, { withFileTypes: true });
  const sourceFolders = folderEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "en"));

  if (sourceFolders.length === 0) {
    throw new Error("public/cards 内找不到系列资料夹。");
  }

  const seriesNameMap = await loadSeriesNameMap();
  const grouped = new Map();
  const manifest = [];
  const duplicateIdCounts = new Map();

  for (const folderName of sourceFolders) {
    const folderPath = path.join(IMAGE_ROOT, folderName);
    const imageFiles = await listImagesRecursively(folderPath);
    const seriesSlug = canonicalSeriesSlug(folderName);
    const seriesName = seriesNameMap[seriesSlug] || seriesSlug;

    if (!grouped.has(seriesSlug)) {
      grouped.set(seriesSlug, {
        slug: seriesSlug,
        name: seriesName,
        sourceFolders: [],
        cards: [],
      });
    }

    const group = grouped.get(seriesSlug);
    group.sourceFolders.push(folderName);

    for (const absoluteImagePath of imageFiles.sort((a, b) =>
      a.localeCompare(b, "en", { numeric: true }),
    )) {
      const relativeFromPublic = toPosix(
        path.relative(path.join(ROOT, "public"), absoluteImagePath),
      );
      const fileName = path.basename(absoluteImagePath);
      const cardNumber = normalizeCardNumber(fileName);
      const idBase = `${folderName}-${path.parse(fileName).name}`
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/-+/g, "-");

      const seenCount = duplicateIdCounts.get(idBase) ?? 0;
      duplicateIdCounts.set(idBase, seenCount + 1);
      const id = seenCount === 0 ? idBase : `${idBase}-${seenCount + 1}`;

      const card = {
        id,
        number: cardNumber,
        name: "资料待补",
        nameZh: "",
        series: seriesName,
        color: "资料待补",
        type: "资料待补",
        rarity: "-",
        cost: 0,
        ap: 0,
        bp: "-",
        feature: "-",
        generatedEnergy: "-",
        effect: "",
        effectZh: "",
        trigger: "",
        triggerZh: "",
        officialUrl: "",
        variant: detectVariant(fileName),
        image: `/${relativeFromPublic}`,
      };

      group.cards.push(card);
      manifest.push({
        folder: folderName,
        seriesSlug,
        series: seriesName,
        fileName,
        number: cardNumber,
        image: card.image,
      });
    }
  }

  await fs.rm(OUTPUT_ROOT, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_ROOT, { recursive: true });

  await fs.writeFile(
    path.join(OUTPUT_ROOT, "types.ts"),
    makeCardTypeFile(),
    "utf8",
  );

  const imports = [];
  const exports = [];
  const allCards = [];
  const seriesObjectLines = [];
  const report = [];

  const groups = [...grouped.values()].sort((a, b) =>
    a.slug.localeCompare(b.slug, "en"),
  );

  for (const group of groups) {
    const variableName = safeIdentifier(group.slug);
    const content = `import type { Card } from "./types";

export const ${variableName}: Card[] = ${JSON.stringify(group.cards, null, 2)};
`;

    await fs.writeFile(
      path.join(OUTPUT_ROOT, `${group.slug}.ts`),
      content,
      "utf8",
    );

    imports.push(`import { ${variableName} } from "./${group.slug}";`);
    exports.push(`export { ${variableName} } from "./${group.slug}";`);
    allCards.push(`...${variableName}`);
    seriesObjectLines.push(
      `  ${JSON.stringify(group.name)}: ${variableName},`,
    );

    report.push({
      slug: group.slug,
      series: group.name,
      sourceFolders: group.sourceFolders,
      cards: group.cards.length,
    });

    console.log(
      `${group.name}: ${group.cards.length} 张 ← ${group.sourceFolders.join(", ")}`,
    );
  }

  const indexContent = `${imports.join("\n")}

import type { Card } from "./types";
export type { Card } from "./types";

${exports.join("\n")}

export const cards: Card[] = [
  ${allCards.join(",\n  ")}
];

export const cardsBySeries: Record<string, Card[]> = {
${seriesObjectLines.join("\n")}
};

export const seriesNames = Object.keys(cardsBySeries);
`;

  await fs.writeFile(
    path.join(OUTPUT_ROOT, "index.ts"),
    indexContent,
    "utf8",
  );

  await fs.writeFile(
    path.join(OUTPUT_ROOT, "card-image-manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8",
  );

  await fs.writeFile(
    path.join(OUTPUT_ROOT, "generation-report.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalFolders: sourceFolders.length,
        totalSeries: groups.length,
        totalCards: manifest.length,
        series: report,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log("--------------------------------");
  console.log(`资料夹：${sourceFolders.length}`);
  console.log(`合并后系列：${groups.length}`);
  console.log(`基础卡表：${manifest.length} 张`);
  console.log(`输出：${path.relative(ROOT, OUTPUT_ROOT)}`);
  console.log("");
  console.log("这次不会修改原本的 data/card-series。");
}

main().catch((error) => {
  console.error("");
  console.error(
    "生成失败：",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
