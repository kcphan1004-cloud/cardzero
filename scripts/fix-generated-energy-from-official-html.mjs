import fs from "node:fs/promises";
import path from "node:path";

const PROJECT_ROOT = process.cwd();
const GENERATED_DIR = path.join(
  PROJECT_ROOT,
  "data",
  "card-series-generated",
);
const STAGE2_DIR = path.join(
  PROJECT_ROOT,
  "data",
  "stage2",
);
const REPORT_PATH = path.join(
  STAGE2_DIR,
  "generated-energy-audit.json",
);
const FETCH_CACHE_DIR = path.join(
  STAGE2_DIR,
  "generated-energy-html",
);

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const FETCH_MISSING = args.includes(
  "--fetch-missing",
);

const delayArg = args.find((arg) =>
  arg.startsWith("--delay="),
);
const FETCH_DELAY_MS = Math.max(
  150,
  Number.parseInt(
    delayArg?.slice("--delay=".length) ?? "400",
    10,
  ) || 400,
);

const colorDefinitions = [
  {
    key: "yellow",
    zh: "黄色",
    aliases: ["yellow", "黄色", "黃色", "黄", "黃"],
  },
  {
    key: "red",
    zh: "红色",
    aliases: ["red", "红色", "紅色", "红", "紅", "赤"],
  },
  {
    key: "blue",
    zh: "蓝色",
    aliases: ["blue", "蓝色", "藍色", "蓝", "藍", "青"],
  },
  {
    key: "green",
    zh: "绿色",
    aliases: ["green", "绿色", "綠色", "绿", "綠", "緑"],
  },
  {
    key: "purple",
    zh: "紫色",
    aliases: ["purple", "紫色", "紫"],
  },
];

const colorOrder = new Map(
  colorDefinitions.map((item, index) => [
    item.key,
    index,
  ]),
);

function sleep(ms) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms),
  );
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripTags(value) {
  return decodeHtml(
    String(value ?? "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function readAttribute(tag, name) {
  const escapedName = name.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );

  const quoted = tag.match(
    new RegExp(
      `${escapedName}\\s*=\\s*(["'])([\\s\\S]*?)\\1`,
      "i",
    ),
  );

  if (quoted) {
    return decodeHtml(quoted[2]).trim();
  }

  const bare = tag.match(
    new RegExp(
      `${escapedName}\\s*=\\s*([^\\s>]+)`,
      "i",
    ),
  );

  return decodeHtml(bare?.[1] ?? "").trim();
}

function normalizeCardNumber(value) {
  return String(value ?? "")
    .trim()
    .replaceAll("\\", "/")
    .toUpperCase();
}

function findColorKey(value) {
  const normalized = String(value ?? "")
    .toLowerCase();

  for (const definition of colorDefinitions) {
    if (
      definition.aliases.some((alias) =>
        normalized.includes(alias.toLowerCase()),
      )
    ) {
      return definition.key;
    }
  }

  return "";
}

function collectEnergyGroupsFromHtml(html) {
  const imageTags =
    String(html ?? "").match(
      /<img\b[^>]*ico_resource_energy_[^>]*>/gi,
    ) ?? [];

  const groups = new Map();

  for (const imageTag of imageTags) {
    const src = readAttribute(imageTag, "src");
    const alt = readAttribute(imageTag, "alt");
    const colorKey = findColorKey(`${src} ${alt}`);

    if (!colorKey) {
      continue;
    }

    // 官方文件名末尾数字是图标版本，不是能量数量。
    // 每一个 resource energy <img> 才代表 1 点能量。
    groups.set(
      colorKey,
      (groups.get(colorKey) ?? 0) + 1,
    );
  }

  return {
    groups,
    imageCount: imageTags.length,
  };
}

function energyTokenFromImageTag(imageTag) {
  const src = readAttribute(imageTag, "src");
  const alt = readAttribute(imageTag, "alt");

  if (
    !/ico_resource_energy_/i.test(src)
  ) {
    return "";
  }

  const colorKey =
    findColorKey(`${src} ${alt}`);

  return colorKey
    ? ` [[ENERGY:${colorKey}]] `
    : " [[ENERGY:unknown]] ";
}

function effectHtmlToTokenText(html) {
  return decodeHtml(
    String(html ?? "")
      /*
       * 先将能量图片替换成稳定 Token。
       * 这样即使“＋”本身是图片，或文字被 HTML 标签拆开，
       * 仍然可以根据“発生エナジー”后出现的 Token 判断加成。
       */
      .replace(
        /<img\b[^>]*>/gi,
        (imageTag) =>
          energyTokenFromImageTag(imageTag),
      )
      .replace(
        /<br\s*\/?>/gi,
        "\n",
      )
      .replace(
        /<\/(?:p|li|div|dd|span)>/gi,
        " ",
      )
      .replace(
        /<[^>]+>/g,
        "",
      ),
  )
    .replace(/\u3000/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\r/g, "")
    .trim();
}

function mergeEnergyGroups(
  target,
  source,
) {
  for (const [colorKey, count] of source) {
    target.set(
      colorKey,
      (target.get(colorKey) ?? 0) +
        count,
    );
  }
}

function parseEnergyTokens(value) {
  const groups = new Map();

  for (
    const match of String(value ?? "").matchAll(
      /\[\[ENERGY:([a-z]+)\]\]/gi,
    )
  ) {
    const colorKey =
      String(match[1] ?? "").toLowerCase();

    if (
      !colorOrder.has(colorKey)
    ) {
      continue;
    }

    groups.set(
      colorKey,
      (groups.get(colorKey) ?? 0) + 1,
    );
  }

  return groups;
}

function extractGeneratedEnergyBonus(html) {
  const effectBlocks = [
    ...String(html ?? "").matchAll(
      /<dl\b[^>]*class=["'][^"']*\beffectData\b[^"']*["'][^>]*>([\s\S]*?)<\/dl>/gi,
    ),
  ].map((match) => match[1]);

  const groups = new Map();
  const evidence = [];
  const warnings = [];

  for (const effectBlock of effectBlocks) {
    const tokenText =
      effectHtmlToTokenText(effectBlock);

    /*
     * 官方效果常见形式：
     *   このキャラの発生エナジー＋[绿色图标]
     *
     * “＋”可能是文字、全角符号或图片，所以这里不依赖加号；
     * 只检查“発生エナジー”之后、句号之前是否出现能量 Token。
     */
    const markerPattern =
      /発生\s*エナジー/gi;

    for (
      const marker of tokenText.matchAll(
        markerPattern,
      )
    ) {
      const markerStart =
        marker.index ?? 0;

      const afterMarker =
        tokenText.slice(
          markerStart +
            marker[0].length,
          markerStart +
            marker[0].length +
            240,
        );

      const sentenceEndCandidates = [
        afterMarker.indexOf("。"),
        afterMarker.indexOf("\n"),
        afterMarker.indexOf("；"),
        afterMarker.indexOf(";"),
      ].filter((value) => value >= 0);

      const sentence =
        sentenceEndCandidates.length > 0
          ? afterMarker.slice(
              0,
              Math.min(
                ...sentenceEndCandidates,
              ),
            )
          : afterMarker;

      const tokenGroups =
        parseEnergyTokens(sentence);

      if (tokenGroups.size === 0) {
        continue;
      }

      /*
       * 排除“发生产生能量减少”这类负向效果。
       * 负号可能在 Token 前后出现。
       */
      const plainSentence = sentence
        .replace(
          /\[\[ENERGY:[a-z]+\]\]/gi,
          " 能量图标 ",
        )
        .replace(/\s+/g, " ")
        .trim();

      const negative =
        /(?:-|−|－)\s*(?:能量图标|\d)|(?:発生\s*エナジー)[^。]{0,80}(?:減|减|マイナス|-|−|－)/i.test(
          `${marker[0]}${plainSentence}`,
        );

      if (negative) {
        continue;
      }

      mergeEnergyGroups(
        groups,
        tokenGroups,
      );

      evidence.push({
        text: `${marker[0]}${plainSentence}`.slice(
          0,
          180,
        ),
        groups:
          formatGeneratedEnergy(
            tokenGroups,
          ),
      });
    }
  }

  /*
   * 同一效果区可能因为重复 DOM / 移动版 HTML 而出现相同句子。
   * 以“文字＋能量组合”去重，避免重复加算。
   */
  const uniqueEvidence = [];
  const seenEvidence = new Set();
  const dedupedGroups = new Map();

  for (const item of evidence) {
    const key =
      `${item.text}|${item.groups}`;

    if (seenEvidence.has(key)) {
      continue;
    }

    seenEvidence.add(key);
    uniqueEvidence.push(item);

    const parsedGroups =
      new Map();

    for (
      const part of item.groups.split("＋")
    ) {
      const match = part.match(
        /^(黄色|红色|蓝色|绿色|紫色)×(\d+)$/,
      );

      if (!match) {
        continue;
      }

      const definition =
        colorDefinitions.find(
          (entry) =>
            entry.zh === match[1],
        );

      if (!definition) {
        continue;
      }

      parsedGroups.set(
        definition.key,
        Number.parseInt(
          match[2],
          10,
        ),
      );
    }

    mergeEnergyGroups(
      dedupedGroups,
      parsedGroups,
    );
  }

  if (
    evidence.length > 0 &&
    uniqueEvidence.length === 0
  ) {
    warnings.push(
      "找到效果产生能量记录，但去重后为空。",
    );
  }

  return {
    groups: dedupedGroups,
    matched:
      uniqueEvidence.length > 0,
    evidence: uniqueEvidence,
    warnings,
  };
}

function formatGeneratedEnergy(groups) {
  const entries = [...groups.entries()]
    .filter(([, count]) => count > 0)
    .sort(
      ([colorA], [colorB]) =>
        (colorOrder.get(colorA) ?? 99) -
        (colorOrder.get(colorB) ?? 99),
    );

  if (entries.length === 0) {
    return "-";
  }

  return entries
    .map(([colorKey, count]) => {
      const definition = colorDefinitions.find(
        (item) => item.key === colorKey,
      );

      return `${definition?.zh ?? colorKey}×${count}`;
    })
    .join("＋");
}

function parseOfficialHtml(html, sourcePath) {
  const numberMatch = html.match(
    /class=["'][^"']*\bcardNumData\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
  );

  const number = normalizeCardNumber(
    stripTags(numberMatch?.[1] ?? ""),
  );

  if (!number) {
    return null;
  }

  const blockMatch = html.match(
    /<dl\b[^>]*class=["'][^"']*\bgeneratedEnergyData\b[^"']*["'][^>]*>([\s\S]*?)<\/dl>/i,
  );

  if (!blockMatch) {
    return {
      number,
      generatedEnergy: "-",
      sourcePath,
      warning:
        "找不到 generatedEnergyData 区块。",
    };
  }

  const block = blockMatch[1];
  const base =
    collectEnergyGroupsFromHtml(block);
  const bonus =
    extractGeneratedEnergyBonus(html);

  const baseText =
    formatGeneratedEnergy(base.groups);
  const bonusText =
    formatGeneratedEnergy(bonus.groups);

  const generatedEnergy =
    bonusText !== "-"
      ? `${baseText}（效果＋${bonusText}）`
      : baseText;

  const warnings = [];

  if (
    base.imageCount > 0 &&
    base.groups.size === 0
  ) {
    warnings.push(
      "找到基础能量图片，但无法识别颜色。",
    );
  }

  if (
    bonus.matched &&
    bonus.groups.size === 0
  ) {
    warnings.push(
      "找到产生能量加成文字，但无法识别加成颜色。",
    );
  }

  return {
    number,
    generatedEnergy,
    sourcePath,
    bonusEvidence:
      bonus.evidence ?? [],
    warning: [
      ...warnings,
      ...(bonus.warnings ?? []),
    ]
      .filter(Boolean)
      .join(" "),
  };
}

async function listFilesRecursive(directory) {
  const output = [];

  async function walk(current) {
    let entries;

    try {
      entries = await fs.readdir(current, {
        withFileTypes: true,
      });
    } catch {
      return;
    }

    for (const entry of entries) {
      const absolutePath = path.join(
        current,
        entry.name,
      );

      if (entry.isDirectory()) {
        await walk(absolutePath);
      } else {
        output.push(absolutePath);
      }
    }
  }

  await walk(directory);
  return output;
}

async function loadOfficialHtmlMap() {
  const files = (
    await listFilesRecursive(STAGE2_DIR)
  ).filter((filePath) =>
    filePath.toLowerCase().endsWith(".html"),
  );

  const map = new Map();
  const conflicts = [];
  const warnings = [];

  for (const filePath of files) {
    let html;

    try {
      html = await fs.readFile(filePath, "utf8");
    } catch {
      continue;
    }

    const parsed = parseOfficialHtml(
      html,
      path.relative(PROJECT_ROOT, filePath),
    );

    if (!parsed) {
      continue;
    }

    if (parsed.warning) {
      warnings.push(parsed);
    }

    const previous = map.get(parsed.number);

    if (
      previous &&
      previous.generatedEnergy !==
        parsed.generatedEnergy
    ) {
      conflicts.push({
        number: parsed.number,
        first: previous,
        second: parsed,
      });
      continue;
    }

    map.set(parsed.number, parsed);
  }

  return {
    map,
    filesScanned: files.length,
    conflicts,
    warnings,
  };
}

async function loadGeneratedFiles() {
  const entries = await fs.readdir(
    GENERATED_DIR,
    {
      withFileTypes: true,
    },
  );

  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".ts") &&
        !["index.ts", "types.ts"].includes(
          entry.name,
        ),
    )
    .map((entry) =>
      path.join(GENERATED_DIR, entry.name),
    );
}

function collectCardNumbers(text) {
  const numbers = new Set();
  const pattern =
    /"number"\s*:\s*"([^"]+)"/g;

  for (const match of text.matchAll(pattern)) {
    numbers.add(normalizeCardNumber(match[1]));
  }

  return numbers;
}

async function collectAllCardNumbers(files) {
  const numbers = new Set();

  for (const filePath of files) {
    const text = await fs.readFile(
      filePath,
      "utf8",
    );

    for (const number of collectCardNumbers(text)) {
      numbers.add(number);
    }
  }

  return numbers;
}

async function fetchWithRetry(url, retries = 3) {
  let lastError;

  for (
    let attempt = 1;
    attempt <= retries;
    attempt += 1
  ) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "CardZero generated-energy repair/4.0",
          Accept:
            "text/html,application/xhtml+xml",
          "Accept-Language":
            "ja,en-US;q=0.8,en;q=0.7",
        },
      });

      if (response.ok) {
        return response.text();
      }

      lastError = new Error(
        `HTTP ${response.status}`,
      );
    } catch (error) {
      lastError = error;
    }

    if (attempt < retries) {
      await sleep(1000 * attempt);
    }
  }

  throw lastError;
}

function safeFileName(number) {
  return number
    .replaceAll("/", "_")
    .replace(/[^A-Z0-9_.-]+/gi, "_");
}

async function fetchMissingHtml(
  allNumbers,
  officialMap,
) {
  const missing = [...allNumbers].filter(
    (number) => !officialMap.has(number),
  );

  if (missing.length === 0) {
    return {
      attempted: 0,
      fetched: 0,
      failed: [],
    };
  }

  await fs.mkdir(FETCH_CACHE_DIR, {
    recursive: true,
  });

  let fetched = 0;
  const failed = [];

  console.log(
    `需要补抓 ${missing.length} 个官方详情页。`,
  );

  for (
    let index = 0;
    index < missing.length;
    index += 1
  ) {
    const number = missing[index];
    const progress = `[${index + 1}/${missing.length}]`;
    const url =
      "https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=" +
      encodeURIComponent(number);

    try {
      const html = await fetchWithRetry(url);
      const filePath = path.join(
        FETCH_CACHE_DIR,
        `${safeFileName(number)}.html`,
      );

      await fs.writeFile(
        filePath,
        html,
        "utf8",
      );

      const parsed = parseOfficialHtml(
        html,
        path.relative(PROJECT_ROOT, filePath),
      );

      if (!parsed) {
        throw new Error(
          "页面内找不到卡号。",
        );
      }

      officialMap.set(number, parsed);
      fetched += 1;
      console.log(
        `${progress} 完成：${number} → ${parsed.generatedEnergy}`,
      );
    } catch (error) {
      failed.push({
        number,
        url,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      });
      console.error(
        `${progress} 失败：${number}`,
      );
    }

    if (index + 1 < missing.length) {
      await sleep(FETCH_DELAY_MS);
    }
  }

  return {
    attempted: missing.length,
    fetched,
    failed,
  };
}

function updateFileText(
  text,
  officialMap,
  fileName,
) {
  const changes = [];
  let cardRecords = 0;
  let matchedRecords = 0;

  const pattern =
    /("number"\s*:\s*"([^"]+)"[\s\S]*?"generatedEnergy"\s*:\s*)"([^"]*)"/g;

  const output = text.replace(
    pattern,
    (
      fullMatch,
      prefix,
      rawNumber,
      currentValue,
    ) => {
      cardRecords += 1;

      const number =
        normalizeCardNumber(rawNumber);
      const official =
        officialMap.get(number);

      if (!official) {
        return fullMatch;
      }

      matchedRecords += 1;

      const nextValue =
        official.generatedEnergy;

      if (currentValue === nextValue) {
        return fullMatch;
      }

      changes.push({
        file: fileName,
        number,
        before: currentValue,
        after: nextValue,
        source: official.sourcePath,
        bonusEvidence:
          official.bonusEvidence ?? [],
      });

      return `${prefix}"${nextValue}"`;
    },
  );

  return {
    output,
    changes,
    cardRecords,
    matchedRecords,
  };
}

async function createBackup(files) {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  const backupDirectory = path.join(
    STAGE2_DIR,
    "backups",
    `generated-energy-${timestamp}`,
  );

  await fs.mkdir(backupDirectory, {
    recursive: true,
  });

  for (const filePath of files) {
    await fs.copyFile(
      filePath,
      path.join(
        backupDirectory,
        path.basename(filePath),
      ),
    );
  }

  return backupDirectory;
}

async function main() {
  console.log(
    "CardZero 全系列产生能量校正工具",
  );
  console.log(
    APPLY
      ? "模式：正式写入"
      : "模式：只检查，不修改",
  );

  const generatedFiles =
    await loadGeneratedFiles();

  const allNumbers =
    await collectAllCardNumbers(generatedFiles);

  const official = await loadOfficialHtmlMap();

  console.log(
    `资料文件：${generatedFiles.length}`,
  );
  console.log(
    `独立卡号：${allNumbers.size}`,
  );
  console.log(
    `官方 HTML：${official.filesScanned}`,
  );
  console.log(
    `已解析官方卡号：${official.map.size}`,
  );

  let fetchResult = {
    attempted: 0,
    fetched: 0,
    failed: [],
  };

  if (FETCH_MISSING) {
    fetchResult = await fetchMissingHtml(
      allNumbers,
      official.map,
    );
  }

  const pendingWrites = [];
  const allChanges = [];
  let totalCardRecords = 0;
  let totalMatchedRecords = 0;

  for (const filePath of generatedFiles) {
    const text = await fs.readFile(
      filePath,
      "utf8",
    );

    const result = updateFileText(
      text,
      official.map,
      path.basename(filePath),
    );

    totalCardRecords += result.cardRecords;
    totalMatchedRecords +=
      result.matchedRecords;
    allChanges.push(...result.changes);

    if (result.changes.length > 0) {
      pendingWrites.push({
        filePath,
        output: result.output,
      });
    }
  }

  const missingNumbers = [...allNumbers]
    .filter(
      (number) => !official.map.has(number),
    )
    .sort();

  let backupDirectory = "";

  if (APPLY && pendingWrites.length > 0) {
    backupDirectory =
      await createBackup(
        pendingWrites.map(
          (item) => item.filePath,
        ),
      );

    for (const item of pendingWrites) {
      await fs.writeFile(
        item.filePath,
        item.output,
        "utf8",
      );
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? "apply" : "audit",
    generatedFiles:
      generatedFiles.length,
    totalCardRecords,
    uniqueCardNumbers:
      allNumbers.size,
    officialHtmlFilesScanned:
      official.filesScanned,
    officialCardNumbersParsed:
      official.map.size,
    matchedCardRecords:
      totalMatchedRecords,
    changedCardRecords:
      allChanges.length,
    changedFiles:
      pendingWrites.length,
    missingOfficialCardNumbers:
      missingNumbers.length,
    missingNumbers,
    conflicts: official.conflicts,
    parseWarnings: official.warnings,
    fetchResult,
    backupDirectory:
      backupDirectory
        ? path.relative(
            PROJECT_ROOT,
            backupDirectory,
          )
        : "",
    changes: allChanges,
  };

  await fs.mkdir(STAGE2_DIR, {
    recursive: true,
  });

  await fs.writeFile(
    REPORT_PATH,
    JSON.stringify(report, null, 2),
    "utf8",
  );

  console.log("");
  console.log(
    `需校正记录：${allChanges.length}`,
  );
  console.log(
    `涉及文件：${pendingWrites.length}`,
  );
  console.log(
    `缺少官方 HTML 的卡号：${missingNumbers.length}`,
  );
  console.log(
    `报告：${path.relative(PROJECT_ROOT, REPORT_PATH)}`,
  );

  if (APPLY) {
    console.log(
      allChanges.length > 0
        ? `已完成写入。备份：${path.relative(
            PROJECT_ROOT,
            backupDirectory,
          )}`
        : "没有需要修改的记录。",
    );
  } else {
    console.log("");
    console.log(
      "确认报告后，正式修正请运行：",
    );
    console.log(
      "node .\\scripts\\fix-generated-energy-from-official-html.mjs --apply",
    );

    if (missingNumbers.length > 0) {
      console.log(
        "要自动补抓缺少的官方页面：",
      );
      console.log(
        "node .\\scripts\\fix-generated-energy-from-official-html.mjs --fetch-missing",
      );
    }
  }
}

main().catch((error) => {
  console.error("");
  console.error(
    "产生能量校正失败：",
    error,
  );
  process.exitCode = 1;
});
