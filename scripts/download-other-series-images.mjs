import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const PROJECT_ROOT = process.cwd();
const OUTPUT_ROOT = path.join(PROJECT_ROOT, "public", "cards");
const MANIFEST_ROOT = path.join(PROJECT_ROOT, "data", "download-manifests");

const CARD_LIST_BASE_URL =
  "https://www.unionarena-tcg.com/en/cardlist/";

const SERIES = [
  {
    slug: "inuyasha",
    title: "犬夜叉",
    productCode: "UA50BT",
    seriesId: "589150",
  },
  {
    slug: "eminence-in-shadow",
    title: "我想成为影之强者！",
    productCode: "UA52BT",
    seriesId: "589152",
  },
  {
    slug: "chainsaw-man",
    title: "链锯人",
    productCode: "UA53BT",
    seriesId: "589153",
  },
];

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/150.0.0.0 Safari/537.36 CardZero-Data-Backup/1.0";

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function decodeHtml(value) {
  return String(value ?? "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function readAttribute(tag, attributeName) {
  const expression = new RegExp(
    `${attributeName}\\s*=\\s*["']([^"']+)["']`,
    "i",
  );

  return decodeHtml(tag.match(expression)?.[1] ?? "").trim();
}

function sanitizeFileName(value) {
  return String(value ?? "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getExtensionFromContentType(contentType) {
  const normalized = String(contentType ?? "").toLowerCase();

  if (normalized.includes("image/png")) return ".png";
  if (normalized.includes("image/jpeg")) return ".jpg";
  if (normalized.includes("image/webp")) return ".webp";
  if (normalized.includes("image/gif")) return ".gif";

  return ".png";
}

function createShortHash(value) {
  return crypto
    .createHash("sha1")
    .update(value)
    .digest("hex")
    .slice(0, 8);
}

function extractCardImageRecords(html, pageUrl, productCode) {
  const imageTags = html.match(/<img\b[^>]*>/gi) ?? [];
  const records = [];
  const seenUrls = new Set();

  for (const tag of imageTags) {
    const candidateSources = [
      readAttribute(tag, "data-src"),
      readAttribute(tag, "data-original"),
      readAttribute(tag, "data-lazy-src"),
      readAttribute(tag, "src"),
    ].filter(Boolean);

    const alt = readAttribute(tag, "alt");

    for (const candidate of candidateSources) {
      let absoluteUrl;

      try {
        absoluteUrl = new URL(candidate, pageUrl).toString();
      } catch {
        continue;
      }

      const normalizedUrl = absoluteUrl.toLowerCase();

      const isCardImage =
        normalizedUrl.includes("/images/cardlist/") &&
        !normalizedUrl.endsWith("/dummy.gif") &&
        !normalizedUrl.includes("/parts/");

      const belongsToProduct =
        absoluteUrl.toUpperCase().includes(productCode.toUpperCase()) ||
        alt.toUpperCase().includes(productCode.toUpperCase());

      if (!isCardImage || !belongsToProduct || seenUrls.has(absoluteUrl)) {
        continue;
      }

      seenUrls.add(absoluteUrl);
      records.push({ alt, sourceUrl: absoluteUrl });
    }
  }

  return records;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9,ja;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`页面读取失败：HTTP ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function pathExists(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile() && stats.size > 1_000;
  } catch {
    return false;
  }
}

async function downloadImage(record, outputDirectory, pageUrl, usedNames) {
  const response = await fetch(record.sourceUrl, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      Referer: pageUrl,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().startsWith("image/")) {
    throw new Error(`回传内容不是图片：${contentType || "未知类型"}`);
  }

  const url = new URL(record.sourceUrl);
  const rawBaseName = decodeURIComponent(path.basename(url.pathname));
  const parsed = path.parse(rawBaseName);
  const extension = parsed.ext || getExtensionFromContentType(contentType);
  const fallbackName =
    sanitizeFileName(record.alt) || `card-${createShortHash(record.sourceUrl)}`;

  let fileName = sanitizeFileName(parsed.name) || fallbackName;
  fileName = `${fileName}${extension.toLowerCase()}`;

  if (usedNames.has(fileName) && usedNames.get(fileName) !== record.sourceUrl) {
    fileName = `${sanitizeFileName(parsed.name) || fallbackName}-${createShortHash(
      record.sourceUrl,
    )}${extension.toLowerCase()}`;
  }

  usedNames.set(fileName, record.sourceUrl);

  const outputPath = path.join(outputDirectory, fileName);

  if (await pathExists(outputPath)) {
    const stats = await fs.stat(outputPath);

    return {
      status: "skipped",
      fileName,
      sizeBytes: stats.size,
    };
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.length < 1_000) {
    throw new Error(`图片内容太小：${buffer.length} bytes`);
  }

  await fs.writeFile(outputPath, buffer);

  return {
    status: "downloaded",
    fileName,
    sizeBytes: buffer.length,
  };
}

async function downloadSeries(series) {
  const pageUrl = `${CARD_LIST_BASE_URL}?search=true&series=${series.seriesId}`;
  const outputDirectory = path.join(OUTPUT_ROOT, series.slug);

  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.mkdir(MANIFEST_ROOT, { recursive: true });

  console.log("");
  console.log("========================================");
  console.log(`${series.title} [${series.productCode}]`);
  console.log(`资料夹：public/cards/${series.slug}`);
  console.log("========================================");

  const html = await fetchText(pageUrl);
  const records = extractCardImageRecords(html, pageUrl, series.productCode);

  if (records.length === 0) {
    throw new Error(
      `没有找到 ${series.productCode} 的卡图网址。官方网站页面结构可能已经改变。`,
    );
  }

  console.log(`找到 ${records.length} 个独立卡图网址。`);

  const manifest = [];
  const failures = [];
  const usedNames = new Map();
  let downloaded = 0;
  let skipped = 0;

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const progress = `[${String(index + 1).padStart(3, "0")}/${String(
      records.length,
    ).padStart(3, "0")}]`;

    try {
      const result = await downloadImage(
        record,
        outputDirectory,
        pageUrl,
        usedNames,
      );

      if (result.status === "downloaded") {
        downloaded += 1;
        console.log(`${progress} 下载：${result.fileName}`);
      } else {
        skipped += 1;
        console.log(`${progress} 已存在：${result.fileName}`);
      }

      manifest.push({
        series: series.title,
        productCode: series.productCode,
        alt: record.alt,
        sourceUrl: record.sourceUrl,
        localPath: `/cards/${series.slug}/${result.fileName}`,
        sizeBytes: result.sizeBytes,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      failures.push({
        alt: record.alt,
        sourceUrl: record.sourceUrl,
        error: message,
      });

      console.error(`${progress} 失败：${record.alt || record.sourceUrl}｜${message}`);
    }

    await sleep(180);
  }

  const manifestPath = path.join(
    MANIFEST_ROOT,
    `${series.slug}.images.json`,
  );

  await fs.writeFile(
    manifestPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        series,
        pageUrl,
        totalFound: records.length,
        downloaded,
        skipped,
        failed: failures.length,
        images: manifest,
        failures,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log("");
  console.log(
    `完成：下载 ${downloaded}，已存在 ${skipped}，失败 ${failures.length}`,
  );
  console.log(
    `清单：data/download-manifests/${series.slug}.images.json`,
  );

  return { downloaded, skipped, failed: failures.length };
}

function resolveSelectedSeries() {
  const requested = process.argv.slice(2).map((value) => value.toLowerCase());

  if (requested.length === 0 || requested.includes("all")) {
    return SERIES;
  }

  const selected = SERIES.filter(
    (series) =>
      requested.includes(series.slug.toLowerCase()) ||
      requested.includes(series.productCode.toLowerCase()),
  );

  if (selected.length === 0) {
    const available = SERIES.map(
      (series) => `${series.slug}（${series.productCode}）`,
    ).join("、");

    throw new Error(`找不到指定系列。可用选项：${available}、all`);
  }

  return selected;
}

async function main() {
  const selectedSeries = resolveSelectedSeries();
  const totals = { downloaded: 0, skipped: 0, failed: 0 };

  console.log("CardZero 其他系列卡图下载开始");
  console.log(`本次系列：${selectedSeries.map((item) => item.title).join("、")}`);

  for (const series of selectedSeries) {
    const result = await downloadSeries(series);
    totals.downloaded += result.downloaded;
    totals.skipped += result.skipped;
    totals.failed += result.failed;
  }

  console.log("");
  console.log("========================================");
  console.log("全部任务完成");
  console.log(`新下载：${totals.downloaded}`);
  console.log(`已存在：${totals.skipped}`);
  console.log(`失败：${totals.failed}`);
  console.log("========================================");

  if (totals.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("");
  console.error(
    "下载任务中止：",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
