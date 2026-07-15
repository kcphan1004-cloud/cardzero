import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import * as cheerio from "cheerio";

const ROOT = process.cwd();
const SOURCE_URL = "https://behdeck.com/";
const OUTPUT_DIR = path.join(ROOT, "public", "tier-list", "behdeck");
const DATA_PATH = path.join(ROOT, "data", "behdeck-tier-list.json");
const REPORT_PATH = path.join(ROOT, "data", "behdeck-tier-list-report.json");
const OVERRIDES_PATH = path.join(
  ROOT,
  "data",
  "behdeck-deck-name-overrides.json",
);

const TIER_ORDER = [
  "Tier 1",
  "Tier 1.5",
  "Tier 2",
  "Tier 2.5",
  "Tier 3",
  "Tier 4",
  "Tier 5",
  "Not Released in Asia",
];

const EXCLUDED_PATHS = new Set(["/", "/changelog"]);

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t\r\n　]+/g, " ")
    .trim();
}

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sha1(value) {
  return crypto
    .createHash("sha1")
    .update(String(value))
    .digest("hex")
    .slice(0, 10);
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function extensionFromContentType(contentType, url) {
  const normalized = String(contentType ?? "")
    .toLowerCase()
    .split(";")[0]
    .trim();

  const byType = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "image/avif": ".avif",
  };

  if (byType[normalized]) return byType[normalized];

  try {
    const ext = path.extname(new URL(url).pathname).toLowerCase();
    if (/^\.(png|jpe?g|webp|gif|svg|avif)$/.test(ext)) {
      return ext === ".jpeg" ? ".jpg" : ext;
    }
  } catch {}

  return ".webp";
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
            "Chrome/150.0.0.0 Safari/537.36 CardZero/1.0",
          Accept:
            "text/html,image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,ja;q=0.7",
          Referer: SOURCE_URL,
        },
      });

      if (response.ok) return response;

      lastError = new Error(
        `HTTP ${response.status} ${response.statusText}`,
      );
    } catch (error) {
      lastError = error;
    }

    if (attempt < retries) await sleep(900 * attempt);
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError));
}

function toAbsoluteUrl(value, baseUrl) {
  const source = normalizeText(value);

  if (
    !source ||
    source.startsWith("data:") ||
    source.startsWith("javascript:")
  ) {
    return "";
  }

  try {
    return new URL(source, baseUrl).toString();
  } catch {
    return "";
  }
}

function firstSrcsetUrl(value) {
  return (
    normalizeText(value)
      .split(",")[0]
      ?.trim()
      ?.split(/\s+/)[0] ?? ""
  );
}

function backgroundUrlFromStyle(value) {
  const match = String(value ?? "").match(
    /(?:background-image|background)\s*:\s*[^;]*url\(\s*(['"]?)(.*?)\1\s*\)/i,
  );

  return normalizeText(match?.[2] ?? "");
}

function findDirectImageUrl($, anchor, pageUrl) {
  const image = $(anchor).find("img").first();

  const imageSource =
    image.attr("data-src") ||
    image.attr("data-lazy-src") ||
    image.attr("src") ||
    firstSrcsetUrl(image.attr("srcset")) ||
    "";

  if (imageSource) return toAbsoluteUrl(imageSource, pageUrl);

  const source = $(anchor).find("picture source").first();

  const pictureSource =
    source.attr("src") ||
    source.attr("data-src") ||
    firstSrcsetUrl(source.attr("srcset")) ||
    "";

  if (pictureSource) return toAbsoluteUrl(pictureSource, pageUrl);

  const candidates = [anchor, ...$(anchor).find("*").toArray()];

  for (const element of candidates) {
    const attributeSource =
      $(element).attr("data-bg") ||
      $(element).attr("data-background") ||
      $(element).attr("data-background-image") ||
      backgroundUrlFromStyle($(element).attr("style"));

    if (attributeSource) {
      return toAbsoluteUrl(attributeSource, pageUrl);
    }
  }

  return "";
}

function isTierEntryUrl(url) {
  try {
    const parsed = new URL(url);

    if (parsed.origin !== new URL(SOURCE_URL).origin) return false;

    const pathname = parsed.pathname.replace(/\/+$/, "") || "/";

    if (
      EXCLUDED_PATHS.has(pathname) ||
      pathname.startsWith("/assets/") ||
      pathname.startsWith("/images/") ||
      pathname.includes(".")
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function extractTierLinks(html) {
  const $ = cheerio.load(html);
  const groups = new Map(TIER_ORDER.map((label) => [label, []]));
  let currentTier = "";

  $("body *").each((_, element) => {
    const tagName = String(element.tagName ?? "").toLowerCase();
    const elementText = normalizeText($(element).text());

    if (TIER_ORDER.includes(elementText)) {
      const childTierHeading = $(element)
        .children()
        .toArray()
        .some((child) =>
          TIER_ORDER.includes(normalizeText($(child).text())),
        );

      if (!childTierHeading || /^h[1-6]$/.test(tagName)) {
        currentTier = elementText;
      }
    }

    if (
      /collaborator|developer|changelog|support/i.test(elementText) &&
      /^h[1-6]$/.test(tagName)
    ) {
      currentTier = "";
    }

    if (tagName !== "a" || !currentTier) return;

    const href = toAbsoluteUrl($(element).attr("href"), SOURCE_URL);
    if (!isTierEntryUrl(href)) return;

    const directImageUrl = findDirectImageUrl($, element, SOURCE_URL);
    const alt = normalizeText($(element).find("img").first().attr("alt"));
    const rawTitle =
      normalizeText($(element).attr("title")) ||
      alt ||
      normalizeText($(element).text());

    const items = groups.get(currentTier);
    const occurrenceIndex = items.filter(
      (item) => item.href === href,
    ).length;

    items.push({
      tier: currentTier,
      href,
      directImageUrl,
      rawTitle,
      alt,
      occurrenceIndex,
    });
  });

  return TIER_ORDER
    .map((label) => ({
      label,
      items: groups.get(label) ?? [],
    }))
    .filter((group) => group.items.length > 0);
}

function extractDeckKey(value) {
  const match = normalizeText(value).match(
    /(?:Deck\s+)?([0-9]+_deck)/i,
  );

  return match?.[1]?.toLowerCase() ?? "";
}

function extractDetailPageData(html, detailUrl) {
  const $ = cheerio.load(html);

  const title =
    normalizeText(
      $("main h1, main h2, article h1, article h2").first().text(),
    ) ||
    normalizeText($("h1, h2").first().text()) ||
    new URL(detailUrl).pathname
      .split("/")
      .filter(Boolean)
      .at(-1)
      ?.replace(/[-_]+/g, " ") ||
    "BehDeck Deck";

  const images = [];

  $("img").each((_, image) => {
    const alt = normalizeText($(image).attr("alt"));

    if (!/^Deck\b/i.test(alt) || /Reference Build/i.test(alt)) {
      return;
    }

    const source =
      $(image).attr("data-src") ||
      $(image).attr("data-lazy-src") ||
      $(image).attr("src") ||
      firstSrcsetUrl($(image).attr("srcset"));

    const imageUrl = toAbsoluteUrl(source, detailUrl);

    if (
      imageUrl &&
      !images.some((item) => item.imageUrl === imageUrl)
    ) {
      images.push({
        imageUrl,
        alt: alt || title,
        deckKey: extractDeckKey(alt) || extractDeckKey(source),
      });
    }
  });

  return { title, images };
}

async function loadDetailPages(groups) {
  const uniqueUrls = [
    ...new Set(
      groups.flatMap((group) =>
        group.items.map((item) => item.href),
      ),
    ),
  ];

  console.log(`需要读取 ${uniqueUrls.length} 个 BehDeck 牌组页面。`);

  const result = new Map();
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;

      if (index >= uniqueUrls.length) return;

      const url = uniqueUrls[index];

      try {
        const response = await fetchWithRetry(url);
        const html = await response.text();
        const data = extractDetailPageData(html, url);

        result.set(url, data);

        console.log(
          `[页面 ${index + 1}/${uniqueUrls.length}] ` +
            `${data.title}｜${data.images.length} 张图片`,
        );
      } catch (error) {
        console.error(
          `[页面失败] ${url}｜${
            error instanceof Error ? error.message : error
          }`,
        );

        result.set(url, {
          title:
            new URL(url).pathname
              .split("/")
              .filter(Boolean)
              .at(-1) ?? "BehDeck Deck",
          images: [],
        });
      }
    }
  }

  await Promise.all(
    Array.from(
      {
        length: Math.min(5, Math.max(1, uniqueUrls.length)),
      },
      () => worker(),
    ),
  );

  return result;
}

async function loadNameOverrides() {
  try {
    const text = await fs.readFile(OVERRIDES_PATH, "utf8");
    const parsed = JSON.parse(text);

    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function mergeTierItems(groups, detailPages, nameOverrides) {
  return groups
    .map((group) => ({
      label: group.label,
      items: group.items
        .map((item) => {
          const detail = detailPages.get(item.href);

          const detailImage =
            detail?.images[item.occurrenceIndex] ??
            detail?.images[0];

          const imageUrl =
            item.directImageUrl ||
            detailImage?.imageUrl ||
            "";

          const deckKey =
            detailImage?.deckKey ||
            extractDeckKey(item.alt) ||
            extractDeckKey(item.rawTitle) ||
            extractDeckKey(imageUrl);

          const samePageCount = group.items.filter(
            (other) => other.href === item.href,
          ).length;

          const seriesTitle =
            detail?.title ||
            item.rawTitle ||
            "BehDeck Deck";

          const automaticTitle =
            samePageCount > 1
              ? `${seriesTitle} ${item.occurrenceIndex + 1}`
              : seriesTitle;

          const overrideTitle =
            (deckKey && normalizeText(nameOverrides[deckKey])) ||
            normalizeText(nameOverrides[item.href]) ||
            "";

          return {
            ...item,
            title: overrideTitle || automaticTitle,
            alt: overrideTitle || detailImage?.alt || automaticTitle,
            imageUrl,
            deckKey,
          };
        })
        .filter((item) => item.imageUrl),
    }))
    .filter((group) => group.items.length > 0);
}

async function downloadImage(item) {
  const response = await fetchWithRetry(item.imageUrl);
  const buffer = Buffer.from(await response.arrayBuffer());

  const extension = extensionFromContentType(
    response.headers.get("content-type"),
    item.imageUrl,
  );

  const routeSlug =
    new URL(item.href).pathname
      .split("/")
      .filter(Boolean)
      .join("-") || "home";

  const fileName =
    `${slugify(routeSlug) || "behdeck-deck"}-` +
    `${item.occurrenceIndex + 1}-${sha1(item.imageUrl)}${extension}`;

  const filePath = path.join(OUTPUT_DIR, fileName);
  await fs.writeFile(filePath, buffer);

  return {
    ...item,
    publicPath: `/tier-list/behdeck/${fileName}`,
    bytes: buffer.length,
  };
}

async function runPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function runner() {
    while (true) {
      const index = cursor;
      cursor += 1;

      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(
    Array.from(
      {
        length: Math.min(concurrency, Math.max(1, items.length)),
      },
      () => runner(),
    ),
  );

  return results;
}

async function main() {
  console.log("CardZero × BehDeck T 表同步工具（卡组名称版）");
  console.log("============================================");

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });

  const response = await fetchWithRetry(SOURCE_URL);
  const html = await response.text();

  const rawGroups = extractTierLinks(html);
  const rawLinkCount = rawGroups.reduce(
    (sum, group) => sum + group.items.length,
    0,
  );

  if (rawLinkCount === 0) {
    throw new Error("没有从 BehDeck 首页解析到 T 表链接。");
  }

  console.log(
    `首页解析到 ${rawGroups.length} 个分区、${rawLinkCount} 个牌组链接。`,
  );

  const detailPages = await loadDetailPages(rawGroups);
  const nameOverrides = await loadNameOverrides();
  const groups = mergeTierItems(
    rawGroups,
    detailPages,
    nameOverrides,
  );

  const allItems = groups.flatMap((group) => group.items);

  if (allItems.length === 0) {
    throw new Error(
      "牌组链接已经找到，但无法从首页或牌组页面取得图片。",
    );
  }

  console.log(`准备下载 ${allItems.length} 张展示图片。`);

  const downloaded = await runPool(
    allItems,
    5,
    async (item, index) => {
      const result = await downloadImage(item);

      console.log(
        `[图片 ${index + 1}/${allItems.length}] ` +
          `${item.tier}｜${item.title}`,
      );

      return result;
    },
  );

  const downloadedByKey = new Map(
    downloaded.map((item) => [
      `${item.tier}|${item.href}|${item.occurrenceIndex}`,
      item,
    ]),
  );

  const tiers = groups.map((group) => ({
    id: slugify(group.label),
    label: group.label,
    items: group.items.map((item) => {
      const key =
        `${item.tier}|${item.href}|${item.occurrenceIndex}`;

      const saved = downloadedByKey.get(key);

      return {
        id: sha1(key),
        title: item.title,
        href: item.href,
        image: saved.publicPath,
        alt: item.alt,
        deckKey: item.deckKey,
      };
    }),
  }));

  const pageText = normalizeText(cheerio.load(html)("body").text());
  const updatedMatch = pageText.match(
    /Updated:\s*([0-9/.-]+)/i,
  );

  const data = {
    source: "BehDeck／八脚鱼",
    sourceUrl: SOURCE_URL,
    updatedAt: updatedMatch?.[1] ?? "",
    syncedAt: new Date().toISOString(),
    tiers,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    sourceUrl: SOURCE_URL,
    updatedAt: data.updatedAt,
    tierCount: tiers.length,
    homepageLinks: rawLinkCount,
    uniqueDetailPages: detailPages.size,
    itemCount: allItems.length,
    customNames: allItems.filter(
      (item) =>
        item.deckKey &&
        normalizeText(nameOverrides[item.deckKey]),
    ).length,
    downloadedBytes: downloaded.reduce(
      (sum, item) => sum + item.bytes,
      0,
    ),
    tiers: tiers.map((tier) => ({
      label: tier.label,
      items: tier.items.length,
    })),
  };

  await fs.writeFile(
    DATA_PATH,
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8",
  );

  await fs.writeFile(
    REPORT_PATH,
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );

  console.log("");
  console.log("同步完成");
  console.log(`分区：${report.tierCount}`);
  console.log(`牌组入口：${report.itemCount}`);
  console.log(`自定义卡组名：${report.customNames}`);
  console.log(`资料：${path.relative(ROOT, DATA_PATH)}`);
  console.log(`报告：${path.relative(ROOT, REPORT_PATH)}`);
}

main().catch((error) => {
  console.error("");
  console.error(
    "执行失败：",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
