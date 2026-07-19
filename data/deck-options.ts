/*
 * 卡零社投稿页：手动牌组选项
 *
 * 作品系列不需要在这里重复维护。
 * 投稿页会直接读取：
 *
 * data/card-series-generated/index.ts
 *
 * 导出的 seriesNames，因此新增卡牌系列后会自动同步。
 *
 * 这里只需要填写希望预先显示的牌组名称。
 * 已公开的投稿牌组也会由 Supabase 自动加入对应系列。
 *
 * 示例：
 *
 * export const manualDeckOptionsBySeries = {
 *   "犬夜叉": [
 *     "犬夜叉",
 *     "杀生丸",
 *   ],
 *   "无职转生": [
 *     "洛琪希迷宫",
 *     "鲁迪乌斯",
 *   ],
 * };
 *
 * 左边作品名称必须与卡牌资料库的中文系列名称完全相同。
 */

export const manualDeckOptionsBySeries: Record<
  string,
  string[]
> = {};
