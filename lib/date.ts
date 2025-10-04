// 日期工具（中文注释）：提供按月范围、格式化与相邻月份计算

export function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const prevStart = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const prevEnd = new Date(date.getFullYear(), date.getMonth(), 1);
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  return { start: toISO(start), end: toISO(end), prevStart: toISO(prevStart), prevEnd: toISO(prevEnd) };
}

export function parseMonthStr(yyyyMM?: string): Date | null {
  if (!yyyyMM) return null;
  const m = /^([0-9]{4})-([0-9]{2})$/.exec(yyyyMM);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  if (mo < 0 || mo > 11) return null;
  return new Date(y, mo, 1);
}

export function formatMonth(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  return `${y}-${m}`;
}

export function shiftMonth(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

// 新增：日维度与快捷范围（中文注释）
export function todayISO(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function dayRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  return { start: toISO(start), end: toISO(end) };
}

export function yesterdayRange(now = new Date()) {
  const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return dayRange(y);
}

export function lastNDaysRange(n: number, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (n - 1));
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  return { start: toISO(start), end: toISO(end) };
}

export type QuickRange = 'today' | 'yesterday' | 'last7' | 'month';

export function getQuickRange(range: QuickRange, month?: string) {
  const now = new Date();
  if (range === 'today') return { label: '今日', ...dayRange(now) };
  if (range === 'yesterday') return { label: '昨日', ...yesterdayRange(now) };
  if (range === 'last7') return { label: '近7日', ...lastNDaysRange(7, now) };
  // month
  const base = parseMonthStr(month || formatMonth(now)) || now;
  const m = monthRange(base);
  return { label: `${formatMonth(base)}`, ...m };
}
