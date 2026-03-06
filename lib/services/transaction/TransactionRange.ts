import {
  formatDateToLocal,
  formatMonth,
  getExtendedQuickRange,
  parseLocalDate,
  parseMonthStr,
  type ExtendedQuickRange,
} from '@/lib/utils/date';

export type TransactionRangeGranularity = 'day' | 'week' | 'month' | 'quarter';

export type TransactionRangeParams = {
  month?: string;
  range?: string;
  startDate?: string;
  endDate?: string;
};

export interface ResolvedTransactionRange {
  key: string;
  label: string;
  displayStart: string;
  displayEnd: string;
  queryStart: string;
  queryEnd: string;
  isSingleDay: boolean;
  granularity: TransactionRangeGranularity;
  previousRange: {
    key: string;
    label: string;
    queryStart: string;
    queryEnd: string;
  };
}

const EXTENDED_RANGE_KEYS: ExtendedQuickRange[] = [
  'today',
  'yesterday',
  'dayBeforeYesterday',
  'thisWeek',
  'lastWeek',
  'weekBeforeLast',
  'thisMonth',
  'lastMonth',
  'monthBeforeLast',
  'thisQuarter',
  'lastQuarter',
];

export function resolveTransactionRange({
  month,
  range,
  startDate,
  endDate,
}: TransactionRangeParams): ResolvedTransactionRange | null {
  const normalizedRange = range || 'month';

  if (normalizedRange === 'custom') {
    if (!startDate || !endDate) return null;

    const isSingleDay = startDate === endDate;
    const label = isFullMonthRange(startDate, endDate)
      ? getFullMonthLabel(startDate)
      : `${startDate.slice(5)} ~ ${endDate.slice(5)}`;

    return {
      key: normalizedRange,
      label,
      displayStart: startDate,
      displayEnd: endDate,
      queryStart: startDate,
      queryEnd: addDays(endDate, 1),
      isSingleDay,
      granularity: 'day',
      previousRange: resolvePreviousRange(normalizedRange),
    };
  }

  if (normalizedRange !== 'month') {
    if (!EXTENDED_RANGE_KEYS.includes(normalizedRange as ExtendedQuickRange)) {
      return null;
    }

    const resolved = getExtendedQuickRange(normalizedRange as ExtendedQuickRange);
    const isSingleDay = ['today', 'yesterday', 'dayBeforeYesterday'].includes(normalizedRange);

    return {
      key: normalizedRange,
      label: resolved.label,
      displayStart: resolved.start,
      displayEnd: resolved.end,
      queryStart: resolved.start,
      queryEnd: resolved.end,
      isSingleDay,
      granularity: getRangeGranularity(normalizedRange),
      previousRange: resolvePreviousRange(normalizedRange),
    };
  }

  const parsedMonth = parseMonthStr(month || formatMonth(new Date()));
  if (!parsedMonth) return null;

  const monthStart = formatDateToLocal(new Date(parsedMonth.getFullYear(), parsedMonth.getMonth(), 1));
  const monthEnd = formatDateToLocal(
    new Date(parsedMonth.getFullYear(), parsedMonth.getMonth() + 1, 1)
  );

  return {
    key: normalizedRange,
    label: formatMonth(parsedMonth),
    displayStart: monthStart,
    displayEnd: monthEnd,
    queryStart: monthStart,
    queryEnd: monthEnd,
    isSingleDay: false,
    granularity: 'month',
    previousRange: resolvePreviousRange('thisMonth'),
  };
}

function resolvePreviousRange(rangeKey: string) {
  const prevKey = getPreviousRangeKey(rangeKey);
  const resolved = getExtendedQuickRange(prevKey);

  return {
    key: prevKey,
    label: resolved.label,
    queryStart: resolved.start,
    queryEnd: resolved.end,
  };
}

function getPreviousRangeKey(rangeKey: string): ExtendedQuickRange {
  const prevMap: Record<string, ExtendedQuickRange> = {
    today: 'yesterday',
    yesterday: 'dayBeforeYesterday',
    dayBeforeYesterday: 'dayBeforeYesterday',
    thisWeek: 'lastWeek',
    lastWeek: 'weekBeforeLast',
    weekBeforeLast: 'weekBeforeLast',
    thisMonth: 'lastMonth',
    month: 'lastMonth',
    lastMonth: 'monthBeforeLast',
    monthBeforeLast: 'monthBeforeLast',
    thisQuarter: 'lastQuarter',
    lastQuarter: 'lastQuarter',
    custom: 'yesterday',
  };

  return prevMap[rangeKey] || 'yesterday';
}

function getRangeGranularity(rangeKey: string): TransactionRangeGranularity {
  if (['today', 'yesterday', 'dayBeforeYesterday'].includes(rangeKey)) return 'day';
  if (['thisWeek', 'lastWeek', 'weekBeforeLast'].includes(rangeKey)) return 'week';
  if (['thisMonth', 'lastMonth', 'monthBeforeLast', 'month'].includes(rangeKey)) return 'month';
  if (['thisQuarter', 'lastQuarter'].includes(rangeKey)) return 'quarter';
  return 'day';
}

function addDays(dateStr: string, days: number): string {
  const date = parseLocalDate(dateStr) ?? new Date(dateStr);
  date.setDate(date.getDate() + days);
  return formatDateToLocal(date);
}

function isFullMonthRange(startStr: string, endStr: string): boolean {
  const start = parseLocalDate(startStr);
  const end = parseLocalDate(endStr);
  if (!start || !end) return false;
  if (start.getFullYear() !== end.getFullYear()) return false;
  if (start.getMonth() !== end.getMonth()) return false;
  if (start.getDate() !== 1) return false;
  const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  return end.getDate() === lastDay;
}

function getFullMonthLabel(startStr: string): string {
  const parsed = parseLocalDate(startStr);
  if (!parsed) return startStr;
  return `${parsed.getFullYear()}年${parsed.getMonth() + 1}月`;
}
