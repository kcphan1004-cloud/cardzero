import type { Card } from "../data/card-series-generated";

type SeriesSortKey = {
  uaNumber: number;
  productRank: number;
  volumeNumber: number;
  fullNumber: string;
};

const productTypeRank: Record<
  string,
  number
> = {
  BT: 50,
  EX: 40,
  ST: 30,
  PR: 20,
  AP: 10,
};

export function getCardNumberSortKey(
  cardNumber: string,
): SeriesSortKey {
  const normalized = String(
    cardNumber ?? "",
  )
    .trim()
    .toUpperCase();

  const mainMatch = normalized.match(
    /^UA(\d+)([A-Z]+)?/,
  );

  const volumeMatch = normalized.match(
    /-(\d+)-\d+(?:_|$)/,
  );

  return {
    uaNumber: mainMatch
      ? Number(mainMatch[1])
      : -1,
    productRank:
      productTypeRank[
        mainMatch?.[2] ?? ""
      ] ?? 0,
    volumeNumber: volumeMatch
      ? Number(volumeMatch[1])
      : 0,
    fullNumber: normalized,
  };
}

export function compareSeriesSortKey(
  a: SeriesSortKey,
  b: SeriesSortKey,
) {
  if (a.uaNumber !== b.uaNumber) {
    return b.uaNumber - a.uaNumber;
  }

  if (
    a.productRank !==
    b.productRank
  ) {
    return (
      b.productRank -
      a.productRank
    );
  }

  if (
    a.volumeNumber !==
    b.volumeNumber
  ) {
    return (
      b.volumeNumber -
      a.volumeNumber
    );
  }

  return b.fullNumber.localeCompare(
    a.fullNumber,
    "en",
    {
      numeric: true,
      sensitivity: "base",
    },
  );
}

export function sortSeriesNewestFirst(
  seriesNames: string[],
  cards: Card[],
) {
  const cardsBySeries = new Map<
    string,
    Card[]
  >();

  for (const card of cards) {
    const series =
      String(card.series ?? "").trim();

    if (!series) {
      continue;
    }

    const current =
      cardsBySeries.get(series) ?? [];

    current.push(card);
    cardsBySeries.set(
      series,
      current,
    );
  }

  function getSeriesKey(
    series: string,
  ): SeriesSortKey {
    const seriesCards =
      cardsBySeries.get(series) ?? [];

    let newestKey: SeriesSortKey = {
      uaNumber: -1,
      productRank: 0,
      volumeNumber: 0,
      fullNumber: "",
    };

    for (const card of seriesCards) {
      const nextKey =
        getCardNumberSortKey(
          card.number,
        );

      if (
        compareSeriesSortKey(
          nextKey,
          newestKey,
        ) < 0
      ) {
        newestKey = nextKey;
      }
    }

    return newestKey;
  }

  return [
    ...new Set(
      seriesNames
        .map((series) =>
          String(series).trim(),
        )
        .filter(Boolean),
    ),
  ].sort((a, b) => {
    const keyComparison =
      compareSeriesSortKey(
        getSeriesKey(a),
        getSeriesKey(b),
      );

    if (keyComparison !== 0) {
      return keyComparison;
    }

    return a.localeCompare(
      b,
      "zh-Hans-CN",
    );
  });
}
