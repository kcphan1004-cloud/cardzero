import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const SERIES_DIR = path.join(ROOT, "data", "card-series-generated");
const STAGE3 = path.join(ROOT, "data", "stage3");
const QUEUE = path.join(STAGE3, "translation-queue.json");
const CACHE = path.join(STAGE3, "translation-cache");
const BACKUPS = path.join(STAGE3, "backups", "card-series-generated");
const REPORTS = path.join(STAGE3, "reports");
const OVERRIDES = path.join(ROOT, "data", "card-translation-overrides.json");
const EXPORT = path.join(ROOT, "data", "card-translations.json");

const arg = (name, fallback = "") => {
  const p = `--${name}=`;
  const v = process.argv.find((x) => x.startsWith(p));
  return v ? v.slice(p.length) : fallback;
};
const boolArg = (name) => /^(1|true|yes)$/i.test(arg(name, "false"));
const clean = (v) => String(v ?? "").replace(/^\uFEFF/, "");
const text = (v) => String(v ?? "").replace(/\r/g, "").trim();
const number = (v) => text(v).replace(/\\/g, "/").replace(/_/g, "/").toUpperCase();

async function optionalJson(file, fallback) {
  try {
    return JSON.parse(clean(await fs.readFile(file, "utf8")));
  } catch {
    return fallback;
  }
}

async function writeJson(file, data) {
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  await fs.rename(tmp, file);
}

function readCards(raw, file) {
  const p = raw.indexOf("export const");
  const e = raw.indexOf("=", p);
  const a = raw.indexOf("[", e);
  const z = raw.lastIndexOf("];");
  if (p < 0 || e < 0 || a < 0 || z < a) {
    throw new Error(`${file} 的卡牌阵列无法识别。`);
  }
  const cards = JSON.parse(raw.slice(a, z + 1));
  if (!Array.isArray(cards)) throw new Error(`${file} 不是阵列。`);
  return { cards, a, z };
}

function normalizeOverrides(raw) {
  if (Array.isArray(raw)) {
    return new Map(
      raw.filter((x) => x?.number).map((x) => [number(x.number), x]),
    );
  }
  if (raw && typeof raw === "object") {
    return new Map(
      Object.entries(raw)
        .filter(([key]) => !key.startsWith("_"))
        .map(([key, value]) => [number(key), value]),
    );
  }
  return new Map();
}

async function main() {
  const series = arg("series", "all");
  const dryRun = boolArg("dry-run");
  const overwrite = boolArg("overwrite");

  console.log("CardZero 第三阶段：写入中文翻译");
  console.log(`系列：${series}｜只检查：${dryRun}｜覆盖：${overwrite}`);

  const queue = JSON.parse(clean(await fs.readFile(QUEUE, "utf8")));
  const units = new Map(queue.map((u) => [u.unitId, u]));
  const translations = new Map();
  const exportData = {};

  let cacheEntries = [];
  try {
    cacheEntries = await fs.readdir(CACHE, { withFileTypes: true });
  } catch {}

  for (const entry of cacheEntries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;

    try {
      const record = JSON.parse(
        clean(await fs.readFile(path.join(CACHE, entry.name), "utf8")),
      );
      const unit = units.get(record.unitId);
      if (record.status !== "complete" || !unit || !record.translation) continue;

      for (const no of unit.cardNumbers) {
        const key = number(no);
        const value = {
          number: key,
          nameZh: text(record.translation.nameZh),
          effectZh: text(record.translation.effectZh),
          triggerZh: text(record.translation.triggerZh),
          model: record.model ?? "",
          translatedAt: record.translatedAt ?? "",
        };
        translations.set(key, value);
        exportData[key] = value;
      }
    } catch {}
  }

  const overrides = normalizeOverrides(await optionalJson(OVERRIDES, {}));

  for (const [no, value] of overrides) {
    const base = translations.get(no) ?? {
      number: no,
      nameZh: "",
      effectZh: "",
      triggerZh: "",
    };
    const merged = {
      ...base,
      nameZh: value?.nameZh ?? base.nameZh,
      effectZh: value?.effectZh ?? base.effectZh,
      triggerZh: value?.triggerZh ?? base.triggerZh,
      override: true,
    };
    translations.set(no, merged);
    exportData[no] = merged;
  }

  const requested = new Set(series.split(",").map((x) => x.trim()).filter(Boolean));
  const entries = await fs.readdir(SERIES_DIR, { withFileTypes: true });
  const files = entries
    .filter((e) =>
      e.isFile() &&
      e.name.endsWith(".ts") &&
      !["index.ts", "types.ts"].includes(e.name) &&
      !e.name.includes(".before-"))
    .map((e) => e.name)
    .filter((file) => {
      const slug = file.replace(/\.ts$/, "");
      return requested.has("all") || requested.has(slug);
    })
    .sort();

  await fs.mkdir(BACKUPS, { recursive: true });
  await fs.mkdir(REPORTS, { recursive: true });

  let total = 0;
  let matched = 0;
  let unmatched = 0;
  let changed = 0;
  let changedFiles = 0;
  const seriesReports = [];

  for (const file of files) {
    const filePath = path.join(SERIES_DIR, file);
    const raw = clean(await fs.readFile(filePath, "utf8"));
    const { cards, a, z } = readCards(raw, file);

    let fileMatched = 0;
    let fileChanged = 0;
    const missing = [];

    const updated = cards.map((card) => {
      total++;
      const no = number(card.number);
      const tr = translations.get(no);

      if (!tr) {
        unmatched++;
        missing.push(no);
        return card;
      }

      matched++;
      fileMatched++;

      const next = {
        ...card,
        nameZh: overwrite || !card.nameZh ? tr.nameZh : card.nameZh,
        effectZh: overwrite || !card.effectZh ? tr.effectZh : card.effectZh,
        triggerZh: overwrite || !card.triggerZh ? tr.triggerZh : card.triggerZh,
      };

      if (JSON.stringify(next) !== JSON.stringify(card)) {
        changed++;
        fileChanged++;
      }

      return next;
    });

    seriesReports.push({
      file,
      rows: cards.length,
      matched: fileMatched,
      changed: fileChanged,
      missingNumbers: [...new Set(missing)],
    });

    console.log(`${file}: 匹配 ${fileMatched}/${cards.length}，改变 ${fileChanged}`);

    if (!dryRun && fileChanged > 0) {
      const backup = path.join(BACKUPS, file);
      try {
        await fs.access(backup);
      } catch {
        await fs.writeFile(backup, raw, "utf8");
      }

      const nextRaw =
        raw.slice(0, a) +
        JSON.stringify(updated, null, 2) +
        raw.slice(z + 1);

      await fs.writeFile(filePath, nextRaw, "utf8");
      changedFiles++;
    }
  }

  if (!dryRun) await writeJson(EXPORT, exportData);

  const report = {
    generatedAt: new Date().toISOString(),
    series,
    dryRun,
    overwrite,
    translationCardNumbers: translations.size,
    overrides: overrides.size,
    total,
    matched,
    unmatched,
    changed,
    changedFiles,
    seriesReports,
  };

  const reportFile = path.join(REPORTS, `apply-${Date.now()}.json`);
  await writeJson(reportFile, report);

  console.log(`成功匹配：${matched}/${total}`);
  console.log(`未匹配：${unmatched}｜改变：${changed}｜写入文件：${dryRun ? 0 : changedFiles}`);
  console.log(`报告：${path.relative(ROOT, reportFile)}`);
}

main().catch((e) => {
  console.error("执行失败：", e.message ?? e);
  process.exitCode = 1;
});
