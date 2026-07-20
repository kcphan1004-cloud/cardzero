import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const packagePath = path.join(
  projectRoot,
  "package.json",
);

if (!fs.existsSync(packagePath)) {
  console.error(
    `找不到 package.json：${packagePath}`,
  );
  process.exit(1);
}

const packageJson = JSON.parse(
  fs.readFileSync(
    packagePath,
    "utf8",
  ),
);

packageJson.scripts = {
  ...(packageJson.scripts ?? {}),
  "import:decks":
    "node scripts/import-deck-image-options.mjs",
};

fs.writeFileSync(
  packagePath,
  `${JSON.stringify(
    packageJson,
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  '已加入 npm script：npm run import:decks',
);
