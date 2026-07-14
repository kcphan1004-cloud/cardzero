import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const PROJECT_ROOT = process.cwd();
const OUTPUT_ROOT = path.join(PROJECT_ROOT, "public", "cards");
const MANIFEST_ROOT = path.join(PROJECT_ROOT, "data", "download-manifests");
const CARD_LIST_BASE_URL = "https://www.unionarena-tcg.com/jp/cardlist/";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/150.0.0.0 Safari/537.36 CardZero-Private-Data-Backup/2.0";

const DEFAULT_IMAGE_DELAY_MS = 280;
const DEFAULT_SERIES_DELAY_MS = 1200;
const DEFAULT_RETRIES = 3;

const TITLE_SLUG_OVERRIDES = new Map([
  ["UNION ARENA", "union-arena"],
  ["コードギアス 反逆のルルーシュ", "code-geass"],
  ["呪術廻戦", "jujutsu-kaisen"],
  ["HUNTER×HUNTER", "hunter-x-hunter"],
  ["アイドルマスター シャイニーカラーズ", "idolmaster-shiny-colors"],
  ["鬼滅の刃", "demon-slayer"],
  ["Tales of ARISE", "tales-of-arise"],
  ["転生したらスライムだった件", "tensura"],
  ["BLEACH 千年血戦篇", "bleach-thousand-year-blood-war"],
  ["僕とロボコ", "me-and-roboco"],
  ["僕のヒーローアカデミア", "my-hero-academia"],
  ["銀魂", "gintama"],
  ["ブルーロック", "blue-lock"],
  ["鉄拳7", "tekken-7"],
  ["Dr.STONE", "dr-stone"],
  ["ソードアート・オンライン", "sword-art-online"],
  ["SYNDUALITY Noir", "synduality-noir"],
  ["トリコ", "toriko"],
  ["勝利の女神：NIKKE", "nikke"],
  ["ハイキュー‼", "haikyu"],
  ["ブラッククローバー", "black-clover"],
  ["幽☆遊☆白書", "yu-yu-hakusho"],
  ["GAMERA -Rebirth-", "gamera-rebirth"],
  ["進撃の巨人", "attack-on-titan"],
  ["SHY", "shy"],
  ["アンデッドアンラック", "undead-unluck"],
  ["君のことが大大大大大好きな100人の彼女", "100-girlfriends"],
  ["学園アイドルマスター", "gakuen-idolmaster"],
  ["怪獣８号", "kaiju-no-8"],
  ["仮面ライダー", "kamen-rider"],
  ["アークナイツ", "arknights"],
  ["魔法少女まどか☆マギカ", "madoka-magica"],
  ["シャングリラ・フロンティア", "shangri-la-frontier"],
  ["2.5次元の誘惑", "2-5-dimensional-seduction"],
  ["コードギアス 奪還のロゼ", "code-geass-roze"],
  ["ワンパンマン", "one-punch-man"],
  ["マクロス", "macross"],
  ["WIND BREAKER", "wind-breaker"],
  ["鋼の錬金術師", "fullmetal-alchemist"],
  ["キン肉マン", "kinnikuman"],
  ["Re:ゼロから始める異世界生活", "re-zero"],
  ["るろうに剣心 －明治剣客浪漫譚－", "rurouni-kenshin"],
  ["〈物語〉シリーズ", "monogatari-series"],
  ["SAKAMOTO DAYS", "sakamoto-days"],
  ["ヱヴァンゲリヲン新劇場版", "evangelion"],
  ["To LOVEる-とらぶる-", "to-love-ru"],
  ["To LOVEる-とらぶる- Memory of Heroines", "to-love-ru"],
  ["カグラバチ", "kagurabachi"],
  ["東京喰種トーキョーグール", "tokyo-ghoul"],
  ["キングダム", "kingdom"],
  ["魔都精兵のスレイブ", "chained-soldier"],
  ["俺だけレベルアップな件", "solo-leveling"],
  ["陰の実力者になりたくて！", "eminence-in-shadow"],
  ["チェンソーマン", "chainsaw-man"],
  ["犬夜叉", "inuyasha"],
  ["無職転生 ～異世界行ったら本気だす～", "mushoku-tensei"],
  ["アイドルマスター シンデレラガールズ", "idolmaster-cinderella-girls"],
]);

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function decodeHtml(value) {
  return String(value ?? "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&nbsp;", " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );
}

function stripTags(value) {
  return decodeHtml(String(value ?? "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
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

function normalizeTitleForMatch(value) {
  return stripTags(value)
    .replace(/[\s　]+/g, " ")
    .replace(/[【〖].*?[】〗]/g, "")
    .trim();
}

function slugifyAscii(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getSeriesSlug(title, seriesId) {
  const normalizedTitle = normalizeTitleForMatch(title);

  for (const [knownTitle, slug] of TITLE_SLUG_OVERRIDES.entries()) {
    if (
      normalizedTitle === knownTitle ||
      normalizedTitle.includes(knownTitle) ||
      knownTitle.includes(normalizedTitle)
    ) {
      return slug;
    }
  }

  const asciiSlug = slugifyAscii(normalizedTitle);
  return asciiSlug || `series-${seriesId}`;
}

function createShortHash(value) {
  return crypto
    .createHash("sha1")
    .update(String(value))
    .digest("hex")
    .slice(0, 8);
}

function getExtensionFromContentType(contentType) {
  const normalized = String(contentType ?? "").toLowerCase();

  if (normalized.includes("image/png")) return ".png";
  if (normalized.includes("image/jpeg")) return ".jpg";
  if (normalized.includes("image/webp")) return ".webp";
  if (normalized.includes("image/gif")) return ".gif";
  if (normalized.includes("image/avif")) return ".avif";

  return ".png";
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseArguments() {
  const args = process.argv.slice(2);
  const positional = [];
  const options = {
    imageDelayMs: DEFAULT_IMAGE_DELAY_MS,
    seriesDelayMs: DEFAULT_SERIES_DELAY_MS,
    retries: DEFAULT_RETRIES,
    limit: 0,
    force: false,
    dryRun: false,
  };

  for (const arg of args) {
    if (arg === "--force") {
      options.force = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg.startsWith("--delay=")) {
      options.imageDelayMs = parsePositiveInteger(
        arg.slice("--delay=".length),
        DEFAULT_IMAGE_DELAY_MS,
      );
      continue;
    }

    if (arg.startsWith("--series-delay=")) {
      options.seriesDelayMs = parsePositiveInteger(
        arg.slice("--series-delay=".length),
        DEFAULT_SERIES_DELAY_MS,
      );
      continue;
    }

    if (arg.startsWith("--retries=")) {
      options.retries = Math.max(
        1,
        parsePositiveInteger(arg.slice("--retries=".length), DEFAULT_RETRIES),
      );
      continue;
    }

    if (arg.startsWith("--limit=")) {
      options.limit = parsePositiveInteger(arg.slice("--limit=".length), 0);
      continue;
    }

    positional.push(arg);
  }

  return {
    command: positional[0]?.trim() || "all",
    options,
  };
}

async function fetchWithRetry(url, init, retries) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, init);

      if (
        response.ok ||
        (response.status < 500 && response.status !== 408 && response.status !== 429)
      ) {
        return response;
      }

      lastError = new Error(`HTTP ${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;
    }

    if (attempt < retries) {
      const waitMs = 900 * attempt;
      console.warn(`读取失败，${waitMs}ms 后重试（${attempt}/${retries}）…`);
      await sleep(waitMs);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function fetchText(url, retries) {
  const response = await fetchWithRetry(
    url,
    {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ja,en-US;q=0.8,en;q=0.7",
      },
    },
    retries,
  );

  if (!response.ok) {
    throw new Error(`页面读取失败：HTTP ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function parseOptionsFromSelect(selectHtml) {
  const optionTags = selectHtml.match(/<option\b[\s\S]*?<\/option>/gi) ?? [];
  const results = [];

  for (const optionTag of optionTags) {
    const openingTag = optionTag.match(/<option\b[^>]*>/i)?.[0] ?? "";
    const value = readAttribute(openingTag, "value");
    const label = stripTags(optionTag);

    if (!value || !label) continue;

    results.push({ value, label });
  }

  return results;
}

function discoverSeriesFromHtml(html) {
  const selectBlocks = html.match(/<select\b[\s\S]*?<\/select>/gi) ?? [];
  const candidates = [];

  for (const selectHtml of selectBlocks) {
    const openingTag = selectHtml.match(/<select\b[^>]*>/i)?.[0] ?? "";
    const name = readAttribute(openingTag, "name").toLowerCase();
    const id = readAttribute(openingTag, "id").toLowerCase();
    const options = parseOptionsFromSelect(selectHtml).filter(
      (option) => /^\d{5,}$/.test(option.value),
    );

    if (options.length === 0) continue;

    let score = options.length;
    if (name.includes("series")) score += 1000;
    if (id.includes("series")) score += 1000;
    if (selectHtml.includes("無職転生")) score += 100;
    if (selectHtml.includes("犬夜叉")) score += 100;
    if (selectHtml.includes("チェンソーマン")) score += 100;

    candidates.push({ score, name, id, options });
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  if (!best) {
    throw new Error(
      "无法从官方网站取得系列清单。网站结构可能已改变，请稍后再试。",
    );
  }

  const seenIds = new Set();
  const usedSlugs = new Set();
  const series = [];

  for (const option of best.options) {
    if (seenIds.has(option.value)) continue;

    const normalizedTitle = normalizeTitleForMatch(option.label);
    if (!normalizedTitle || /^(ALL|すべて|全て)$/i.test(normalizedTitle)) continue;

    let slug = getSeriesSlug(normalizedTitle, option.value);
    const originalSlug = slug;
    let duplicateNumber = 2;

    while (usedSlugs.has(slug)) {
      slug = `${originalSlug}-${duplicateNumber}`;
      duplicateNumber += 1;
    }

    seenIds.add(option.value);
    usedSlugs.add(slug);
    series.push({
      seriesId: option.value,
      title: normalizedTitle,
      slug,
    });
  }

  if (series.length === 0) {
    throw new Error("系列清单为空。官方网站页面结构可能已改变。");
  }

  return series;
}

function extractCardImageRecords(html, pageUrl) {
  const imageTags = html.match(/<img\b[^>]*>/gi) ?? [];
  const records = [];
  const seenUrls = new Set();

  for (const tag of imageTags) {
    const candidateSources = [
      readAttribute(tag, "data-src"),
      readAttribute(tag, "data-original"),
      readAttribute(tag, "data-lazy-src"),
      readAttribute(tag, "data-image"),
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
      const pathname = new URL(absoluteUrl).pathname.toLowerCase();

      const isInsideCardList = normalizedUrl.includes("/images/cardlist/");
      const isPlaceholder =
        normalizedUrl.includes("/parts/") ||
        normalizedUrl.endsWith("/dummy.gif") ||
        normalizedUrl.includes("dummy") ||
        normalizedUrl.includes("loading");
      const looksLikeImage = /\.(png|jpe?g|webp|gif|avif)(?:$|\?)/i.test(
        pathname,
      );

      if (
        !isInsideCardList ||
        isPlaceholder ||
        !looksLikeImage ||
        seenUrls.has(absoluteUrl)
      ) {
        continue;
      }

      seenUrls.add(absoluteUrl);
      records.push({ alt, sourceUrl: absoluteUrl });
    }
  }

  return records;
}

async function pathExists(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile() && stats.size > 1000;
  } catch {
    return false;
  }
}

async function downloadImage(
  record,
  outputDirectory,
  pageUrl,
  usedNames,
  options,
) {
  const response = await fetchWithRetry(
    record.sourceUrl,
    {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: pageUrl,
      },
    },
    options.retries,
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("image/")) {
    throw new Error(`回传内容不是图片：${contentType || "未知类型"}`);
  }

  const sourceUrl = new URL(record.sourceUrl);
  const rawBaseName = decodeURIComponent(path.basename(sourceUrl.pathname));
  const parsed = path.parse(rawBaseName);
  const extension = parsed.ext || getExtensionFromContentType(contentType);
  const fallbackName =
    sanitizeFileName(record.alt) || `card-${createShortHash(record.sourceUrl)}`;

  let baseName = sanitizeFileName(parsed.name) || fallbackName;
  let fileName = `${baseName}${extension.toLowerCase()}`;

  if (usedNames.has(fileName) && usedNames.get(fileName) !== record.sourceUrl) {
    fileName = `${baseName}-${createShortHash(record.sourceUrl)}${extension.toLowerCase()}`;
  }

  usedNames.set(fileName, record.sourceUrl);
  const outputPath = path.join(outputDirectory, fileName);

  if (!options.force && (await pathExists(outputPath))) {
    const stats = await fs.stat(outputPath);
    return { status: "skipped", fileName, sizeBytes: stats.size };
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 1000) {
    throw new Error(`图片内容太小：${buffer.length} bytes`);
  }

  await fs.writeFile(outputPath, buffer);
  return { status: "downloaded", fileName, sizeBytes: buffer.length };
}

async function downloadSeries(series, options) {
  const pageUrl = `${CARD_LIST_BASE_URL}?search=true&series=${encodeURIComponent(
    series.seriesId,
  )}`;
  const outputDirectory = path.join(OUTPUT_ROOT, series.slug);

  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.mkdir(MANIFEST_ROOT, { recursive: true });

  console.log("");
  console.log("============================================================");
  console.log(`${series.title} [series=${series.seriesId}]`);
  console.log(`资料夹：public/cards/${series.slug}`);
  console.log("============================================================");

  const html = await fetchText(pageUrl, options.retries);
  let records = extractCardImageRecords(html, pageUrl);

  if (options.limit > 0) {
    records = records.slice(0, options.limit);
  }

  if (records.length === 0) {
    throw new Error(
      `没有找到「${series.title}」的卡图网址。官方网站页面结构可能已经改变。`,
    );
  }

  console.log(`找到 ${records.length} 个独立卡图网址。`);

  if (options.dryRun) {
    console.log("Dry run：只扫描，不下载。 ");
    return {
      title: series.title,
      seriesId: series.seriesId,
      slug: series.slug,
      found: records.length,
      downloaded: 0,
      skipped: 0,
      failed: 0,
    };
  }

  const manifest = [];
  const failures = [];
  const usedNames = new Map();
  let downloaded = 0;
  let skipped = 0;

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const progress = `[${String(index + 1).padStart(4, "0")}/${String(
      records.length,
    ).padStart(4, "0")}]`;

    try {
      const result = await downloadImage(
        record,
        outputDirectory,
        pageUrl,
        usedNames,
        options,
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
        seriesId: series.seriesId,
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

    if (options.imageDelayMs > 0) {
      await sleep(options.imageDelayMs);
    }
  }

  const manifestPath = path.join(MANIFEST_ROOT, `${series.slug}.images.json`);
  const summary = {
    generatedAt: new Date().toISOString(),
    series,
    pageUrl,
    totalFound: records.length,
    downloaded,
    skipped,
    failed: failures.length,
    images: manifest,
    failures,
  };

  await fs.writeFile(manifestPath, JSON.stringify(summary, null, 2), "utf8");

  console.log("");
  console.log(
    `完成：下载 ${downloaded}，已存在 ${skipped}，失败 ${failures.length}`,
  );
  console.log(`清单：data/download-manifests/${series.slug}.images.json`);

  return {
    title: series.title,
    seriesId: series.seriesId,
    slug: series.slug,
    found: records.length,
    downloaded,
    skipped,
    failed: failures.length,
  };
}

function selectSeries(allSeries, command) {
  const normalizedCommand = String(command ?? "all").trim().toLowerCase();

  if (!normalizedCommand || normalizedCommand === "all") {
    return allSeries;
  }

  const selected = allSeries.filter((series) => {
    return (
      series.seriesId.toLowerCase() === normalizedCommand ||
      series.slug.toLowerCase() === normalizedCommand ||
      series.title.toLowerCase() === normalizedCommand ||
      series.title.toLowerCase().includes(normalizedCommand)
    );
  });

  if (selected.length === 0) {
    throw new Error(
      `找不到指定系列「${command}」。先执行 list 查看可用系列。`,
    );
  }

  return selected;
}

async function main() {
  const { command, options } = parseArguments();

  console.log("CardZero UNION ARENA 全系列卡图下载器");
  console.log(`官方网站：${CARD_LIST_BASE_URL}`);
  console.log("正在取得最新系列清单…");

  const indexHtml = await fetchText(`${CARD_LIST_BASE_URL}?search=true`, options.retries);
  const allSeries = discoverSeriesFromHtml(indexHtml);

  await fs.mkdir(MANIFEST_ROOT, { recursive: true });
  await fs.writeFile(
    path.join(MANIFEST_ROOT, "official-series-list.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sourceUrl: `${CARD_LIST_BASE_URL}?search=true`,
        total: allSeries.length,
        series: allSeries,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`发现 ${allSeries.length} 个系列。`);

  if (command.toLowerCase() === "list") {
    console.log("");
    for (const [index, series] of allSeries.entries()) {
      console.log(
        `${String(index + 1).padStart(2, "0")}. ${series.slug.padEnd(36)} ${series.seriesId}  ${series.title}`,
      );
    }
    console.log("");
    console.log("只下载一个系列示例：");
    console.log("node .\\scripts\\download-all-union-arena-cards.mjs inuyasha");
    return;
  }

  const selectedSeries = selectSeries(allSeries, command);
  const runStartedAt = new Date().toISOString();
  const summaries = [];
  let totalFound = 0;
  let totalDownloaded = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  let failedSeries = 0;

  console.log(
    `本次任务：${selectedSeries.length === allSeries.length ? "全部系列" : selectedSeries
      .map((item) => item.title)
      .join("、")}`,
  );
  console.log(
    `图片间隔 ${options.imageDelayMs}ms｜系列间隔 ${options.seriesDelayMs}ms｜重试 ${options.retries} 次`,
  );

  for (let index = 0; index < selectedSeries.length; index += 1) {
    const series = selectedSeries[index];

    try {
      const summary = await downloadSeries(series, options);
      summaries.push(summary);
      totalFound += summary.found;
      totalDownloaded += summary.downloaded;
      totalSkipped += summary.skipped;
      totalFailed += summary.failed;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failedSeries += 1;
      summaries.push({
        title: series.title,
        seriesId: series.seriesId,
        slug: series.slug,
        found: 0,
        downloaded: 0,
        skipped: 0,
        failed: 0,
        seriesError: message,
      });
      console.error(`系列失败：${series.title}｜${message}`);
    }

    if (index < selectedSeries.length - 1 && options.seriesDelayMs > 0) {
      await sleep(options.seriesDelayMs);
    }
  }

  const runSummary = {
    startedAt: runStartedAt,
    finishedAt: new Date().toISOString(),
    sourceUrl: CARD_LIST_BASE_URL,
    selectedSeries: selectedSeries.length,
    failedSeries,
    totalFound,
    totalDownloaded,
    totalSkipped,
    totalFailed,
    options,
    series: summaries,
  };

  const runFileName = `all-series-run-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`;

  await fs.writeFile(
    path.join(MANIFEST_ROOT, runFileName),
    JSON.stringify(runSummary, null, 2),
    "utf8",
  );

  console.log("");
  console.log("============================================================");
  console.log("全部任务完成");
  console.log(`系列：${selectedSeries.length}｜系列失败：${failedSeries}`);
  console.log(`发现卡图：${totalFound}`);
  console.log(`新下载：${totalDownloaded}`);
  console.log(`已存在：${totalSkipped}`);
  console.log(`单张失败：${totalFailed}`);
  console.log(`总清单：data/download-manifests/${runFileName}`);
  console.log("============================================================");

  if (failedSeries > 0 || totalFailed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("");
  console.error(
    "下载任务中止：",
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
});
