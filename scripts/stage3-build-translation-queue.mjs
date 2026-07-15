import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const SERIES_DIR = path.join(ROOT, "data", "card-series-generated");
const OUT_DIR = path.join(ROOT, "data", "stage3");
const QUEUE = path.join(OUT_DIR, "translation-queue.json");
const SUMMARY = path.join(OUT_DIR, "translation-summary.json");

const clean = (v) => String(v ?? "").replace(/^\uFEFF/, "");
const text = (v) => String(v ?? "").replace(/\r/g, "").trim();
const number = (v) => text(v).replace(/\\/g, "/").replace(/_/g, "/").toUpperCase();

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
  return cards;
}

function unitId(source) {
  return crypto
    .createHash("sha1")
    .update(JSON.stringify(source))
    .digest("hex")
    .slice(0, 20);
}

async function main() {
  console.log("CardZero 第三阶段：建立翻译队列");
  const entries = await fs.readdir(SERIES_DIR, { withFileTypes: true });
  const files = entries
    .filter((e) =>
      e.isFile() &&
      e.name.endsWith(".ts") &&
      !["index.ts", "types.ts"].includes(e.name) &&
      !e.name.includes(".before-"))
    .map((e) => e.name)
    .sort();

  const byNumber = new Map();
  let totalRows = 0;

  for (const file of files) {
    const slug = file.replace(/\.ts$/, "");
    const cards = readCards(
      clean(await fs.readFile(path.join(SERIES_DIR, file), "utf8")),
      file,
    );

    for (const card of cards) {
      totalRows++;
      const no = number(card.number);
      if (!no) continue;

      if (!byNumber.has(no)) {
        byNumber.set(no, {
          number: no,
          seriesSlug: slug,
          series: text(card.series),
          name: text(card.name),
          effect: text(card.effect),
          trigger: text(card.trigger),
          nameZh: text(card.nameZh),
          effectZh: text(card.effectZh),
          triggerZh: text(card.triggerZh),
        });
      }
    }
  }

  const units = new Map();

  for (const card of byNumber.values()) {
    const source = {
      series: card.series,
      name: card.name,
      effect: card.effect,
      trigger: card.trigger,
    };
    const id = unitId(source);

    if (units.has(id)) {
      units.get(id).cardNumbers.push(card.number);
    } else {
      units.set(id, {
        unitId: id,
        seriesSlug: card.seriesSlug,
        series: card.series,
        source,
        cardNumbers: [card.number],
        current: {
          nameZh: card.nameZh,
          effectZh: card.effectZh,
          triggerZh: card.triggerZh,
        },
      });
    }
  }

  const queue = [...units.values()].sort((a, b) =>
    a.cardNumbers[0].localeCompare(b.cardNumbers[0], "en"));

  const complete = queue.filter((u) =>
    (!u.source.name || u.current.nameZh) &&
    (!u.source.effect || u.current.effectZh) &&
    (!u.source.trigger || u.current.triggerZh)).length;

  const summary = {
    generatedAt: new Date().toISOString(),
    seriesFiles: files.length,
    totalRows,
    uniqueCardNumbers: byNumber.size,
    translationUnits: queue.length,
    alreadyCompleteUnits: complete,
    pendingUnits: queue.length - complete,
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(QUEUE, JSON.stringify(queue, null, 2) + "\n", "utf8");
  await fs.writeFile(SUMMARY, JSON.stringify(summary, null, 2) + "\n", "utf8");

  console.log(summary);
}

main().catch((e) => {
  console.error("执行失败：", e.message ?? e);
  process.exitCode = 1;
});
