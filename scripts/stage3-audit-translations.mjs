import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const STAGE3 = path.join(ROOT, "data", "stage3");
const QUEUE = path.join(STAGE3, "translation-queue.json");
const CACHE = path.join(STAGE3, "translation-cache");
const ERRORS = path.join(STAGE3, "translation-errors");
const OUT = path.join(STAGE3, "translation-audit.json");
const clean = (v) => String(v ?? "").replace(/^\uFEFF/, "");

async function list(directory) {
  try {
    return (await fs.readdir(directory, { withFileTypes: true }))
      .filter((e) => e.isFile() && e.name.endsWith(".json"))
      .map((e) => path.join(directory, e.name));
  } catch {
    return [];
  }
}

async function main() {
  const queue = JSON.parse(clean(await fs.readFile(QUEUE, "utf8")));
  const cached = new Set();

  for (const file of await list(CACHE)) {
    try {
      const record = JSON.parse(clean(await fs.readFile(file, "utf8")));
      if (record.status === "complete" && record.unitId) cached.add(record.unitId);
    } catch {}
  }

  const bySeries = new Map();

  for (const unit of queue) {
    const row = bySeries.get(unit.seriesSlug) ?? {
      seriesSlug: unit.seriesSlug,
      units: 0,
      cached: 0,
      missingUnitIds: [],
    };
    row.units++;
    if (cached.has(unit.unitId)) row.cached++;
    else row.missingUnitIds.push(unit.unitId);
    bySeries.set(unit.seriesSlug, row);
  }

  const errorFiles = await list(ERRORS);
  const series = [...bySeries.values()]
    .map((x) => ({
      ...x,
      coverage: x.units ? x.cached / x.units : 0,
    }))
    .sort((a, b) => a.seriesSlug.localeCompare(b.seriesSlug));

  const report = {
    generatedAt: new Date().toISOString(),
    translationUnits: queue.length,
    cachedUnits: cached.size,
    missingUnits: queue.length - cached.size,
    errorFiles: errorFiles.length,
    coverage: queue.length ? cached.size / queue.length : 0,
    series,
  };

  await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n", "utf8");

  console.log(`翻译单位：${report.translationUnits}`);
  console.log(`已有翻译：${report.cachedUnits}`);
  console.log(`尚未翻译：${report.missingUnits}`);
  console.log(`失败记录：${report.errorFiles}`);
  console.log(`完成度：${(report.coverage * 100).toFixed(2)}%`);
  console.log(`报告：${path.relative(ROOT, OUT)}`);
}

main().catch((e) => {
  console.error("执行失败：", e.message ?? e);
  process.exitCode = 1;
});
