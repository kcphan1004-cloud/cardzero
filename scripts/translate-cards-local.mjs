import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();

const cardsPath = path.join(
  projectRoot,
  "data",
  "cards.ts",
);

const translationsPath = path.join(
  projectRoot,
  "data",
  "card-translations.json",
);

const glossaryPath = path.join(
  projectRoot,
  "data",
  "translation-glossary.json",
);

const overridesPath = path.join(
  projectRoot,
  "data",
  "card-translation-overrides.json",
);

const ollamaUrl =
  process.env.OLLAMA_URL ||
  "http://localhost:11434/api/chat";

const model =
  process.env.OLLAMA_MODEL ||
  "qwen3.5:4b";

const batchSize = Math.max(
  1,
  Number(
    process.env.TRANSLATION_BATCH_SIZE ||
      1,
  ),
);

const maxRetries = 3;

const requestTimeout =
  10 * 60 * 1000;

const forceTranslate =
  process.argv.includes("--force");

const reapplyOnly =
  process.argv.includes("--reapply");

const selectedNumbers = new Set(
  process.argv
    .filter((argument) =>
      argument.startsWith("--card="),
    )
    .map((argument) =>
      argument
        .slice("--card=".length)
        .trim(),
    )
    .filter(Boolean),
);

const DEFAULT_GLOSSARY = {
  terms: {},
  styleRules: [],
  postReplacements: {},
};

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function removeBom(text) {
  return String(text ?? "").replace(
    /^\uFEFF/,
    "",
  );
}

function cleanSourceText(text) {
  const value = String(
    text ?? "",
  ).trim();

  const emptyValues = new Set([
    "",
    "-",
    "－",
    "资料待补",
    "卡牌资料整理中。",
    "卡牌效果整理中。",
  ]);

  return emptyValues.has(value)
    ? ""
    : value;
}

async function readJsonFile(
  filePath,
  fallbackValue,
) {
  try {
    const raw = removeBom(
      await fs.readFile(
        filePath,
        "utf8",
      ),
    ).trim();

    if (!raw) {
      return fallbackValue;
    }

    return JSON.parse(raw);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return fallbackValue;
    }

    throw new Error(
      `无法读取 ${path.basename(
        filePath,
      )}：${
        error instanceof Error
          ? error.message
          : String(error)
      }`,
    );
  }
}

async function saveTranslations(
  translations,
) {
  const sorted =
    Object.fromEntries(
      Object.entries(
        translations,
      ).sort(
        (
          [numberA],
          [numberB],
        ) =>
          numberA.localeCompare(
            numberB,
            undefined,
            {
              numeric: true,
              sensitivity: "base",
            },
          ),
      ),
    );

  await fs.writeFile(
    translationsPath,
    `${JSON.stringify(
      sorted,
      null,
      2,
    )}\n`,
    "utf8",
  );
}

async function readCards() {
  const raw = removeBom(
    await fs.readFile(
      cardsPath,
      "utf8",
    ),
  );

  const exportMarker =
    "export const cards: Card[] =";

  const exportPosition =
    raw.indexOf(exportMarker);

  if (exportPosition === -1) {
    throw new Error(
      "无法在 data/cards.ts 找到 cards 阵列。",
    );
  }

  const arrayStart = raw.indexOf(
    "[",
    exportPosition +
      exportMarker.length,
  );

  const arrayEnd =
    raw.lastIndexOf("];");

  if (
    arrayStart === -1 ||
    arrayEnd === -1 ||
    arrayEnd < arrayStart
  ) {
    throw new Error(
      "data/cards.ts 的卡牌阵列格式无法读取。",
    );
  }

  const jsonText = raw.slice(
    arrayStart,
    arrayEnd + 1,
  );

  try {
    return JSON.parse(jsonText);
  } catch (error) {
    throw new Error(
      `data/cards.ts 无法解析：${
        error instanceof Error
          ? error.message
          : String(error)
      }`,
    );
  }
}

function normalizeGlossary(
  rawGlossary,
) {
  const terms =
    rawGlossary?.terms &&
    typeof rawGlossary.terms ===
      "object"
      ? rawGlossary.terms
      : {};

  const styleRules =
    Array.isArray(
      rawGlossary?.styleRules,
    )
      ? rawGlossary.styleRules
          .map(String)
          .filter(Boolean)
      : [];

  const postReplacements =
    rawGlossary?.postReplacements &&
    typeof rawGlossary
      .postReplacements === "object"
      ? rawGlossary.postReplacements
      : {};

  return {
    terms,
    styleRules,
    postReplacements,
  };
}

function normalizeTranslation(
  translation,
) {
  return {
    nameZh: String(
      translation?.nameZh ?? "",
    ).trim(),

    effectZh: String(
      translation?.effectZh ?? "",
    ).trim(),

    triggerZh: String(
      translation?.triggerZh ?? "",
    ).trim(),
  };
}

function hasCompleteTranslation(
  translation,
) {
  if (
    !translation ||
    typeof translation !== "object"
  ) {
    return false;
  }

  return [
    "nameZh",
    "effectZh",
    "triggerZh",
  ].every((key) =>
    Object.prototype.hasOwnProperty.call(
      translation,
      key,
    ),
  );
}

function applyReplacements(
  text,
  glossary,
) {
  let result = String(
    text ?? "",
  ).trim();

  const replacements = {
    ...(glossary.terms ?? {}),
    ...(glossary.postReplacements ??
      {}),
  };

  const entries =
    Object.entries(replacements)
      .map(([from, to]) => [
        String(from),
        String(to),
      ])
      .filter(
        ([from]) =>
          from.length > 0,
      )
      .sort(
        ([fromA], [fromB]) =>
          fromB.length -
          fromA.length,
      );

  for (const [from, to] of entries) {
    result = result
      .split(from)
      .join(to);
  }

  return result;
}

function applyOverride(
  translation,
  override,
) {
  const base =
    normalizeTranslation(
      translation,
    );

  if (
    !override ||
    typeof override !== "object"
  ) {
    return base;
  }

  return {
    nameZh:
      typeof override.nameZh ===
      "string"
        ? override.nameZh.trim()
        : base.nameZh,

    effectZh:
      typeof override.effectZh ===
      "string"
        ? override.effectZh.trim()
        : base.effectZh,

    triggerZh:
      typeof override.triggerZh ===
      "string"
        ? override.triggerZh.trim()
        : base.triggerZh,
  };
}

function finalizeTranslation(
  translation,
  glossary,
  override,
) {
  const normalized =
    normalizeTranslation(
      translation,
    );

  const replaced = {
    nameZh: applyReplacements(
      normalized.nameZh,
      glossary,
    ),

    effectZh: applyReplacements(
      normalized.effectZh,
      glossary,
    ),

    triggerZh: applyReplacements(
      normalized.triggerZh,
      glossary,
    ),
  };

  return applyOverride(
    replaced,
    override,
  );
}

function createTranslationInput(
  cards,
) {
  return cards.map((card) => ({
    number: String(
      card.number ?? "",
    ).trim(),

    name: cleanSourceText(
      card.name,
    ),

    effect: cleanSourceText(
      card.effect,
    ),

    trigger: cleanSourceText(
      card.trigger,
    ),
  }));
}

function parseJsonContent(content) {
  let cleaned = String(
    content ?? "",
  ).trim();

  cleaned = cleaned
    .replace(
      /^```(?:json)?\s*/i,
      "",
    )
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace =
      cleaned.indexOf("{");

    const lastBrace =
      cleaned.lastIndexOf("}");

    if (
      firstBrace !== -1 &&
      lastBrace > firstBrace
    ) {
      return JSON.parse(
        cleaned.slice(
          firstBrace,
          lastBrace + 1,
        ),
      );
    }

    throw new Error(
      "本地模型返回的内容不是合法 JSON。",
    );
  }
}

function validateTranslations(
  translations,
  sourceCards,
) {
  if (
    !Array.isArray(translations)
  ) {
    throw new Error(
      "模型返回的 translations 不是阵列。",
    );
  }

  const expectedNumbers =
    new Set(
      sourceCards.map(
        (card) => card.number,
      ),
    );

  const resultByNumber =
    new Map();

  for (
    const translation of translations
  ) {
    if (
      !translation ||
      typeof translation !==
        "object"
    ) {
      continue;
    }

    const number = String(
      translation.number ?? "",
    ).trim();

    if (
      !expectedNumbers.has(number)
    ) {
      continue;
    }

    resultByNumber.set(number, {
      number,
      ...normalizeTranslation(
        translation,
      ),
    });
  }

  const missingNumbers =
    sourceCards
      .map(
        (card) => card.number,
      )
      .filter(
        (number) =>
          !resultByNumber.has(
            number,
          ),
      );

  if (
    missingNumbers.length > 0
  ) {
    throw new Error(
      `模型漏掉卡号：${missingNumbers.join(
        ", ",
      )}`,
    );
  }

  return sourceCards.map(
    (card) =>
      resultByNumber.get(
        card.number,
      ),
  );
}

async function checkOllama() {
  const baseUrl =
    ollamaUrl.replace(
      /\/api\/chat\/?$/,
      "",
    );

  try {
    const response = await fetch(
      `${baseUrl}/api/tags`,
    );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`,
      );
    }

    const result =
      await response.json();

    const installedModels =
      Array.isArray(result.models)
        ? result.models.map(
            (item) => item.name,
          )
        : [];

    const modelExists =
      installedModels.includes(
        model,
      ) ||
      installedModels.some(
        (name) =>
          name.split(":")[0] ===
          model.split(":")[0],
      );

    if (!modelExists) {
      throw new Error(
        `尚未安装模型 ${model}。请先执行：ollama pull ${model}`,
      );
    }
  } catch (error) {
    throw new Error(
      [
        "无法连接 Ollama。",
        "请确认 Ollama 已安装并正在运行。",
        `接口：${ollamaUrl}`,
        error instanceof Error
          ? error.message
          : String(error),
      ].join("\n"),
    );
  }
}

function buildSystemPrompt(
  glossary,
) {
  const terminologyRules =
    Object.entries(
      glossary.terms ?? {},
    )
      .map(
        ([japanese, chinese]) =>
          `${japanese} → ${chinese}`,
      )
      .join("\n");

  const customStyleRules = (
    glossary.styleRules ?? []
  )
    .map(
      (rule, index) =>
        `${index + 1}. ${rule}`,
    )
    .join("\n");

  return `
你是 UNION ARENA 集换式卡牌游戏的专业日文翻译员。

请把输入的日文卡牌资料翻译成简体中文，并严格遵守用户指定用词。

用户指定术语：
${terminologyRules || "无额外指定"}

用户指定翻译风格：
${customStyleRules || "无额外指定"}

必须遵守：
1. 忠实翻译，不得增加、删除、解释、总结或推测卡牌效果。
2. 保留所有数字、AP、BP、卡号、符号与效果处理顺序。
3. number 必须原样返回，不得修改。
4. 每张输入卡牌都必须返回，不能漏掉。
5. 原文为空字符串时，译文也必须为空字符串。
6. 卡名有确定的官方或常用中文译名时使用中文译名。
7. 无法确认中文译名时保留日文原名，不得自行添加说明。
8. 保留 Raid、Trigger、AP、BP 等游戏关键词。
9. 不得加入“翻译如下”“效果说明”等额外文字。
10. 只返回符合指定格式的 JSON。
  `.trim();
}

async function translateBatch(
  cards,
  glossary,
) {
  const sourceCards =
    createTranslationInput(
      cards,
    );

  const outputSchema = {
    type: "object",

    properties: {
      translations: {
        type: "array",

        items: {
          type: "object",

          properties: {
            number: {
              type: "string",
            },

            nameZh: {
              type: "string",
            },

            effectZh: {
              type: "string",
            },

            triggerZh: {
              type: "string",
            },
          },

          required: [
            "number",
            "nameZh",
            "effectZh",
            "triggerZh",
          ],

          additionalProperties: false,
        },
      },
    },

    required: ["translations"],
    additionalProperties: false,
  };

  const controller =
    new AbortController();

  const timeoutId = setTimeout(
    () => {
      controller.abort();
    },
    requestTimeout,
  );

  try {
    const response = await fetch(
      ollamaUrl,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        signal:
          controller.signal,

        body: JSON.stringify({
          model,
          stream: false,
          think: false,
          format: outputSchema,

          messages: [
            {
              role: "system",
              content:
                buildSystemPrompt(
                  glossary,
                ),
            },
            {
              role: "user",
              content:
                JSON.stringify(
                  sourceCards,
                  null,
                  2,
                ),
            },
          ],

          options: {
            temperature: 0,
            seed: 1004,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        `Ollama HTTP ${response.status}：${errorText}`,
      );
    }

    const result =
      await response.json();

    const content =
      result.message?.content;

    if (!content) {
      throw new Error(
        "Ollama 没有返回翻译内容。",
      );
    }

    const parsed =
      parseJsonContent(content);

    return validateTranslations(
      parsed.translations,
      sourceCards,
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.name ===
        "AbortError"
    ) {
      throw new Error(
        "Ollama 翻译超时，请把 TRANSLATION_BATCH_SIZE 调小。",
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function translateBatchWithRetry(
  cards,
  glossary,
) {
  let lastError;

  for (
    let attempt = 1;
    attempt <= maxRetries;
    attempt += 1
  ) {
    try {
      return await translateBatch(
        cards,
        glossary,
      );
    } catch (error) {
      lastError = error;

      console.warn(
        `本批第 ${attempt}/${maxRetries} 次失败：${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
      );

      if (
        attempt < maxRetries
      ) {
        console.log(
          "等待后重新尝试……",
        );

        await sleep(
          2000 * attempt,
        );
      }
    }
  }

  throw lastError;
}

function applyRulesToExistingTranslations(
  translations,
  glossary,
  overrides,
) {
  const result = {
    ...translations,
  };

  for (
    const [
      number,
      translation,
    ] of Object.entries(result)
  ) {
    result[number] =
      finalizeTranslation(
        translation,
        glossary,
        overrides[number],
      );
  }

  return result;
}

async function main() {
  console.log(
    "CardZero 本地自动翻译",
  );

  console.log(`模型：${model}`);

  console.log(
    `每批：${batchSize} 张`,
  );

  console.log(
    `强制重翻：${
      forceTranslate
        ? "是"
        : "否"
    }`,
  );

  console.log(
    `只套用规则：${
      reapplyOnly
        ? "是"
        : "否"
    }`,
  );

  console.log("");

  const allCards =
    await readCards();

  const rawGlossary =
    await readJsonFile(
      glossaryPath,
      DEFAULT_GLOSSARY,
    );

  const glossary =
    normalizeGlossary(
      rawGlossary,
    );

  const overrides =
    await readJsonFile(
      overridesPath,
      {},
    );

  const loadedTranslations =
    await readJsonFile(
      translationsPath,
      {},
    );

  let existingTranslations =
    applyRulesToExistingTranslations(
      loadedTranslations,
      glossary,
      overrides,
    );

  if (reapplyOnly) {
    await saveTranslations(
      existingTranslations,
    );

    console.log(
      `已重新套用术语、替换规则和人工覆盖：${
        Object.keys(
          existingTranslations,
        ).length
      } 笔`,
    );

    console.log(
      "未调用 Ollama。完成后请运行 enrich-cards.mjs。",
    );

    return;
  }

  await checkOllama();

  let uniqueCards = [
    ...new Map(
      allCards
        .filter(
          (card) =>
            card.number &&
            card.name,
        )
        .map((card) => [
          card.number,
          card,
        ]),
    ).values(),
  ];

  if (
    selectedNumbers.size > 0
  ) {
    uniqueCards =
      uniqueCards.filter(
        (card) =>
          selectedNumbers.has(
            card.number,
          ),
      );

    const foundNumbers =
      new Set(
        uniqueCards.map(
          (card) =>
            card.number,
        ),
      );

    const missingNumbers = [
      ...selectedNumbers,
    ].filter(
      (number) =>
        !foundNumbers.has(number),
    );

    if (
      missingNumbers.length > 0
    ) {
      console.warn(
        `找不到卡号：${missingNumbers.join(
          ", ",
        )}`,
      );
    }
  }

  const cardsToTranslate =
    uniqueCards.filter((card) => {
      if (forceTranslate) {
        return true;
      }

      return !hasCompleteTranslation(
        existingTranslations[
          card.number
        ],
      );
    });

  console.log(
    `不重复卡号：${uniqueCards.length}`,
  );

  console.log(
    `已有翻译：${
      uniqueCards.length -
      cardsToTranslate.length
    }`,
  );

  console.log(
    `需要翻译：${cardsToTranslate.length}`,
  );

  if (
    cardsToTranslate.length === 0
  ) {
    await saveTranslations(
      existingTranslations,
    );

    console.log("");

    console.log(
      "全部卡牌已有翻译，已重新套用词库与人工覆盖。",
    );

    return;
  }

  const totalBatches =
    Math.ceil(
      cardsToTranslate.length /
        batchSize,
    );

  for (
    let index = 0;
    index <
    cardsToTranslate.length;
    index += batchSize
  ) {
    const batch =
      cardsToTranslate.slice(
        index,
        index + batchSize,
      );

    const currentBatch =
      Math.floor(
        index / batchSize,
      ) + 1;

    console.log("");

    console.log(
      `翻译第 ${currentBatch}/${totalBatches} 批`,
    );

    console.log(
      batch
        .map(
          (card) =>
            card.number,
        )
        .join(", "),
    );

    try {
      const translatedCards =
        await translateBatchWithRetry(
          batch,
          glossary,
        );

      for (
        const translation of
          translatedCards
      ) {
        existingTranslations[
          translation.number
        ] = finalizeTranslation(
          translation,
          glossary,
          overrides[
            translation.number
          ],
        );
      }

      await saveTranslations(
        existingTranslations,
      );

      console.log(
        `第 ${currentBatch} 批完成并储存。`,
      );

      await sleep(500);
    } catch (error) {
      console.error("");

      console.error(
        `第 ${currentBatch} 批最终失败：${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
      );

      console.error(
        "已完成的批次仍然保留，可重新运行继续。",
      );

      process.exitCode = 1;
      return;
    }
  }

  existingTranslations =
    applyRulesToExistingTranslations(
      existingTranslations,
      glossary,
      overrides,
    );

  await saveTranslations(
    existingTranslations,
  );

  console.log("");

  console.log(
    "========================",
  );

  console.log(
    "本地自动翻译完成",
  );

  console.log(
    `翻译档案：${translationsPath}`,
  );

  console.log(
    "========================",
  );
}

main().catch((error) => {
  console.error("");

  console.error(
    "自动翻译失败：",
    error instanceof Error
      ? error.message
      : String(error),
  );

  process.exitCode = 1;
});