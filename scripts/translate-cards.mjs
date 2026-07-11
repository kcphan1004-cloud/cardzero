import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";
import OpenAI from "openai";

const projectRoot = process.cwd();

dotenv.config({
  path: path.join(projectRoot, ".env.local"),
});

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

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || "gpt-5.6";

const batchSize = 5;
const forceTranslate = process.argv.includes("--force");

if (!apiKey) {
  console.error(
    "找不到 OPENAI_API_KEY，请检查 .env.local。",
  );

  process.exit(1);
}

const openai = new OpenAI({
  apiKey,
});

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function readCards() {
  const raw = (
    await fs.readFile(cardsPath, "utf8")
  ).replace(/^\uFEFF/, "");

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
      "data/cards.ts 的资料格式无法读取。",
    );
  }

  const jsonText = raw.slice(
    arrayStart,
    arrayEnd + 1,
  );

  return JSON.parse(jsonText);
}

async function readTranslations() {
  try {
    const raw = await fs.readFile(
      translationsPath,
      "utf8",
    );

    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveTranslations(translations) {
  const sortedTranslations = Object.fromEntries(
    Object.entries(translations).sort(
      ([numberA], [numberB]) =>
        numberA.localeCompare(numberB),
    ),
  );

  await fs.writeFile(
    translationsPath,
    JSON.stringify(
      sortedTranslations,
      null,
      2,
    ) + "\n",
    "utf8",
  );
}

function hasCompleteTranslation(translation) {
  if (!translation) {
    return false;
  }

  return [
    "nameZh",
    "effectZh",
    "triggerZh",
  ].every((property) =>
    Object.prototype.hasOwnProperty.call(
      translation,
      property,
    ),
  );
}

function cleanSourceText(text) {
  if (!text) {
    return "";
  }

  const value = String(text).trim();

  if (
    value === "-" ||
    value === "卡牌效果整理中。" ||
    value === "卡牌资料整理中。"
  ) {
    return "";
  }

  return value;
}

function createTranslationInput(cards) {
  return cards.map((card) => ({
    number: card.number,
    name: cleanSourceText(card.name),
    effect: cleanSourceText(card.effect),
    trigger: cleanSourceText(card.trigger),
  }));
}

async function translateBatch(cards) {
  const sourceCards = createTranslationInput(cards);

  const response =
    await openai.responses.create({
      model,

      input: [
        {
          role: "system",
          content: `
你是 UNION ARENA 集换式卡牌游戏的专业翻译员。

请将输入的日文卡牌资料翻译为简体中文。

翻译规则：
1. 必须忠实翻译，不能增加、删除或推测效果。
2. 保留所有数字、AP、BP、卡号、符号与效果顺序。
3. 保留 Raid、Trigger 等英文专有关键词。
4. 【登場時】翻译为【登场时】。
5. 【アタック時】翻译为【攻击时】。
6. 【退場時】翻译为【退场时】。
7. フロントL 翻译为前线。
8. エナジーL 翻译为能量线。
9. カードを1枚引く 翻译为抽1张牌。
10. 名字有确定的官方或常用中文译名时使用中文译名；不确定时保留日文原名。
11. 原文为空时，译文也保持空字符串。
12. 不要加入说明、评价、括号备注或翻译理由。
13. number 必须原样返回，不得修改。
          `.trim(),
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

      text: {
        format: {
          type: "json_schema",
          name: "card_translations",
          strict: true,

          schema: {
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
          },
        },
      },
    });

  if (!response.output_text) {
    throw new Error(
      "翻译 API 没有返回文字内容。",
    );
  }

  const parsed = JSON.parse(
    response.output_text,
  );

  return parsed.translations;
}

async function main() {
  const allCards = await readCards();
  const existingTranslations =
    await readTranslations();

  // 普通版和异图版使用相同卡号，因此只翻译一次。
  const uniqueCards = [
    ...new Map(
      allCards.map((card) => [
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
        existingTranslations[card.number],
      );
    });

  console.log(
    `卡牌总数：${uniqueCards.length}`,
  );

  console.log(
    `需要翻译：${cardsToTranslate.length}`,
  );

  if (cardsToTranslate.length === 0) {
    console.log(
      "所有卡牌都已有翻译，不需要处理。",
    );

    return;
  }

  for (
    let index = 0;
    index < cardsToTranslate.length;
    index += batchSize
  ) {
    const batch = cardsToTranslate.slice(
      index,
      index + batchSize,
    );

    const currentBatch =
      Math.floor(index / batchSize) + 1;

    const totalBatches = Math.ceil(
      cardsToTranslate.length / batchSize,
    );

    console.log("");
    console.log(
      `翻译第 ${currentBatch}/${totalBatches} 批……`,
    );

    console.log(
      batch
        .map((card) => card.number)
        .join(", "),
    );

    try {
      const translatedCards =
        await translateBatch(batch);

      const validNumbers = new Set(
        batch.map((card) => card.number),
      );

      for (const translation of translatedCards) {
        if (
          !validNumbers.has(translation.number)
        ) {
          console.warn(
            `跳过未知卡号：${translation.number}`,
          );

          continue;
        }

        existingTranslations[
          translation.number
        ] = {
          nameZh: translation.nameZh,
          effectZh: translation.effectZh,
          triggerZh:
            translation.triggerZh,
        };
      }

      // 每批都储存，途中停止也不会失去之前的结果。
      await saveTranslations(
        existingTranslations,
      );

      console.log(
        `已完成并储存第 ${currentBatch} 批。`,
      );

      await sleep(600);
    } catch (error) {
      console.error(
        `第 ${currentBatch} 批翻译失败：`,
        error instanceof Error
          ? error.message
          : error,
      );

      console.log(
        "已完成的翻译仍然保留，可以稍后重新运行。",
      );

      process.exitCode = 1;
      return;
    }
  }

  console.log("");
  console.log("自动翻译完成。");
  console.log(
    "翻译位置：data/card-translations.json",
  );
}

main().catch((error) => {
  console.error(
    "自动翻译失败：",
    error instanceof Error
      ? error.message
      : error,
  );

  process.exitCode = 1;
});