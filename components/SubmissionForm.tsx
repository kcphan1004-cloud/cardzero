"use client";
type SubmissionFormProps = {
  seriesOptions: string[];
};

export default function SubmissionForm({
  seriesOptions,
}: SubmissionFormProps) {
  // 其余代码
}

const DECK_TYPE_OPTIONS = [
  {
    value: "快攻",
    label: "快攻",
    description: "前期快速展开并压制对手",
  },
  {
    value: "中速",
    label: "中速",
    description: "兼顾展开速度与场面强度",
  },
  {
    value: "控制",
    label: "控制",
    description: "防守、解场并掌握比赛节奏",
  },
  {
    value: "组合技",
    label: "组合技",
    description: "依靠卡牌连动完成核心战术",
  },
  {
    value: "娱乐",
    label: "娱乐",
    description: "主题构筑与有趣玩法",
  },
  {
    value: "比赛",
    label: "比赛",
    description: "针对赛事环境调整的牌组",
  },
] as const;