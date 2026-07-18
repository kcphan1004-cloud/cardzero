import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

const targetPath = path.join(
  projectRoot,
  "components",
  "CardCatalog.tsx",
);

const marker =
  "CARDZERO_DECK_INTEGRATION_START";

if (!fs.existsSync(targetPath)) {
  throw new Error(
    `找不到文件：${targetPath}`,
  );
}

let source = fs.readFileSync(
  targetPath,
  "utf8",
);

if (source.includes(marker)) {
  console.log(
    "CardCatalog 已经加入组牌功能，不需要重复修改。",
  );

  process.exit(0);
}

const eol = source.includes("\r\n")
  ? "\r\n"
  : "\n";

const withEol = (value) =>
  value.replace(/\n/g, eol);

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-");

const backupDirectory =
  path.join(
    projectRoot,
    "data",
    "stage2",
    "backups",
    `card-catalog-deck-${stamp}`,
  );

fs.mkdirSync(
  backupDirectory,
  {
    recursive: true,
  },
);

const backupPath = path.join(
  backupDirectory,
  "CardCatalog.tsx",
);

fs.copyFileSync(
  targetPath,
  backupPath,
);

function fail(message) {
  throw new Error(
    `${message}\n原文件备份：${backupPath}`,
  );
}

if (
  !/import Link from ["']next\/link["'];?/.test(
    source,
  )
) {
  if (
    !source.includes(
      'import Image from "next/image";',
    )
  ) {
    fail(
      "找不到 Next Image import，无法安全加入 Link。",
    );
  }

  source = source.replace(
    'import Image from "next/image";',
    withEol(
      `import Image from "next/image";
import Link from "next/link";`,
    ),
  );
}

const cardTypeImport =
  /import type \{ Card \} from "\.\.\/data\/card-series-generated";/;

if (
  !cardTypeImport.test(source)
) {
  fail(
    "找不到 Card 类型 import，CardCatalog 版本与预期不符。",
  );
}

if (
  !source.includes(
    "../hooks/useDeckStorage",
  )
) {
  source = source.replace(
    cardTypeImport,
    (match) =>
      withEol(
        `${match}
import {
  isActionPointCard,
  useDeckStorage,
} from "../hooks/useDeckStorage";`,
      ),
  );
}

const componentPattern =
  /export default function CardCatalog\(\{\s*cards,\s*\}: CardCatalogProps\) \{\r?\n/;

const componentMatch =
  source.match(
    componentPattern,
  );

if (!componentMatch) {
  fail(
    "找不到 CardCatalog 组件开头。",
  );
}

const hookBlock = withEol(
  `  // ${marker}
  const {
    deck,
    mainCount,
    apCount,
    totalCards,
    addCard,
    decreaseCard,
    getCardQuantity,
  } = useDeckStorage();

  const [
    deckNotice,
    setDeckNotice,
  ] = useState("");`,
);

source = source.replace(
  componentPattern,
  (match) =>
    `${match}${hookBlock}${eol}${eol}`,
);

const featurePattern =
  /^([ \t]*)\{selectedCard\.feature[ \t]*&&/m;

const featureMatch =
  source.match(
    featurePattern,
  );

if (
  !featureMatch ||
  featureMatch.index ===
    undefined
) {
  fail(
    "找不到卡牌详情中的特征区块，无法安全加入组牌按钮。",
  );
}

const modalBlock = withEol(
  `                {/* CARDZERO_DECK_INTEGRATION_MODAL */}
                <div className="mt-6 rounded-2xl border border-red-800/60 bg-black p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-black tracking-[0.18em] text-red-500">
                        加入
                        {isActionPointCard(
                          selectedCard,
                        )
                          ? " AP 卡组"
                          : "主卡组"}
                      </p>

                      <p className="mt-1 text-sm text-zinc-500">
                        当前数量{" "}
                        <strong className="text-white">
                          {getCardQuantity(
                            selectedCard.id,
                          )}
                        </strong>
                      </p>
                    </div>

                    <Link
                      href={\`/deck-builder?series=\${encodeURIComponent(
                        selectedCard.series,
                      )}\`}
                      className="text-xs font-black text-red-400 transition hover:text-red-300"
                    >
                      打开完整组牌工具 →
                    </Link>
                  </div>

                  <div className="mt-4 grid grid-cols-[48px_1fr] gap-2">
                    <button
                      type="button"
                      disabled={
                        getCardQuantity(
                          selectedCard.id,
                        ) === 0
                      }
                      onClick={() =>
                        decreaseCard(
                          selectedCard.id,
                        )
                      }
                      className="flex h-12 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-xl font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      −
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const result =
                          addCard(
                            selectedCard,
                          );

                        setDeckNotice(
                          result.message,
                        );
                      }}
                      className="flex h-12 items-center justify-center rounded-xl bg-red-700 px-5 text-sm font-black text-white transition hover:bg-red-600"
                    >
                      ＋ 加入卡组
                    </button>
                  </div>

                  {deckNotice ? (
                    <p className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs leading-6 text-zinc-300">
                      {deckNotice}
                    </p>
                  ) : null}
                </div>

`,
);

source =
  source.slice(
    0,
    featureMatch.index,
  ) +
  modalBlock +
  source.slice(
    featureMatch.index,
  );

const closingFragment =
  `${eol}    </>${eol}  );`;

const closingIndex =
  source.lastIndexOf(
    closingFragment,
  );

if (closingIndex < 0) {
  fail(
    "找不到 CardCatalog 最后的 Fragment 结束位置。",
  );
}

const floatingBlock = withEol(
  `
      {/* CARDZERO_DECK_INTEGRATION_FLOATING_BAR */}
      {totalCards > 0 ? (
        <div className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-24px)] max-w-xl -translate-x-1/2 items-center justify-between gap-4 rounded-2xl border border-red-500/60 bg-zinc-950/95 px-4 py-3 shadow-[0_15px_55px_rgba(0,0,0,.8)] backdrop-blur">
          <div className="min-w-0">
            <p className="truncate text-xs font-black text-white">
              {deck.name || "当前卡组"}
            </p>

            <p className="mt-1 truncate text-[10px] text-zinc-500">
              {deck.series} · 主卡组{" "}
              {mainCount}/50 · AP{" "}
              {apCount}/3
            </p>
          </div>

          <Link
            href={
              deck.series
                ? \`/deck-builder?series=\${encodeURIComponent(
                    deck.series,
                  )}\`
                : "/deck-builder"
            }
            className="shrink-0 rounded-xl bg-red-700 px-4 py-3 text-xs font-black text-white transition hover:bg-red-600"
          >
            打开卡组
          </Link>
        </div>
      ) : null}
`,
);

source =
  source.slice(
    0,
    closingIndex,
  ) +
  floatingBlock +
  source.slice(
    closingIndex,
  );

fs.writeFileSync(
  targetPath,
  source,
  "utf8",
);

console.log("");
console.log(
  "CardCatalog 组牌功能加入完成。",
);
console.log(
  `备份位置：${backupPath}`,
);
console.log("");
console.log(
  "新增功能：",
);
console.log(
  "- 卡牌详情可直接加入／减少卡牌",
);
console.log(
  "- 卡牌资料库底部显示当前卡组",
);
console.log(
  "- 一键进入完整线上组牌工具",
);
