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

// Ollama 本地接口
const ollamaUrl =
  process.env.OLLAMA_URL ||
  "http://localhost:11434/api/chat";

// 可以使用环境变量更改模型
const model =
  process.env.OLLAMA_MODEL || "qwen3.5:4b";

// 每次翻译几张卡。
// 本地模型建议先使用 3。
const batchSize = Math.max(
  1,
  Number(process.env.TRANSLATION_BATCH_SIZE || 3),
);

// 是否强制重新翻译全部卡牌
const forceTranslate =
  process.argv.includes("--force");

// 每批最多重试次数
const maxRetries = 3;

// 单次请求最长等待 10 分钟
const requestTimeout = 10 * 60 * 1000;

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function removeBom(text) {
  return text.replace(/^\uFEFF/, "");
}

function cleanSourceText(text) {
  if (text === null || text === undefined) {
    return "";
  }

  const value = String(text).trim();

  const emptyValues = new Set([
    "",
    "-",
    "－",
    "资料待补",
    "卡牌资料整理中。",
    "卡牌效果整理中。",
  ]);

  return emptyValues.has(value) ? "" : value;
}

async function readCards() {
  const raw = removeBom(
    await fs.readFile(cardsPath, "utf8"),
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

  // 必须从 exportMarker 后面开始找，
  // 避免抓到 Card[] 类型里面的 [
  const arrayStart = raw.indexOf(
    "[",
    exportPosition + exportMarker.length,
  );

  const arrayEnd = raw.lastIndexOf("];");

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

async function readTranslations() {
  try {
    const raw = removeBom(
      await fs.readFile(
        translationsPath,
        "utf8",
      ),
    ).trim();

    if (!raw) {
      return {};
    }

    return JSON.parse(raw);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return {};
    }

    throw new Error(
      `无法读取 card-translations.json：${
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
  const sortedTranslations =
    Object.fromEntries(
      Object.entries(translations).sort(
        ([numberA], [numberB]) =>
          numberA.localeCompare(numberB),
      ),
    );

  const content =
    JSON.stringify(
      sortedTranslations,
      null,
      2,
    ) + "\n";

  // Node 写入的 UTF-8 不会添加 BOM
  await fs.writeFile(
    translationsPath,
    content,
    "utf8",
  );
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

function createTranslationInput(cards) {
  return cards.map((card) => ({
    number: String(card.number || "").trim(),
    name: cleanSourceText(card.name),
    effect: cleanSourceText(card.effect),
    trigger: cleanSourceText(card.trigger),
  }));
}

function parseJsonContent(content) {
  let cleaned = String(content || "").trim();

  // 防止模型意外加入 Markdown 代码框
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // 再尝试提取最外层 JSON 对象
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

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
  if (!Array.isArray(translations)) {
    throw new Error(
      "模型返回的 translations 不是阵列。",
    );
  }

  const expectedNumbers = new Set(
    sourceCards.map((card) => card.number),
  );

  const resultByNumber = new Map();

  for (const translation of translations) {
    if (
      !translation ||
      typeof translation !== "object"
    ) {
      continue;
    }

    const number = String(
      translation.number || "",
    ).trim();

    if (!expectedNumbers.has(number)) {
      continue;
    }

    resultByNumber.set(number, {
      number,
      nameZh: String(
        translation.nameZh || "",
      ).trim(),
      effectZh: String(
        translation.effectZh || "",
      ).trim(),
      triggerZh: String(
        translation.triggerZh || "",
      ).trim(),
    });
  }

  const missingNumbers = sourceCards
    .map((card) => card.number)
    .filter(
      (number) =>
        !resultByNumber.has(number),
    );

  if (missingNumbers.length > 0) {
    throw new Error(
      `模型漏掉卡号：${missingNumbers.join(
        ", ",
      )}`,
    );
  }

  return sourceCards.map((card) =>
    resultByNumber.get(card.number),
  );
}

async function checkOllama() {
  const baseUrl = ollamaUrl.replace(
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

    const result = await response.json();

    const installedModels = Array.isArray(
      result.models,
    )
      ? result.models.map(
          (item) => item.name,
        )
      : [];

    const modelExists =
      installedModels.includes(model) ||
      installedModels.some(
        (name) =>
          name.split(":")[0] ===
          model.split(":")[0],
      );

    if (!modelExists) {
      console.warn("");
      console.warn(
        `警告：没有在 Ollama 找到 ${model}`,
      );
      console.warn(
        `请先执行：ollama pull ${model}`,
      );
      console.warn("");
    }
  } catch {
    throw new Error(
      [
        "无法连接 Ollama。",
        "请确认 Ollama 已经安装并正在运行。",
        `接口：${ollamaUrl}`,
      ].join("\n"),
    );
  }
}

async function translateBatch(cards) {
  const sourceCards =
    createTranslationInput(cards);

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

  const systemPrompt = `
你是 UNION ARENA 集换式卡牌游戏的专业日文翻译员。

请把输入的日文卡牌资料翻译成简体中文。

必须遵守以下规则：

1. 忠实翻译，不得增加、删除、解释、总结或推测效果。
2. 必须保留所有数字、AP、BP、卡号、符号与效果处理顺序。
3. number 必须原样返回，不得修改。
4. 每一张输入卡牌都必须返回，不能漏掉。
5. 原文为空字符串时，译文也必须是空字符串。
6. 卡名有确定的官方或常用中文译名时使用中文译名。
7. 无法确认中文译名时保留日文原名，不得自行音译。
8. 保留 Raid、Trigger、AP、BP 等游戏关键词。
9. 不得加入“翻译如下”“效果说明”等额外文字。
10. 只返回符合指定格式的 JSON。

固定用语：

【登場時】→【登场时】
【アタック時】→【攻击时】
【退場時】→【退场时】
【自分のターン中】→【自己的回合中】
【相手のターン中】→【对手的回合中】
フロントL → 前线
エナジーL → 能量线
レイド → Raid
トリガー → Trigger
カードを1枚引く → 抽1张牌
手札 → 手牌
デッキ → 牌库
場外 → 场外
退場させる → 使其退场
レストにする → 横置
アクティブにする → 活跃
このターン中 → 本回合中
次の自分のターン開始時まで → 直到自己的下个回合开始时
  `.trim();

  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, requestTimeout);

  try {
    const response = await fetch(
      ollamaUrl,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        signal: controller.signal,

        body: JSON.stringify({
          model,
          stream: false,
          think: false,
          format: outputSchema,

          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: JSON.stringify(
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

    const result = await response.json();

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
      error.name === "AbortError"
    ) {
      throw new Error(
        "Ollama 翻译超时，请减少 batchSize 或换较小模型。",
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function translateBatchWithRetry(
  cards,
) {
  let lastError;

  for (
    let attempt = 1;
    attempt <= maxRetries;
    attempt += 1
  ) {
    try {
      return await translateBatch(cards);
    } catch (error) {
      lastError = error;

      console.warn(
        `本批第 ${attempt}/${maxRetries} 次失败：${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
      );

      if (attempt < maxRetries) {
        console.log(
          "等待后重新尝试……",
        );

        await sleep(2000 * attempt);
      }
    }
  }

  throw lastError;
}

async function main() {
  console.log("CardZero 本地自动翻译");
  console.log(`模型：${model}`);
  console.log(`每批：${batchSize} 张`);
  console.log("");

  await checkOllama();

  const allCards = await readCards();

  const existingTranslations =
    await readTranslations();

  // 普通版和异图版卡号相同，
  // 因此每个卡号只翻译一次。
  const uniqueCards = [
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

  if (cardsToTranslate.length === 0) {
    console.log("");
    console.log(
      "全部卡牌已有翻译，无需处理。",
    );

    return;
  }

  const totalBatches = Math.ceil(
    cardsToTranslate.length / batchSize,
  );

  for (
    let index = 0;
    index < cardsToTranslate.length;
    index += batchSize
  ) {
    const batch =
      cardsToTranslate.slice(
        index,
        index + batchSize,
      );

    const currentBatch =
      Math.floor(index / batchSize) + 1;

    console.log("");
    console.log(
      `翻译第 ${currentBatch}/${totalBatches} 批`,
    );

    console.log(
      batch
        .map((card) => card.number)
        .join(", "),
    );

    try {
      const translatedCards =
        await translateBatchWithRetry(
          batch,
        );

      for (const translation of translatedCards) {
        existingTranslations[
          translation.number
        ] = {
          nameZh:
            translation.nameZh,
          effectZh:
            translation.effectZh,
          triggerZh:
            translation.triggerZh,
        };
      }

      // 每一批完成后立即存档，
      // 中途关闭也不会遗失已完成结果。
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
        "已经完成的批次仍保留，可以重新运行继续。",
      );

      process.exitCode = 1;
      return;
    }
  }

  console.log("");
  console.log("========================");
  console.log("本地自动翻译完成");
  console.log(
    `翻译档案：${translationsPath}`,
  );
  console.log("========================");
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