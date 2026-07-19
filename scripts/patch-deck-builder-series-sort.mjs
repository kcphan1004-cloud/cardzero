import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const target = path.join(
  projectRoot,
  "components",
  "DeckBuilderWorkbench.tsx",
);

if (!fs.existsSync(target)) {
  console.error(
    "找不到 components/DeckBuilderWorkbench.tsx",
  );
  process.exit(1);
}

let source = fs.readFileSync(
  target,
  "utf8",
);

const backup = `${target}.before-series-sort`;
fs.copyFileSync(target, backup);

if (
  !source.includes(
    "../utils/series-sort",
  )
) {
  const importPattern =
    /(import type \{ Card \} from ["'][^"']+["'];)/;

  if (!importPattern.test(source)) {
    console.error(
      "无法自动定位 Card type import，请手动加入 sortSeriesNewestFirst import。",
    );
    process.exit(1);
  }

  source = source.replace(
    importPattern,
    `$1\nimport { sortSeriesNewestFirst } from "../utils/series-sort";`,
  );
}

const patterns = [
  /uniqueOptions\(\s*cards\.map\(\s*\(card\)\s*=>\s*card\.series,?\s*\),?\s*\)/m,
  /uniqueOptions\(\s*cards\.map\(\s*\(card\)\s*=>\s*\n?\s*card\.series,?\s*\),?\s*\)/m,
];

let replaced = false;

for (const pattern of patterns) {
  if (!pattern.test(source)) {
    continue;
  }

  source = source.replace(
    pattern,
    (match) =>
      `sortSeriesNewestFirst(\n          ${match},\n          cards,\n        )`,
  );

  replaced = true;
  break;
}

if (!replaced) {
  console.error(
    "无法自动找到组牌工具的 seriesOptions 区块。已保留备份，未写入。",
  );
  process.exit(1);
}

fs.writeFileSync(
  target,
  source,
  "utf8",
);

console.log(
  "已将组牌工具系列改为 UA 编号由新到旧。",
);
console.log(`备份：${backup}`);
