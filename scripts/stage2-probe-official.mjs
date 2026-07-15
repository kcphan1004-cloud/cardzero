import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const STAGE2_DIR = path.join(ROOT, "data", "stage2");
const QUEUE_PATH = path.join(
  STAGE2_DIR,
  "card-detail-queue.json",
);
const PROBE_DIR = path.join(
  STAGE2_DIR,
  "official-probe",
);
const HTML_DIR = path.join(PROBE_DIR, "html");
const JSON_DIR = path.join(PROBE_DIR, "json");
const REPORT_PATH = path.join(
  PROBE_DIR,
  "official-probe-report.json",
);

const DEFAULT_LIMIT = 20;
const DEFAULT_DELAY = 500;

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const entry = process.argv.find((value) =>
    value.startsWith(prefix),
  );

  return entry
    ? entry.slice(prefix.length)
    : fallback;
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t　]+/g, " ")
    .replace(/\r/g, "")
    .trim();
}

function safeFileName(value) {
  return String(value ?? "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_");
}

function sleep(milliseconds) {
  return new Promise((resolve) =>
    setTimeout(resolve, milliseconds),
  );
}

function decodeHtmlEntities(value) {
  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };

  return String(value ?? "")
    .replace(
      /&(#x?[0-9a-f]+|[a-z]+);/gi,
      (_, entity) => {
        const lower = entity.toLowerCase();

        if (lower.startsWith("#x")) {
          return String.fromCodePoint(
            Number.parseInt(lower.slice(2), 16),
          );
        }

        if (lower.startsWith("#")) {
          return String.fromCodePoint(
            Number.parseInt(lower.slice(1), 10),
          );
        }

        return named[lower] ?? `&${entity};`;
      },
    );
}

function htmlToText(html) {
  return normalizeText(
    decodeHtmlEntities(
      String(html ?? "")
        .replace(
          /<script\b[^>]*>[\s\S]*?<\/script>/gi,
          "",
        )
        .replace(
          /<style\b[^>]*>[\s\S]*?<\/style>/gi,
          "",
        )
        .replace(
          /<(br|\/p|\/div|\/li|\/tr|\/dt|\/dd|\/h[1-6])\b[^>]*>/gi,
          "\n",
        )
        .replace(/<[^>]+>/g, " "),
    ),
  )
    .split("\n")
    .map((line) =>
      line.replace(/\s+/g, " ").trim(),
    )
    .filter(Boolean)
    .join("\n");
}

function extractTitle(html) {
  const match = String(html ?? "").match(
    /<title\b[^>]*>([\s\S]*?)<\/title>/i,
  );

  return match
    ? normalizeText(
        decodeHtmlEntities(
          match[1].replace(/<[^>]+>/g, " "),
        ),
      )
    : "";
}

function inspectText(text) {
  const labels = [
    "カード種類",
    "必要エナジー",
    "消費AP",
    "BP",
    "発生エナジー",
    "特徴",
    "効果",
    "トリガー",
    "レアリティ",
  ];

  const labelHits = Object.fromEntries(
    labels.map((label) => [
      label,
      text.includes(label),
    ]),
  );

  return {
    labelHits,
    hitCount: Object.values(labelHits).filter(Boolean)
      .length,
  };
}

async function fetchWithRetry(url, retries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) " +
            "Chrome/150.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
          "Accept-Language":
            "ja,en-US;q=0.8,en;q=0.7",
          Referer:
            "https://www.unionarena-tcg.com/jp/cardlist/",
        },
      });

      const body = await response.text();

      if (response.ok) {
        return {
          status: response.status,
          contentType:
            response.headers.get("content-type") ?? "",
          body,
        };
      }

      lastError = new Error(
        `HTTP ${response.status}`,
      );
    } catch (error) {
      lastError = error;
    }

    if (attempt < retries) {
      await sleep(900 * attempt);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError));
}

async function main() {
  const seriesSlug = getArg(
    "series",
    "black-clover",
  );
  const limit = Math.max(
    1,
    Number(getArg("limit", DEFAULT_LIMIT)),
  );
  const offset = Math.max(
    0,
    Number(getArg("offset", 0)),
  );
  const delay = Math.max(
    0,
    Number(getArg("delay", DEFAULT_DELAY)),
  );

  console.log(
    "CardZero 第二阶段：官方详细资料来源测试",
  );
  console.log(
    "======================================",
  );
  console.log(`系列：${seriesSlug}`);
  console.log(`数量：${limit}`);
  console.log(`起点：${offset}`);

  const queue = JSON.parse(
    await fs.readFile(QUEUE_PATH, "utf8"),
  );

  if (!Array.isArray(queue)) {
    throw new Error(
      "card-detail-queue.json 不是阵列。",
    );
  }

  const selected = queue
    .filter(
      (item) =>
        !item.isActionPoint &&
        item.seriesSlugs?.includes(seriesSlug),
    )
    .slice(offset, offset + limit);

  if (selected.length === 0) {
    throw new Error(
      `队列中找不到系列 ${seriesSlug} 的普通卡。`,
    );
  }

  await fs.mkdir(HTML_DIR, {
    recursive: true,
  });
  await fs.mkdir(JSON_DIR, {
    recursive: true,
  });

  const results = [];

  for (
    let index = 0;
    index < selected.length;
    index += 1
  ) {
    const item = selected[index];

    const url = new URL(
      "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php",
    );
    url.searchParams.set("card_no", item.number);

    console.log(
      `[${index + 1}/${selected.length}] ${item.number}`,
    );

    const fileBase = safeFileName(item.number);

    try {
      const response = await fetchWithRetry(
        url.toString(),
      );
      const text = htmlToText(response.body);
      const inspection = inspectText(text);

      const htmlPath = path.join(
        HTML_DIR,
        `${fileBase}.html`,
      );
      const jsonPath = path.join(
        JSON_DIR,
        `${fileBase}.json`,
      );

      await fs.writeFile(
        htmlPath,
        response.body,
        "utf8",
      );

      const record = {
        number: item.number,
        name: item.name,
        seriesSlugs: item.seriesSlugs,
        sourceUrl: url.toString(),
        httpStatus: response.status,
        contentType: response.contentType,
        contentLength: response.body.length,
        title: extractTitle(response.body),
        labelHits: inspection.labelHits,
        labelHitCount: inspection.hitCount,
        textPreview: text.slice(0, 3000),
        htmlFile: path.relative(ROOT, htmlPath),
      };

      await fs.writeFile(
        jsonPath,
        `${JSON.stringify(record, null, 2)}\n`,
        "utf8",
      );

      results.push({
        ...record,
        success: true,
      });

      console.log(
        `  成功｜HTML ${response.body.length} 字元｜资料标签 ${inspection.hitCount}/9`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      results.push({
        number: item.number,
        name: item.name,
        seriesSlugs: item.seriesSlugs,
        sourceUrl: url.toString(),
        success: false,
        error: message,
      });

      console.error(`  失败｜${message}`);
    }

    if (index < selected.length - 1) {
      await sleep(delay);
    }
  }

  const successful = results.filter(
    (item) => item.success,
  );
  const useful = successful.filter(
    (item) => item.labelHitCount >= 4,
  );

  const report = {
    generatedAt: new Date().toISOString(),
    seriesSlug,
    requestedLimit: limit,
    offset,
    tested: results.length,
    successfulRequests: successful.length,
    usefulDetailPages: useful.length,
    failedRequests:
      results.length - successful.length,
    recommendation:
      useful.length >= Math.ceil(results.length * 0.8)
        ? "官方详细页面可用，可以进入第二阶段正式解析器开发。"
        : "官方页面返回的资料标签不足，先不要批量抓取或修改卡表。",
    results,
  };

  await fs.writeFile(
    REPORT_PATH,
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );

  console.log("");
  console.log("======================================");
  console.log(`测试：${results.length}`);
  console.log(
    `请求成功：${successful.length}`,
  );
  console.log(
    `可用详细页：${useful.length}`,
  );
  console.log(
    `报告：${path.relative(ROOT, REPORT_PATH)}`,
  );
  console.log(report.recommendation);
}

main().catch((error) => {
  console.error("");
  console.error(
    "执行失败：",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
