import { mushokuTenseiCards } from "./mushoku-tensei";

export type { Card } from "./types";

export { mushokuTenseiCards } from "./mushoku-tensei";

export const cards = [
  ...mushokuTenseiCards
];

export const cardsBySeries = {
  "无职转生": mushokuTenseiCards,
};

export const seriesNames =
  Object.keys(cardsBySeries);
