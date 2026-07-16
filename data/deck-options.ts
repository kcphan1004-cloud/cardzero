/*
 * 卡零社投稿页：手动牌组选项
 *
 * 系统也会自动读取 Supabase 中已经公开的投稿，
 * 并把相同作品的现有牌组加入下拉选单。
 *
 * 这里可以加入尚未有人投稿，但你希望预先显示的牌组。
 *
 * 写法示例：
 *
 * export const manualDeckOptionsBySeries = {
 *   "犬夜叉": [
 *     "犬夜叉",
 *     "杀生丸",
 *   ],
 *   "链锯人": [
 *     "链锯人",
 *     "蕾洁",
 *   ],
 * };
 *
 * 左边作品名称必须与网站“作品系列”的中文名称完全相同。
 */

export const manualDeckOptionsBySeries: Record<
  string,
  string[]
> = {};
