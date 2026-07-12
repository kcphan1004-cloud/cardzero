import { z } from "zod";

const optionalText = (maxLength: number) =>
  z.preprocess(
    (value) => {
      const text = String(value ?? "").trim();
      return text === "" ? undefined : text;
    },
    z.string().max(maxLength).optional(),
  );

const optionalUrl = z.preprocess(
  (value) => {
    const text = String(value ?? "").trim();
    return text === "" ? undefined : text;
  },
  z
    .string()
    .url("牌表链接格式不正确。")
    .max(500)
    .optional(),
);

export const submissionSchema = z.object({
  authorName: z
    .string()
    .trim()
    .min(2, "投稿者名称至少需要 2 个字。")
    .max(40, "投稿者名称最多 40 个字。"),

  contact: optionalText(120),

  deckName: z
    .string()
    .trim()
    .min(2, "牌组名称至少需要 2 个字。")
    .max(80, "牌组名称最多 80 个字。"),

  series: z
    .string()
    .trim()
    .min(1, "请填写作品系列。")
    .max(80, "作品系列最多 80 个字。"),

  color: z
    .string()
    .trim()
    .min(1, "请选择主要颜色。")
    .max(30),

  deckType: z
    .string()
    .trim()
    .min(1, "请选择牌组类型。")
    .max(50),

  deckCode: optionalText(4000),
  deckLink: optionalUrl,

  description: z
    .string()
    .trim()
    .min(20, "牌组介绍至少需要 20 个字。")
    .max(3000, "牌组介绍最多 3000 个字。"),

  strategy: z
    .string()
    .trim()
    .min(20, "操作思路至少需要 20 个字。")
    .max(5000, "操作思路最多 5000 个字。"),

  consent: z.literal("true", {
    error: "投稿前必须同意公开展示。",
  }),

  website: z
    .string()
    .max(0, "投稿验证失败。")
    .optional()
    .default(""),
});

export type SubmissionInput = z.infer<
  typeof submissionSchema
>;

export function firstZodError(
  error: z.ZodError,
) {
  return (
    error.issues[0]?.message ||
    "投稿资料格式不正确。"
  );
}
