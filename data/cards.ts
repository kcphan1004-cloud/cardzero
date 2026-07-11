export type Card = {
  id: string;
  number: string;
  name: string;
  series: string;
  color: string;
  type: string;
  rarity: string;
  cost: number;
  ap: number;
  bp: number;
  effect: string;
  image: string;
};

export const cards: Card[] = [
  {
    id: "ua-001",
    number: "UA01BT-001",
    name: "示范卡牌 A",
    series: "UNION ARENA",
    color: "红色",
    type: "角色卡",
    rarity: "R",
    cost: 2,
    ap: 1,
    bp: 3000,
    effect: "登场时，抽一张牌。",
    image: "/cards/ua-001.jpg",
  },
  {
    id: "ua-002",
    number: "UA01BT-002",
    name: "示范卡牌 B",
    series: "UNION ARENA",
    color: "蓝色",
    type: "角色卡",
    rarity: "SR",
    cost: 3,
    ap: 1,
    bp: 4000,
    effect: "攻击时，可以选择对手前线的一张角色卡。",
    image: "/cards/ua-002.jpg",
  },
  {
    id: "ua-003",
    number: "UA01BT-003",
    name: "示范卡牌 C",
    series: "UNION ARENA",
    color: "紫色",
    type: "事件卡",
    rarity: "U",
    cost: 1,
    ap: 1,
    bp: 0,
    effect: "从牌库上方查看三张牌。",
    image: "/cards/ua-003.jpg",
  },
];