import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const STAGE3 = path.join(ROOT, "data", "stage3");
const QUEUE = path.join(STAGE3, "translation-queue.json");
const CACHE = path.join(STAGE3, "translation-cache");
const ERRORS = path.join(STAGE3, "translation-errors");
const REPORTS = path.join(STAGE3, "reports");
const GLOSSARY_FILE = path.join(ROOT, "data", "translation-glossary.json");

const arg = (name, fallback = "") => {
  const p = `--${name}=`;
  const v = process.argv.find((x) => x.startsWith(p));
  return v ? v.slice(p.length) : fallback;
};
const intArg = (name, fallback, min, max) => {
  const n = Number.parseInt(arg(name, String(fallback)), 10);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};
const boolArg = (name) => /^(1|true|yes)$/i.test(arg(name, "false"));
const clean = (v) => String(v ?? "").replace(/^\uFEFF/, "");
const text = (v) => String(v ?? "").replace(/\r/g, "").trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function optionalJson(file, fallback) {
  try {
    return JSON.parse(clean(await fs.readFile(file, "utf8")));
  } catch {
    return fallback;
  }
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function writeJson(file, data) {
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  await fs.rename(tmp, file);
}

function glossaryEntries(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map((x) => ({
        from: text(x.from ?? x.ja ?? x.source),
        to: text(x.to ?? x.zh ?? x.target),
      }))
      .filter((x) => x.from && x.to);
  }
  if (raw && typeof raw === "object") {
    return Object.entries(raw)
      .map(([from, to]) => ({ from: text(from), to: text(to) }))
      .filter((x) => x.from && x.to);
  }
  return [];
}

function applyGlossary(value, glossary) {
  let out = text(value);
  for (const x of [...glossary].sort((a, b) => b.from.length - a.from.length)) {
    out = out.split(x.from).join(x.to);
  }
  return out;
}

function needsTranslation(unit) {
  return (
    (!unit.current?.nameZh && unit.source?.name) ||
    (!unit.current?.effectZh && unit.source?.effect) ||
    (!unit.current?.triggerZh && unit.source?.trigger)
  );
}

function systemPrompt(glossary) {
  const terms = glossary
    .slice(0, 300)
    .map((x) => `${x.from} => ${x.to}`)
    .join("\n");

  return `你是 UNION ARENA TCG 日文转简体中文翻译员。
只翻译，不解释，不添加原文不存在的内容。
必须保留数字、BP、AP、+/-数值、〈〉、［］、括号和区域缩写。
Front L=前线，Energy L=能量线，場外=场外，手札=手牌，山札=牌库。
レスト=横置，アクティブ=激活，退場=退场，登場=登场。
レイド统一写为 Raid，トリガー统一写为 Trigger。
[登場時] 等标签要翻译并保留方括号。
输入字段为空时输出也必须为空。
卡名优先使用常见正式简体中文译名。
每一个输入项目都必须返回 key、nameZh、effectZh、triggerZh 四个字段，不得省略。\n只返回 JSON：{"translations":[{"key":"...","nameZh":"...","effectZh":"...","triggerZh":"..."}]}
术语表：
${terms || "无"}`;
}

function userPrompt(batch) {
  return JSON.stringify({
    cards: batch.map((u) => ({
      key: u.unitId,
      series: u.series,
      cardNumbers: u.cardNumbers,
      name: u.source.name,
      effect: u.source.effect,
      trigger: u.source.trigger,
    })),
  });
}

async function callOllama(endpoint, model, system, user, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        stream: false,
        format: "json",
        think: false,
        keep_alive: "30m",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        options: {
          temperature: 0.1,
          num_ctx: 4096,
          num_predict: 4096,
        },
      }),
    });

    const body = await response.text();
    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}: ${body.slice(0, 300)}`);
    }

    const payload = JSON.parse(body);
    return JSON.parse(payload.message.content);
  } finally {
    clearTimeout(timer);
  }
}

async function translateBatch(batch, config) {
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const raw = await callOllama(
        config.endpoint,
        config.model,
        config.system,
        userPrompt(batch),
        config.timeout,
      );

      const rows = Array.isArray(raw) ? raw : raw.translations;
      if (!Array.isArray(rows)) throw new Error("模型没有返回 translations 阵列。");

      const byKey = new Map(rows.map((x) => [String(x.key ?? ""), x]));

      return batch.map((unit) => {
        const row = byKey.get(unit.unitId);
        if (!row) throw new Error(`${unit.cardNumbers[0]} 缺少翻译结果。`);

        const result = {
          nameZh: applyGlossary(row.nameZh, config.glossary),
          effectZh: applyGlossary(row.effectZh, config.glossary),
          triggerZh: applyGlossary(row.triggerZh, config.glossary),
        };

        if (unit.source.name && !result.nameZh) throw new Error(`${unit.cardNumbers[0]} 缺少中文卡名。`);
        if (unit.source.effect && !result.effectZh) throw new Error(`${unit.cardNumbers[0]} 缺少中文效果。`);
        if (unit.source.trigger && !result.triggerZh) throw new Error(`${unit.cardNumbers[0]} 缺少中文 Trigger。`);

        return result;
      });
    } catch (e) {
      lastError = e;
      if (attempt < 3) await sleep(1200 * attempt);
    }
  }

  // 批量失败时自动拆成单张重试，避免一张缺字段拖累整批。
  if (batch.length > 1) {
    const results = [];

    for (const unit of batch) {
      const single = await translateBatch([unit], config);
      results.push(single[0]);
    }

    return results;
  }

  throw lastError;
}

async function main() {
  const model = arg("model", "qwen2.5:7b");
  const endpoint = arg("endpoint", "http://127.0.0.1:11434/api/chat");
  const series = arg("series", "all");
  const limit = intArg("limit", 0, 0, 1000000);
  const offset = intArg("offset", 0, 0, 1000000);
  const batchSize = intArg("batch-size", 6, 1, 12);
  const delay = intArg("delay", 250, 0, 5000);
  const timeout = intArg("timeout", 180000, 30000, 600000);
  const force = boolArg("force");

  console.log("CardZero 第三阶段：Ollama 批量翻译");
  console.log(`模型：${model}｜系列：${series}｜每批：${batchSize}`);

  const queue = JSON.parse(clean(await fs.readFile(QUEUE, "utf8")));
  const requested = new Set(series.split(",").map((x) => x.trim()).filter(Boolean));

  let selected = queue.filter((u) =>
    needsTranslation(u) &&
    (requested.has("all") || requested.has(u.seriesSlug) || requested.has(u.series)));

  selected = selected.slice(offset, limit > 0 ? offset + limit : undefined);

  await fs.mkdir(CACHE, { recursive: true });
  await fs.mkdir(ERRORS, { recursive: true });
  await fs.mkdir(REPORTS, { recursive: true });

  const glossary = glossaryEntries(await optionalJson(GLOSSARY_FILE, {}));
  const pending = [];
  let cached = 0;

  for (const unit of selected) {
    const cacheFile = path.join(CACHE, `${unit.unitId}.json`);
    if (!force && await exists(cacheFile)) cached++;
    else pending.push({ ...unit, cacheFile });
  }

  console.log(`选中：${selected.length}｜已有缓存：${cached}｜待翻译：${pending.length}`);

  let completed = 0;
  const failures = [];

  for (let i = 0; i < pending.length; i += batchSize) {
    const batch = pending.slice(i, i + batchSize);
    console.log(`[${Math.floor(i / batchSize) + 1}/${Math.ceil(pending.length / batchSize)}] ${batch[0].cardNumbers[0]}`);

    try {
      const translated = await translateBatch(batch, {
        endpoint,
        model,
        system: systemPrompt(glossary),
        glossary,
        timeout,
      });

      for (let j = 0; j < batch.length; j++) {
        const unit = batch[j];
        await writeJson(unit.cacheFile, {
          status: "complete",
          translatedAt: new Date().toISOString(),
          model,
          unitId: unit.unitId,
          seriesSlug: unit.seriesSlug,
          series: unit.series,
          cardNumbers: unit.cardNumbers,
          source: unit.source,
          translation: translated[j],
        });
        await fs.rm(path.join(ERRORS, `${unit.unitId}.json`), { force: true });
        completed++;
      }
    } catch (e) {
      console.error(`本批失败：${e.message ?? e}`);
      for (const unit of batch) {
        const failure = {
          status: "error",
          failedAt: new Date().toISOString(),
          unitId: unit.unitId,
          cardNumbers: unit.cardNumbers,
          error: e.message ?? String(e),
        };
        failures.push(failure);
        await writeJson(path.join(ERRORS, `${unit.unitId}.json`), failure);
      }
    }

    if (i + batchSize < pending.length) await sleep(delay);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    model,
    series,
    selected: selected.length,
    cached,
    completed,
    failed: failures.length,
    failures,
  };

  const reportFile = path.join(REPORTS, `translate-${Date.now()}.json`);
  await writeJson(reportFile, report);

  console.log(`翻译成功：${completed}｜失败：${failures.length}`);
  console.log(`报告：${path.relative(ROOT, reportFile)}`);
}

main().catch((e) => {
  console.error("执行失败：", e.message ?? e);
  process.exitCode = 1;
});
