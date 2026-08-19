/**
 * 日期工具 —— 统一使用本地时区，避免 `toISOString()`（UTC）在 GMT+8 凌晨产生日期错位。
 *
 * 背景：原代码大量使用 `new Date().toISOString().split('T')[0]` 获取"今日"，
 * 该值基于 UTC 时间，北京时间 00:00–07:59 之间会返回前一天日期，导致
 * 今日任务、连续天数（streak）等核心逻辑错乱。此处统一收口。
 */

/** 本地时区的今日日期字符串 YYYY-MM-DD */
export const getTodayStr = (): string => {
  const now = new Date();
  return formatDate(now);
};

/** 本地时区的昨日日期字符串 YYYY-MM-DD */
export const getYesterdayStr = (): string => {
  const now = new Date();
  return formatDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
};

/** 将 Date 格式化为本地时区 YYYY-MM-DD */
export const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * 两个 YYYY-MM-DD 日期字符串的日历日差（b - a，按本地时区）。
 * 例如 daysBetween('2026-08-13', '2026-08-14') === 1。
 * 相比 `(t2 - t1) / 86400000` 的硬编码方式，可正确处理跨月/跨年与夏令时边界。
 */
export const daysBetween = (a: string, b: string): number => {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const dateA = new Date(ay, am - 1, ad);
  const dateB = new Date(by, bm - 1, bd);
  return Math.round((dateB.getTime() - dateA.getTime()) / 86400000);
};
