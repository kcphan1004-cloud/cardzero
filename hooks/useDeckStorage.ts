"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { Card } from "../data/card-series-generated";

export const MAIN_DECK_LIMIT = 50;
export const AP_DECK_LIMIT = 3;
export const CARD_COPY_LIMIT = 4;

const CURRENT_DECK_KEY =
  "cardzero.current-deck.v1";

const SAVED_DECKS_KEY =
  "cardzero.saved-decks.v1";

export type DeckZone =
  | "main"
  | "ap";

export type DeckEntry = {
  cardId: string;
  number: string;
  quantity: number;
  zone: DeckZone;
};

export type StoredDeck = {
  version: 1;
  name: string;
  series: string;
  entries: DeckEntry[];
  updatedAt: string;
};

export type SavedDeck =
  StoredDeck & {
    snapshotId: string;
    savedAt: string;
  };

export type DeckActionResult = {
  ok: boolean;
  message: string;
};

type LoadDeckResult =
  DeckActionResult & {
    deck?: StoredDeck;
  };

function nowIso() {
  return new Date().toISOString();
}

function createId() {
  if (
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

function emptyDeck(
  series = "",
): StoredDeck {
  return {
    version: 1,
    name: series
      ? `${series} 卡组`
      : "我的卡组",
    series,
    entries: [],
    updatedAt: nowIso(),
  };
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value),
  );
}

function cleanText(
  value: unknown,
  fallback = "",
) {
  return typeof value === "string"
    ? value.trim()
    : fallback;
}

function cleanInteger(
  value: unknown,
  fallback = 0,
) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(
    0,
    Math.floor(parsed),
  );
}

export function isActionPointCard(
  card: Pick<
    Card,
    "rarity" | "type"
  >,
) {
  const rarity = String(
    card.rarity ?? "",
  )
    .trim()
    .toUpperCase();

  const type = String(card.type ?? "")
    .trim()
    .toLowerCase();

  return (
    rarity === "AP" ||
    type.includes("action point") ||
    type.includes("actionpoint") ||
    type.includes("ap卡") ||
    type.includes("行动点") ||
    type.includes("动作点") ||
    type.includes("アクションポイント")
  );
}

function normalizeEntries(
  value: unknown,
) {
  if (!Array.isArray(value)) {
    return [] as DeckEntry[];
  }

  const result: DeckEntry[] = [];
  const indexByKey =
    new Map<string, number>();
  const numberCounts =
    new Map<string, number>();

  let mainTotal = 0;
  let apTotal = 0;

  for (const rawEntry of value) {
    if (!isRecord(rawEntry)) {
      continue;
    }

    const cardId = cleanText(
      rawEntry.cardId,
    );

    const number =
      cleanText(rawEntry.number) ||
      cardId;

    const zone: DeckZone =
      rawEntry.zone === "ap"
        ? "ap"
        : "main";

    const requestedQuantity =
      cleanInteger(
        rawEntry.quantity,
      );

    if (
      !cardId ||
      !number ||
      requestedQuantity <= 0
    ) {
      continue;
    }

    if (zone === "ap") {
      const allowed = Math.min(
        requestedQuantity,
        AP_DECK_LIMIT - apTotal,
      );

      if (allowed <= 0) {
        continue;
      }

      const key = `${zone}:${cardId}`;
      const existingIndex =
        indexByKey.get(key);

      if (
        existingIndex !== undefined
      ) {
        result[
          existingIndex
        ].quantity += allowed;
      } else {
        indexByKey.set(
          key,
          result.length,
        );

        result.push({
          cardId,
          number,
          quantity: allowed,
          zone,
        });
      }

      apTotal += allowed;
      continue;
    }

    const sameNumberCount =
      numberCounts.get(number) ?? 0;

    const allowed = Math.min(
      requestedQuantity,
      CARD_COPY_LIMIT -
        sameNumberCount,
      MAIN_DECK_LIMIT - mainTotal,
    );

    if (allowed <= 0) {
      continue;
    }

    const key = `${zone}:${cardId}`;
    const existingIndex =
      indexByKey.get(key);

    if (
      existingIndex !== undefined
    ) {
      result[
        existingIndex
      ].quantity += allowed;
    } else {
      indexByKey.set(
        key,
        result.length,
      );

      result.push({
        cardId,
        number,
        quantity: allowed,
        zone,
      });
    }

    numberCounts.set(
      number,
      sameNumberCount + allowed,
    );

    mainTotal += allowed;
  }

  return result;
}

function normalizeDeck(
  value: unknown,
  fallbackSeries = "",
): StoredDeck {
  if (!isRecord(value)) {
    return emptyDeck(
      fallbackSeries,
    );
  }

  const series =
    cleanText(value.series) ||
    fallbackSeries;

  const name =
    cleanText(value.name) ||
    (series
      ? `${series} 卡组`
      : "我的卡组");

  return {
    version: 1,
    name,
    series,
    entries: normalizeEntries(
      value.entries,
    ),
    updatedAt:
      cleanText(value.updatedAt) ||
      nowIso(),
  };
}

function normalizeSavedDecks(
  value: unknown,
) {
  if (!Array.isArray(value)) {
    return [] as SavedDeck[];
  }

  const result: SavedDeck[] = [];

  for (const rawDeck of value) {
    if (!isRecord(rawDeck)) {
      continue;
    }

    const deck = normalizeDeck(
      rawDeck,
    );

    const snapshotId =
      cleanText(
        rawDeck.snapshotId,
      ) || createId();

    const savedAt =
      cleanText(rawDeck.savedAt) ||
      deck.updatedAt;

    result.push({
      ...deck,
      snapshotId,
      savedAt,
    });
  }

  return result.sort((a, b) =>
    b.savedAt.localeCompare(
      a.savedAt,
    ),
  );
}

function readJson(
  key: string,
) {
  try {
    const raw =
      window.localStorage.getItem(
        key,
      );

    return raw
      ? JSON.parse(raw)
      : null;
  } catch {
    return null;
  }
}

function updateTimestamp(
  deck: StoredDeck,
): StoredDeck {
  return {
    ...deck,
    updatedAt: nowIso(),
  };
}

export function useDeckStorage() {
  const [deck, setDeck] =
    useState<StoredDeck>(() =>
      emptyDeck(),
    );

  const [
    savedDecks,
    setSavedDecks,
  ] = useState<SavedDeck[]>(
    [],
  );

  const [
    hydrated,
    setHydrated,
  ] = useState(false);

  useEffect(() => {
    setDeck(
      normalizeDeck(
        readJson(
          CURRENT_DECK_KEY,
        ),
      ),
    );

    setSavedDecks(
      normalizeSavedDecks(
        readJson(
          SAVED_DECKS_KEY,
        ),
      ),
    );

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(
      CURRENT_DECK_KEY,
      JSON.stringify(deck),
    );
  }, [deck, hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(
      SAVED_DECKS_KEY,
      JSON.stringify(
        savedDecks,
      ),
    );
  }, [savedDecks, hydrated]);

  useEffect(() => {
    function handleStorage(
      event: StorageEvent,
    ) {
      if (
        event.key ===
          CURRENT_DECK_KEY &&
        event.newValue
      ) {
        try {
          setDeck(
            normalizeDeck(
              JSON.parse(
                event.newValue,
              ),
            ),
          );
        } catch {
          // Ignore invalid data from another tab.
        }
      }

      if (
        event.key ===
          SAVED_DECKS_KEY &&
        event.newValue
      ) {
        try {
          setSavedDecks(
            normalizeSavedDecks(
              JSON.parse(
                event.newValue,
              ),
            ),
          );
        } catch {
          // Ignore invalid data from another tab.
        }
      }
    }

    window.addEventListener(
      "storage",
      handleStorage,
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage,
      );
    };
  }, []);

  const mainCount = useMemo(
    () =>
      deck.entries
        .filter(
          (entry) =>
            entry.zone ===
            "main",
        )
        .reduce(
          (total, entry) =>
            total +
            entry.quantity,
          0,
        ),
    [deck.entries],
  );

  const apCount = useMemo(
    () =>
      deck.entries
        .filter(
          (entry) =>
            entry.zone === "ap",
        )
        .reduce(
          (total, entry) =>
            total +
            entry.quantity,
          0,
        ),
    [deck.entries],
  );

  const totalCards =
    mainCount + apCount;

  const getCardQuantity =
    useCallback(
      (cardId: string) =>
        deck.entries.find(
          (entry) =>
            entry.cardId ===
            cardId,
        )?.quantity ?? 0,
      [deck.entries],
    );

  const addCard = useCallback(
    (
      card: Card,
    ): DeckActionResult => {
      const zone: DeckZone =
        isActionPointCard(card)
          ? "ap"
          : "main";

      if (
        totalCards > 0 &&
        deck.series &&
        card.series !==
          deck.series
      ) {
        return {
          ok: false,
          message: `当前卡组属于「${deck.series}」，请先清空或切换卡组。`,
        };
      }

      if (
        zone === "ap" &&
        apCount >=
          AP_DECK_LIMIT
      ) {
        return {
          ok: false,
          message:
            "AP 卡组已经达到 3 张。",
        };
      }

      if (
        zone === "main" &&
        mainCount >=
          MAIN_DECK_LIMIT
      ) {
        return {
          ok: false,
          message:
            "主卡组已经达到 50 张。",
        };
      }

      if (zone === "main") {
        const sameNumberCount =
          deck.entries
            .filter(
              (entry) =>
                entry.zone ===
                  "main" &&
                entry.number ===
                  card.number,
            )
            .reduce(
              (
                total,
                entry,
              ) =>
                total +
                entry.quantity,
              0,
            );

        if (
          sameNumberCount >=
          CARD_COPY_LIMIT
        ) {
          return {
            ok: false,
            message:
              "同一卡号（包含异图）已经达到 4 张。",
          };
        }
      }

      const nextSeries =
        deck.series ||
        card.series;

      const existingIndex =
        deck.entries.findIndex(
          (entry) =>
            entry.cardId ===
              card.id &&
            entry.zone === zone,
        );

      const nextEntries = [
        ...deck.entries,
      ];

      if (
        existingIndex >= 0
      ) {
        nextEntries[
          existingIndex
        ] = {
          ...nextEntries[
            existingIndex
          ],
          quantity:
            nextEntries[
              existingIndex
            ].quantity + 1,
        };
      } else {
        nextEntries.push({
          cardId: card.id,
          number: card.number,
          quantity: 1,
          zone,
        });
      }

      setDeck(
        updateTimestamp({
          ...deck,
          series: nextSeries,
          name:
            deck.name ===
              "我的卡组" &&
            nextSeries
              ? `${nextSeries} 卡组`
              : deck.name,
          entries: nextEntries,
        }),
      );

      return {
        ok: true,
        message:
          zone === "ap"
            ? `已加入 AP 卡组（${apCount + 1}/${AP_DECK_LIMIT}）`
            : `已加入主卡组（${mainCount + 1}/${MAIN_DECK_LIMIT}）`,
      };
    },
    [
      apCount,
      deck,
      mainCount,
      totalCards,
    ],
  );

  const decreaseCard =
    useCallback(
      (cardId: string) => {
        setDeck(
          (current) => {
            const nextEntries =
              current.entries
                .map((entry) =>
                  entry.cardId ===
                  cardId
                    ? {
                        ...entry,
                        quantity:
                          entry.quantity -
                          1,
                      }
                    : entry,
                )
                .filter(
                  (entry) =>
                    entry.quantity >
                    0,
                );

            return updateTimestamp({
              ...current,
              entries: nextEntries,
            });
          },
        );
      },
      [],
    );

  const removeCard =
    useCallback(
      (cardId: string) => {
        setDeck(
          (current) =>
            updateTimestamp({
              ...current,
              entries:
                current.entries.filter(
                  (entry) =>
                    entry.cardId !==
                    cardId,
                ),
            }),
        );
      },
      [],
    );

  const setQuantity =
    useCallback(
      (
        cardId: string,
        requested: number,
      ) => {
        setDeck(
          (current) => {
            const entry =
              current.entries.find(
                (item) =>
                  item.cardId ===
                  cardId,
              );

            if (!entry) {
              return current;
            }

            const desired =
              Math.max(
                0,
                Math.floor(
                  requested,
                ),
              );

            if (desired === 0) {
              return updateTimestamp({
                ...current,
                entries:
                  current.entries.filter(
                    (item) =>
                      item.cardId !==
                      cardId,
                  ),
              });
            }

            const currentMain =
              current.entries
                .filter(
                  (item) =>
                    item.zone ===
                    "main",
                )
                .reduce(
                  (
                    total,
                    item,
                  ) =>
                    total +
                    item.quantity,
                  0,
                );

            const currentAp =
              current.entries
                .filter(
                  (item) =>
                    item.zone ===
                    "ap",
                )
                .reduce(
                  (
                    total,
                    item,
                  ) =>
                    total +
                    item.quantity,
                  0,
                );

            let maximum = 0;

            if (
              entry.zone === "ap"
            ) {
              maximum =
                AP_DECK_LIMIT -
                (currentAp -
                  entry.quantity);
            } else {
              const otherSameNumber =
                current.entries
                  .filter(
                    (item) =>
                      item.zone ===
                        "main" &&
                      item.number ===
                        entry.number &&
                      item.cardId !==
                        entry.cardId,
                  )
                  .reduce(
                    (
                      total,
                      item,
                    ) =>
                      total +
                      item.quantity,
                    0,
                  );

              const copyMaximum =
                CARD_COPY_LIMIT -
                otherSameNumber;

              const deckMaximum =
                MAIN_DECK_LIMIT -
                (currentMain -
                  entry.quantity);

              maximum = Math.min(
                copyMaximum,
                deckMaximum,
              );
            }

            const nextQuantity =
              Math.min(
                desired,
                Math.max(
                  0,
                  maximum,
                ),
              );

            if (
              nextQuantity <= 0
            ) {
              return updateTimestamp({
                ...current,
                entries:
                  current.entries.filter(
                    (item) =>
                      item.cardId !==
                      cardId,
                  ),
              });
            }

            return updateTimestamp({
              ...current,
              entries:
                current.entries.map(
                  (item) =>
                    item.cardId ===
                    cardId
                      ? {
                          ...item,
                          quantity:
                            nextQuantity,
                        }
                      : item,
                ),
            });
          },
        );
      },
      [],
    );

  const clearDeck =
    useCallback(
      (series = deck.series) => {
        setDeck(
          emptyDeck(series),
        );
      },
      [deck.series],
    );

  const prepareSeries =
    useCallback(
      (series: string) => {
        setDeck(
          (current) => {
            const count =
              current.entries.reduce(
                (
                  total,
                  entry,
                ) =>
                  total +
                  entry.quantity,
                0,
              );

            if (count > 0) {
              return current;
            }

            return {
              ...emptyDeck(
                series,
              ),
              name:
                current.name ===
                  "我的卡组" ||
                !current.name
                  ? `${series} 卡组`
                  : current.name,
            };
          },
        );
      },
      [],
    );

  const setDeckName =
    useCallback(
      (name: string) => {
        setDeck(
          (current) =>
            updateTimestamp({
              ...current,
              name,
            }),
        );
      },
      [],
    );

  const replaceDeck =
    useCallback(
      (
        value: unknown,
      ): DeckActionResult => {
        const source =
          isRecord(value) &&
          isRecord(value.deck)
            ? value.deck
            : value;

        const next =
          normalizeDeck(source);

        if (!next.series) {
          return {
            ok: false,
            message:
              "导入失败：找不到作品系列。",
          };
        }

        if (
          next.entries.length === 0
        ) {
          return {
            ok: false,
            message:
              "导入失败：卡组没有有效卡牌。",
          };
        }

        setDeck(
          updateTimestamp(next),
        );

        return {
          ok: true,
          message:
            "卡组已成功导入。",
        };
      },
      [],
    );

  const saveSnapshot =
    useCallback((): DeckActionResult => {
      if (
        deck.entries.length === 0
      ) {
        return {
          ok: false,
          message:
            "当前卡组是空的，无法保存。",
        };
      }

      const snapshot: SavedDeck =
        {
          ...updateTimestamp(
            deck,
          ),
          snapshotId:
            createId(),
          savedAt: nowIso(),
        };

      setSavedDecks(
        (current) => [
          snapshot,
          ...current,
        ],
      );

      return {
        ok: true,
        message: `已保存「${deck.name || "我的卡组"}」。`,
      };
    }, [deck]);

  const loadSnapshot =
    useCallback(
      (
        snapshotId: string,
      ): LoadDeckResult => {
        const snapshot =
          savedDecks.find(
            (item) =>
              item.snapshotId ===
              snapshotId,
          );

        if (!snapshot) {
          return {
            ok: false,
            message:
              "找不到这个已保存卡组。",
          };
        }

        const next: StoredDeck = {
          version: 1,
          name: snapshot.name,
          series:
            snapshot.series,
          entries:
            snapshot.entries.map(
              (entry) => ({
                ...entry,
              }),
            ),
          updatedAt: nowIso(),
        };

        setDeck(next);

        return {
          ok: true,
          message: `已载入「${next.name}」。`,
          deck: next,
        };
      },
      [savedDecks],
    );

  const deleteSnapshot =
    useCallback(
      (snapshotId: string) => {
        setSavedDecks(
          (current) =>
            current.filter(
              (item) =>
                item.snapshotId !==
                snapshotId,
            ),
        );
      },
      [],
    );

  return {
    hydrated,
    deck,
    savedDecks,
    mainCount,
    apCount,
    totalCards,
    addCard,
    decreaseCard,
    removeCard,
    setQuantity,
    getCardQuantity,
    clearDeck,
    prepareSeries,
    setDeckName,
    replaceDeck,
    saveSnapshot,
    loadSnapshot,
    deleteSnapshot,
  };
}
