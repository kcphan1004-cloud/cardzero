import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import * as cheerio from "cheerio";

const ROOT = process.cwd();

const CARD_TABLE_PATH = path.join(
  ROOT,
  "data",
  "card-series-generated",
  "black-clover.ts",
);

const BACKUP_PATH = path.join(
  ROOT,
  "data",
  "card-series-generated",
  "black-clover.before-full-details.ts",
);

const RAW_OUTPUT_PATH = path.join(
  ROOT,
  "data",
  "raw-card-data",
  "black-clover-full-details.json",
);

const REPORT_PATH = path.join(
  ROOT,
  "data",
  "raw-card-data",
  "black-clover-full-details-report.json",
);

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/150.0.0.0 Safari/537.36 CardZero-Data-Research/1.0";

const PRODUCT_GROUPS = [
  {
    label: "黑色五叶草 UA20ST",
    url: "https://www.merucarduniari.jp/product-group/31",
    prefix: "UA20ST/BCV-1-",
  },
  {
    label: "黑色五叶草 UA20BT",
    url: "https://www.merucarduniari.jp/product-group/58",
    prefix: "UA20BT/BCV-1-",
  },
];

const REQUEST_DELAY_MS = 350;
const MAX_GROUP_PAGES = 10;
const MINIMUM_DETAIL_RECORDS = 90;

function sleep(milliseconds) {
  return new Promise((resolve) =>
    setTimeout(resolve, milliseconds),
  );
}

function removeBom(value) {
  return String(value ?? "").replace(/^\uFEFF/, "");
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t　]+/g, " ")
    .replace(/\r/g, "")
    .trim();
}

function normalizeSingleLine(value) {
  return normalizeText(value)
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMultiline(value) {
  return normalizeText(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function normalizeCardNumber(value) {
  return normalizeSingleLine(value)
    .replace(/\\/g, "/")
    .replace(/_/g, "/")
    .replace(/★/g, "")
    .toUpperCase();
}

function parsePositiveInteger(value, fallback = 0) {
  const match = String(value ?? "").match(/\d+/);
  return match ? Number(match[0]) : fallback;
}

async function fetchText(url, retries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "ja,en-US;q=0.8,en;q=0.7",
        },
      });

      if (response.ok) {
        return response.text();
      }

      lastError = new Error(
        `HTTP ${response.status} ${response.statusText}`,
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

function elementTextWithBreaks($, element) {
  const clone = $(element).clone();

  clone.find("br").replaceWith("\n");
  clone.find("p, div, li, dt, dd, tr").each((_, child) => {
    $(child).append("\n");
  });

  return normalizeMultiline(clone.text());
}

function extractCardNumber(value) {
  const match = normalizeSingleLine(value).match(
    /(UA20(?:ST|BT)\/BCV-1-(?:\d{3}|AP\d{2}))/i,
  );

  return match ? normalizeCardNumber(match[1]) : "";
}

function isParallelText(value) {
  return /パラレル|R★|SR★|U★|C★|星|★/.test(
    normalizeSingleLine(value),
  );
}

async function collectProductLinks(group) {
  const byNumber = new Map();
  let pagesWithNoNewLinks = 0;

  for (
    let pageNumber = 1;
    pageNumber <= MAX_GROUP_PAGES;
    pageNumber += 1
  ) {
    const pageUrl =
      pageNumber === 1
        ? group.url
        : `${group.url}?page=${pageNumber}`;

    console.log(`读取商品目录：${pageUrl}`);

    const html = await fetchText(pageUrl);
    const $ = cheerio.load(html);
    let newLinks = 0;

    $('a[href*="/product/"]').each((_, element) => {
      const href = $(element).attr("href") ?? "";
      const text = normalizeSingleLine(
        [
          $(element).text(),
          $(element).attr("title"),
          $(element).find("img").attr("alt"),
        ]
          .filter(Boolean)
          .join(" "),
      );

      const number = extractCardNumber(text);

      if (!number || !number.startsWith(group.prefix)) {
        return;
      }

      let absoluteUrl;

      try {
        absoluteUrl = new URL(href, pageUrl).toString();
      } catch {
        return;
      }

      const candidate = {
        number,
        url: absoluteUrl,
        text,
        parallel: isParallelText(text),
      };

      const current = byNumber.get(number);

      // 同一卡号优先采用普通版商品页。
      if (
        !current ||
        (current.parallel && !candidate.parallel)
      ) {
        if (!current) {
          newLinks += 1;
        }

        byNumber.set(number, candidate);
      }
    });

    console.log(
      `第 ${pageNumber} 页新增 ${newLinks} 个卡号，累计 ${byNumber.size} 个。`,
    );

    if (newLinks === 0) {
      pagesWithNoNewLinks += 1;
    } else {
      pagesWithNoNewLinks = 0;
    }

    if (pagesWithNoNewLinks >= 2) {
      break;
    }

    await sleep(REQUEST_DELAY_MS);
  }

  return [...byNumber.values()];
}

function findShortestLabeledValue($, labels) {
  const candidates = [];

  $("li, p, div, dd, td").each((_, element) => {
    const text = elementTextWithBreaks($, element);

    for (const label of labels) {
      const index = text.indexOf(label);

      if (index === -1) {
        continue;
      }

      let value = text
        .slice(index + label.length)
        .replace(/^[\s:：≫》]+/, "")
        .trim();

      if (!value) {
        continue;
      }

      // 父层元素可能包含整页内容。优先选择较短、较精确的节点。
      candidates.push({
        value,
        length: value.length,
      });
    }
  });

  candidates.sort((a, b) => a.length - b.length);
  return candidates[0]?.value ?? "";
}

function parseTitleData($) {
  const heading = normalizeSingleLine(
    $("h1").first().text() ||
      $("title").first().text(),
  );

  const number = extractCardNumber(heading);

  const nameMatch = heading.match(
    /^(?:《特価品》)?\s*(.*?)\/[^【\[]+/,
  );

  const rarityMatch = heading.match(
    /\/([A-Za-z]+)★?【/,
  );

  const colorMatch = heading.match(
    /【([^】]*)】【/,
  );

  const typeMatch = heading.match(
    /【[^】]*】【([^】]*)】/,
  );

  return {
    heading,
    number,
    name: normalizeSingleLine(nameMatch?.[1] ?? ""),
    rarity: normalizeSingleLine(rarityMatch?.[1] ?? ""),
    color: normalizeSingleLine(colorMatch?.[1] ?? ""),
    type: normalizeSingleLine(typeMatch?.[1] ?? ""),
  };
}

function translateColor(value) {
  const map = {
    赤: "红色",
    青: "蓝色",
    黄: "黄色",
    緑: "绿色",
    紫: "紫色",
  };

  return map[normalizeSingleLine(value)] ?? normalizeSingleLine(value);
}

function translateType(value) {
  const map = {
    キャラクター: "角色卡",
    フィールド: "场地卡",
    イベント: "事件卡",
    アクションポイント: "行动点卡",
  };

  return map[normalizeSingleLine(value)] ?? normalizeSingleLine(value);
}

function cleanDetailValue(value) {
  return normalizeMultiline(value)
    .replace(
      /\n(?:本商品の店頭買取|関連グループ|Image:|販売価格|在庫数)[\s\S]*$/i,
      "",
    )
    .trim();
}

function parseProductPage(html, sourceUrl) {
  const $ = cheerio.load(html);
  const titleData = parseTitleData($);

  const cardType =
    findShortestLabeledValue($, [
      "≪カード種類≫",
      "カード種類:",
    ]) || titleData.type;

  const colorAndCost =
    findShortestLabeledValue($, [
      "≪カードの色／必要エナジー≫",
      "カードの色／必要エナジー:",
    ]);

  const generatedColor = findShortestLabeledValue($, [
    "≪発生エナジー≫",
    "発生エナジー:",
  ]);

  const generatedEnergy = findShortestLabeledValue($, [
    "≪発生エナジー数≫",
    "発生エナジー数:",
  ]);

  const ap = findShortestLabeledValue($, [
    "≪消費AP≫",
    "消費AP:",
  ]);

  const bp = findShortestLabeledValue($, [
    "≪BP≫",
    "BP:",
  ]);

  const feature = findShortestLabeledValue($, [
    "特徴:",
  ]);

  const rarity =
    findShortestLabeledValue($, [
      "レアリティ:",
    ]) || titleData.rarity;

  const effect = cleanDetailValue(
    findShortestLabeledValue($, [
      "効果:",
    ]),
  );

  const trigger = cleanDetailValue(
    findShortestLabeledValue($, [
      "トリガー:",
    ]),
  );

  const colorCostParts = normalizeSingleLine(
    colorAndCost,
  ).split("/");

  const color =
    colorCostParts[0] ||
    titleData.color ||
    generatedColor;

  const cost = parsePositiveInteger(
    colorCostParts.at(-1),
    0,
  );

  const number = titleData.number;

  if (!number) {
    throw new Error(
      `商品页无法识别卡号：${sourceUrl}`,
    );
  }

  return {
    number,
    name: titleData.name,
    series: "黑色五叶草",
    color: translateColor(color),
    type: translateType(cardType),
    rarity: normalizeSingleLine(rarity) || "-",
    cost,
    ap: parsePositiveInteger(ap, 0),
    bp: normalizeSingleLine(bp) || "-",
    feature: normalizeSingleLine(feature) || "-",
    generatedEnergy:
      normalizeSingleLine(generatedEnergy) || "-",
    effect,
    trigger:
      trigger === "-" ? "" : trigger,
    sourceUrl,
  };
}

function readCardArrayFromTypeScript(raw) {
  const exportPosition = raw.indexOf("export const");

  if (exportPosition === -1) {
    throw new Error(
      "black-clover.ts 内找不到 export const。",
    );
  }

  const assignmentPosition = raw.indexOf(
    "=",
    exportPosition,
  );

  if (assignmentPosition === -1) {
    throw new Error(
      "black-clover.ts 内找不到阵列赋值符号。",
    );
  }

  const arrayStart = raw.indexOf(
    "[",
    assignmentPosition,
  );

  const arrayEndMarker = raw.lastIndexOf("];");

  if (
    arrayStart === -1 ||
    arrayEndMarker === -1 ||
    arrayEndMarker < arrayStart
  ) {
    throw new Error(
      "black-clover.ts 的卡牌阵列格式无法识别。",
    );
  }

  const cards = JSON.parse(
    raw.slice(arrayStart, arrayEndMarker + 1),
  );

  if (!Array.isArray(cards)) {
    throw new Error(
      "black-clover.ts 的资料不是阵列。",
    );
  }

  return {
    cards,
    arrayStart,
    arrayEnd: arrayEndMarker,
  };
}

function hasUsefulDetails(card) {
  return Boolean(
    card &&
      card.number &&
      card.type &&
      card.type !== "资料待补" &&
      card.color &&
      card.color !== "资料待补" &&
      (
        card.effect ||
        card.bp !== "-" ||
        card.type === "场地卡" ||
        card.type === "事件卡"
      ),
  );
}

async function main() {
  console.log(
    "CardZero 黑色五叶草完整资料补全工具",
  );
  console.log(
    "====================================",
  );

  const productLinks = [];

  for (const group of PRODUCT_GROUPS) {
    console.log("");
    console.log(group.label);

    const links = await collectProductLinks(group);
    productLinks.push(...links);

    console.log(
      `${group.label} 找到 ${links.length} 个独立卡号商品页。`,
    );
  }

  const uniqueLinks = new Map();

  for (const item of productLinks) {
    const current = uniqueLinks.get(item.number);

    if (
      !current ||
      (current.parallel && !item.parallel)
    ) {
      uniqueLinks.set(item.number, item);
    }
  }

  console.log("");
  console.log(
    `准备读取 ${uniqueLinks.size} 个独立卡号的详细资料。`,
  );

  const details = [];
  const failures = [];
  let currentIndex = 0;

  for (const item of uniqueLinks.values()) {
    currentIndex += 1;

    try {
      const html = await fetchText(item.url);
      const detail = parseProductPage(html, item.url);

      if (!hasUsefulDetails(detail)) {
        throw new Error(
          "页面已读取，但详细字段不足。",
        );
      }

      details.push(detail);

      console.log(
        `[${currentIndex}/${uniqueLinks.size}] 完成 ${detail.number} ${detail.name}`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      failures.push({
        number: item.number,
        url: item.url,
        error: message,
      });

      console.error(
        `[${currentIndex}/${uniqueLinks.size}] 失败 ${item.number}｜${message}`,
      );
    }

    await sleep(REQUEST_DELAY_MS);
  }

  const detailsByNumber = new Map(
    details.map((card) => [
      normalizeCardNumber(card.number),
      card,
    ]),
  );

  if (detailsByNumber.size < MINIMUM_DETAIL_RECORDS) {
    await fs.mkdir(
      path.dirname(REPORT_PATH),
      { recursive: true },
    );

    await fs.writeFile(
      REPORT_PATH,
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          status: "aborted",
          reason:
            "成功取得的详细卡号太少，为保护现有卡表，脚本没有修改 black-clover.ts。",
          productLinks: uniqueLinks.size,
          successfulDetails: detailsByNumber.size,
          failures,
          details,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    throw new Error(
      `只取得 ${detailsByNumber.size} 个完整卡号，低于安全门槛 ${MINIMUM_DETAIL_RECORDS}。已停止更新。`,
    );
  }

  const tableRaw = removeBom(
    await fs.readFile(CARD_TABLE_PATH, "utf8"),
  );

  const {
    cards,
    arrayStart,
    arrayEnd,
  } = readCardArrayFromTypeScript(tableRaw);

  try {
    await fs.access(BACKUP_PATH);
  } catch {
    await fs.writeFile(
      BACKUP_PATH,
      tableRaw,
      "utf8",
    );
  }

  let matchedRows = 0;
  let unmatchedRows = 0;
  const unmatchedNumbers = [];

  const updatedCards = cards.map((card) => {
    const number = normalizeCardNumber(
      card.number,
    );

    const source = detailsByNumber.get(number);

    if (!source) {
      unmatchedRows += 1;
      unmatchedNumbers.push(number);
      return card;
    }

    matchedRows += 1;

    const isActionPoint = /-AP\d+$/i.test(number);

    return {
      ...card,
      name: source.name || card.name,
      series: "黑色五叶草",
      color:
        source.color ||
        card.color,
      type: isActionPoint
        ? "行动点卡"
        : source.type || card.type,
      rarity: isActionPoint
        ? "AP"
        : source.rarity || card.rarity,
      cost: isActionPoint
        ? 0
        : source.cost,
      ap: isActionPoint
        ? 0
        : source.ap,
      bp: isActionPoint
        ? "-"
        : source.bp,
      feature: isActionPoint
        ? "-"
        : source.feature,
      generatedEnergy: isActionPoint
        ? "-"
        : source.generatedEnergy,
      effect: isActionPoint
        ? ""
        : source.effect,
      trigger: isActionPoint
        ? ""
        : source.trigger,
    };
  });

  const updatedRaw =
    tableRaw.slice(0, arrayStart) +
    JSON.stringify(updatedCards, null, 2) +
    tableRaw.slice(arrayEnd + 1);

  await fs.mkdir(
    path.dirname(RAW_OUTPUT_PATH),
    { recursive: true },
  );

  await fs.writeFile(
    RAW_OUTPUT_PATH,
    `${JSON.stringify(details, null, 2)}\n`,
    "utf8",
  );

  await fs.writeFile(
    CARD_TABLE_PATH,
    updatedRaw,
    "utf8",
  );

  const report = {
    generatedAt: new Date().toISOString(),
    status: "completed",
    sourceGroups: PRODUCT_GROUPS,
    productLinks: uniqueLinks.size,
    uniqueDetails: detailsByNumber.size,
    tableRows: cards.length,
    matchedRows,
    unmatchedRows,
    unmatchedNumbers: [
      ...new Set(unmatchedNumbers),
    ],
    failures,
    note:
      "详细资料来自第三方卡牌商店页面，建议与官方卡图及官方规则资料抽样核对后再公开。",
  };

  await fs.writeFile(
    REPORT_PATH,
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );

  console.log("");
  console.log(
    "====================================",
  );
  console.log(
    "黑色五叶草完整资料补全完成",
  );
  console.log(
    `独立详细卡号：${detailsByNumber.size}`,
  );
  console.log(
    `成功更新卡表：${matchedRows} 行`,
  );
  console.log(
    `未匹配卡表：${unmatchedRows} 行`,
  );
  console.log(
    `读取失败：${failures.length} 个卡号`,
  );
  console.log(
    `备份：${path.relative(ROOT, BACKUP_PATH)}`,
  );
  console.log(
    `原始资料：${path.relative(ROOT, RAW_OUTPUT_PATH)}`,
  );
  console.log(
    `报告：${path.relative(ROOT, REPORT_PATH)}`,
  );
}

main().catch((error) => {
  console.error("");
  console.error(
    "执行失败：",
    error instanceof Error
      ? error.message
      : error,
  );

  process.exitCode = 1;
});
