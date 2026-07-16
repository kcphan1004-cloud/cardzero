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

  return `ä½ æ˜¯ UNION ARENA TCG æ—¥æ–‡è½¬ç®€ä½“ä¸­æ–‡ç¿»è¯‘å‘˜ã€‚
åªç¿»è¯‘ï¼Œä¸è§£é‡Šï¼Œä¸æ·»åŠ åŽŸæ–‡ä¸å­˜åœ¨çš„å†…å®¹ã€‚
å¿…é¡»ä¿ç•™æ•°å­—ã€BPã€APã€+/-æ•°å€¼ã€ã€ˆã€‰ã€ï¼»ï¼½ã€æ‹¬å·å’ŒåŒºåŸŸç¼©å†™ã€‚
Front L=å‰çº¿ï¼ŒEnergy L=èƒ½é‡çº¿ï¼Œå ´å¤–=åœºå¤–ï¼Œæ‰‹æœ­=æ‰‹ç‰Œï¼Œå±±æœ­=ç‰Œåº“ã€‚
ãƒ¬ã‚¹ãƒˆ=æ¨ªç½®ï¼Œã‚¢ã‚¯ãƒ†ã‚£ãƒ–=æ¿€æ´»ï¼Œé€€å ´=é€€åœºï¼Œç™»å ´=ç™»åœºã€‚
ãƒ¬ã‚¤ãƒ‰ç»Ÿä¸€å†™ä¸º Raidï¼Œãƒˆãƒªã‚¬ãƒ¼ç»Ÿä¸€å†™ä¸º Triggerã€‚
[ç™»å ´æ™‚] ç­‰æ ‡ç­¾è¦ç¿»è¯‘å¹¶ä¿ç•™æ–¹æ‹¬å·ã€‚
è¾“å…¥å­—æ®µä¸ºç©ºæ—¶è¾“å‡ºä¹Ÿå¿…é¡»ä¸ºç©ºã€‚
å¡åä¼˜å…ˆä½¿ç”¨å¸¸è§æ­£å¼ç®€ä½“ä¸­æ–‡è¯‘åã€‚
æ¯ä¸€ä¸ªè¾“å…¥é¡¹ç›®éƒ½å¿…é¡»è¿”å›ž keyã€nameZhã€effectZhã€triggerZh å››ä¸ªå­—æ®µï¼Œä¸å¾—çœç•¥ã€‚\nåªè¿”å›ž JSONï¼š{"translations":[{"key":"...","nameZh":"...","effectZh":"...","triggerZh":"..."}]}
æœ¯è¯­è¡¨ï¼š
${terms || "æ— "}`;
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
      if (!Array.isArray(rows)) throw new Error("æ¨¡åž‹æ²¡æœ‰è¿”å›ž translations é˜µåˆ—ã€‚");

      const byKey = new Map(rows.map((x) => [String(x.key ?? ""), x]));

      return batch.map((unit) => {
        const row = byKey.get(unit.unitId);
        if (!row) throw new Error(`${unit.cardNumbers[0]} ç¼ºå°‘ç¿»è¯‘ç»“æžœã€‚`);

        const result = {
          nameZh: applyGlossary(row.nameZh, config.glossary),
          effectZh: applyGlossary(row.effectZh, config.glossary),
          triggerZh: applyGlossary(row.triggerZh, config.glossary),
        };

        if (unit.source.name && !result.nameZh) throw new Error(`${unit.cardNumbers[0]} ç¼ºå°‘ä¸­æ–‡å¡åã€‚`);
        if (unit.source.effect && !result.effectZh) throw new Error(`${unit.cardNumbers[0]} ç¼ºå°‘ä¸­æ–‡æ•ˆæžœã€‚`);
        if (unit.source.trigger && !result.triggerZh) throw new Error(`${unit.cardNumbers[0]} ç¼ºå°‘ä¸­æ–‡ Triggerã€‚`);

        return result;
      });
    } catch (e) {
      lastError = e;
      if (attempt < 3) await sleep(1200 * attempt);
    }
  }

  // æ‰¹é‡å¤±è´¥æ—¶è‡ªåŠ¨æ‹†æˆå•å¼ é‡è¯•ï¼Œé¿å…ä¸€å¼ ç¼ºå­—æ®µæ‹–ç´¯æ•´æ‰¹ã€‚
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
  const model = arg("model", "qwen3.5:4b");
  const endpoint = arg("endpoint", "http://127.0.0.1:11434/api/chat");
  const series = arg("series", "all");
  const limit = intArg("limit", 0, 0, 1000000);
  const offset = intArg("offset", 0, 0, 1000000);
  const batchSize = intArg("batch-size", 6, 1, 12);
  const delay = intArg("delay", 250, 0, 5000);
  const timeout = intArg("timeout", 180000, 30000, 600000);
  const force = boolArg("force");

  console.log("CardZero ç¬¬ä¸‰é˜¶æ®µï¼šOllama æ‰¹é‡ç¿»è¯‘");
  console.log(`æ¨¡åž‹ï¼š${model}ï½œç³»åˆ—ï¼š${series}ï½œæ¯æ‰¹ï¼š${batchSize}`);

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

  console.log(`é€‰ä¸­ï¼š${selected.length}ï½œå·²æœ‰ç¼“å­˜ï¼š${cached}ï½œå¾…ç¿»è¯‘ï¼š${pending.length}`);

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
      console.error(`æœ¬æ‰¹å¤±è´¥ï¼š${e.message ?? e}`);
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

  console.log(`ç¿»è¯‘æˆåŠŸï¼š${completed}ï½œå¤±è´¥ï¼š${failures.length}`);
  console.log(`æŠ¥å‘Šï¼š${path.relative(ROOT, reportFile)}`);
}

main().catch((e) => {
  console.error("æ‰§è¡Œå¤±è´¥ï¼š", e.message ?? e);
  process.exitCode = 1;
});

