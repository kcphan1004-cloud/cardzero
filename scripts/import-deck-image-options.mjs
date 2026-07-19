import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const inputPath = path.join(
  projectRoot,
  "data-source",
  "CardZero_牌组卡图设定.xlsx",
);
const outputPath = path.join(
  projectRoot,
  "data",
  "deck-image-options.ts",
);

function escapeTs(value) {
  return JSON.stringify(
    String(value ?? "").trim(),
  );
}

function isVisible(value) {
  const normalized = String(
    value ?? "",
  )
    .trim()
    .toUpperCase();

  return [
    "TRUE",
    "1",
    "YES",
    "是",
  ].includes(normalized);
}

async function loadXlsx() {
  try {
    const module =
      await import("xlsx");

    /*
     * xlsx 在不同 Node / ESM 版本下，
     * 可能放在 namespace 或 default export。
     */
    return module.default ?? module;
  } catch (error) {
    console.error(
      "缺少 xlsx 套件，请先执行：npm install xlsx",
    );
    console.error(error);
    process.exit(1);
  }
}

if (!fs.existsSync(inputPath)) {
  console.error(
    `找不到 Excel：${inputPath}`,
  );
  process.exit(1);
}

const XLSX = await loadXlsx();

/*
 * 不使用 XLSX.readFile()，避免 Node.js 24
 * 与 xlsx ESM export 兼容问题。
 */
const excelBuffer =
  fs.readFileSync(inputPath);

const workbook = XLSX.read(
  excelBuffer,
  {
    type: "buffer",
  },
);

const sheet =
  workbook.Sheets["牌组设定"];

if (!sheet) {
  console.error(
    "Excel 中找不到「牌组设定」工作表。",
  );
  process.exit(1);
}

const rows =
  XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    range: 3,
  });

const records = rows
  .map((row) => ({
    series: String(
      row["系列"] ?? "",
    ).trim(),
    color: String(
      row["颜色"] ?? "",
    ).trim(),
    name: String(
      row["卡组名称"] ?? "",
    ).trim(),
    cardNumber: String(
      row["代表卡号"] ?? "",
    ).trim(),
    order:
      Number(row["排序"]) || 999,
    enabled: isVisible(
      row["是否显示"],
    ),
    type: String(
      row["类型（选填）"] ?? "",
    ).trim(),
    note: String(
      row["备注（选填）"] ?? "",
    ).trim(),
  }))
  .filter(
    (row) =>
      row.enabled &&
      row.series &&
      row.color &&
      row.name &&
      row.cardNumber,
  )
  .sort(
    (a, b) =>
      a.series.localeCompare(
        b.series,
        "zh-Hans-CN",
      ) ||
      a.color.localeCompare(
        b.color,
        "zh-Hans-CN",
      ) ||
      a.order - b.order ||
      a.name.localeCompare(
        b.name,
        "zh-Hans-CN",
      ),
  );

const grouped = new Map();

for (const record of records) {
  const current =
    grouped.get(record.series) ?? [];

  current.push(record);
  grouped.set(
    record.series,
    current,
  );
}

const lines = [
  "export type DeckImageOption = {",
  "  name: string;",
  "  color: string;",
  "  cardNumber: string;",
  "  order: number;",
  "  enabled: boolean;",
  "  type?: string;",
  "  note?: string;",
  "};",
  "",
  "export const deckImageOptionsBySeries: Record<",
  "  string,",
  "  DeckImageOption[]",
  "> = {",
];

for (const [series, items] of grouped) {
  lines.push(
    `  ${escapeTs(series)}: [`,
  );

  for (const item of items) {
    lines.push(
      "    {",
      `      name: ${escapeTs(item.name)},`,
      `      color: ${escapeTs(item.color)},`,
      `      cardNumber: ${escapeTs(item.cardNumber)},`,
      `      order: ${item.order},`,
      "      enabled: true,",
    );

    if (item.type) {
      lines.push(
        `      type: ${escapeTs(item.type)},`,
      );
    }

    if (item.note) {
      lines.push(
        `      note: ${escapeTs(item.note)},`,
      );
    }

    lines.push("    },");
  }

  lines.push("  ],");
}

lines.push("};", "");

fs.mkdirSync(
  path.dirname(outputPath),
  {
    recursive: true,
  },
);

fs.writeFileSync(
  outputPath,
  lines.join("\n"),
  "utf8",
);

console.log(
  `已导入 ${records.length} 个牌组。`,
);
console.log(
  `已更新：${path.relative(
    projectRoot,
    outputPath,
  )}`,
);
