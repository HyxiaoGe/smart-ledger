export function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const prevStart = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const prevEnd = new Date(date.getFullYear(), date.getMonth(), 1);
  // 使用本地时间格式化日期，避免 toISOString() 的时区问题
  const toLocalDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  return {
    start: toLocalDate(start),
    end: toLocalDate(end),
    prevStart: toLocalDate(prevStart),
    prevEnd: toLocalDate(prevEnd)
  };
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

export function todayISO(now = new Date()): string {
  // 使用本地时间格式化日期，避免时区问题
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 将Date对象格式化为YYYY-MM-DD字符串（使用本地时区）
 * 避免使用toISOString()导致的时区问题
 * @param date Date对象
 * @returns YYYY-MM-DD格式的字符串
 */
export function formatDateToLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dayRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  // 使用本地时间格式化日期，避免时区问题
  const toLocalDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  return { start: toLocalDate(start), end: toLocalDate(end) };
}

export function yesterdayRange(now = new Date()) {
  const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return dayRange(y);
}

export function lastNDaysRange(n: number, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (n - 1));
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  // 使用本地时间格式化日期，避免时区问题
  const toLocalDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  return { start: toLocalDate(start), end: toLocalDate(end) };
}

export type QuickRange = 'today' | 'yesterday' | 'last7' | 'month';

export function getQuickRange(range: QuickRange, month?: string) {
  // 确保所有范围计算使用相同的时间基准，避免时间不一致问题
  const now = new Date();
  now.setHours(0, 0, 0, 0); // 设置为当天的开始，避免时间部分的影响
  if (range === 'today') return { label: '今日', ...dayRange(now) };
  if (range === 'yesterday') return { label: '昨日', ...yesterdayRange(now) };
  if (range === 'last7') return { label: '近7日', ...lastNDaysRange(7, now) };
  // month
  const base = parseMonthStr(month || formatMonth(now)) || now;
  const m = monthRange(base);
  return { label: `${formatMonth(base)}`, ...m };
}

/**
 * 获取指定日期所在周的范围（周一到周日）
 */
export function weekRange(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOfWeek = d.getDay();
  // 调整为周一为一周的开始（周日是0，需要转为7）
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diff);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);

  return {
    start: formatDateToLocal(monday),
    end: formatDateToLocal(nextMonday),
    label: `${formatDateToLocal(monday).slice(5)} ~ ${formatDateToLocal(new Date(nextMonday.getTime() - 86400000)).slice(5)}`
  };
}

/**
 * 获取上周的日期范围
 */
export function lastWeekRange(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 7);
  return weekRange(d);
}

/**
 * 获取上上周的日期范围
 */
export function weekBeforeLastRange(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 14);
  return weekRange(d);
}

/**
 * 获取上月的日期范围
 */
export function lastMonthRange(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return {
    start: formatDateToLocal(start),
    end: formatDateToLocal(end),
    label: formatMonth(d)
  };
}

/**
 * 获取上上月的日期范围
 */
export function monthBeforeLastRange(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth() - 2, 1);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return {
    start: formatDateToLocal(start),
    end: formatDateToLocal(end),
    label: formatMonth(d)
  };
}

/**
 * 获取指定日期所在季度的范围
 */
export function quarterRange(date = new Date()) {
  const quarter = Math.floor(date.getMonth() / 3);
  const start = new Date(date.getFullYear(), quarter * 3, 1);
  const end = new Date(date.getFullYear(), quarter * 3 + 3, 1);
  const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];
  return {
    start: formatDateToLocal(start),
    end: formatDateToLocal(end),
    label: `${date.getFullYear()}年${quarterNames[quarter]}`
  };
}

/**
 * 获取上季度的日期范围
 */
export function lastQuarterRange(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth() - 3, 1);
  return quarterRange(d);
}

/**
 * 前天的日期范围
 */
export function dayBeforeYesterdayRange(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
  return dayRange(d);
}

/**
 * 扩展的快捷范围类型
 */
export type ExtendedQuickRange =
  // 日视角
  | 'today' | 'yesterday' | 'dayBeforeYesterday'
  // 周视角
  | 'thisWeek' | 'lastWeek' | 'weekBeforeLast'
  // 月视角
  | 'thisMonth' | 'lastMonth' | 'monthBeforeLast'
  // 季视角
  | 'thisQuarter' | 'lastQuarter'
  // 自定义
  | 'custom';

/**
 * 获取扩展的快捷范围
 */
export function getExtendedQuickRange(range: ExtendedQuickRange, now = new Date()): { start: string; end: string; label: string } {
  now.setHours(0, 0, 0, 0);

  switch (range) {
    // 日视角
    case 'today':
      return { ...dayRange(now), label: '今天' };
    case 'yesterday':
      return { ...yesterdayRange(now), label: '昨天' };
    case 'dayBeforeYesterday':
      return { ...dayBeforeYesterdayRange(now), label: '前天' };

    // 周视角
    case 'thisWeek':
      return { ...weekRange(now), label: '本周' };
    case 'lastWeek':
      return { ...lastWeekRange(now), label: '上周' };
    case 'weekBeforeLast':
      return { ...weekBeforeLastRange(now), label: '上上周' };

    // 月视角
    case 'thisMonth': {
      const m = monthRange(now);
      return { start: m.start, end: m.end, label: '本月' };
    }
    case 'lastMonth':
      return { ...lastMonthRange(now), label: '上月' };
    case 'monthBeforeLast':
      return { ...monthBeforeLastRange(now), label: '上上月' };

    // 季视角
    case 'thisQuarter':
      return { ...quarterRange(now), label: '本季度' };
    case 'lastQuarter':
      return { ...lastQuarterRange(now), label: '上季度' };

    default:
      return { ...dayRange(now), label: '今天' };
  }
}
