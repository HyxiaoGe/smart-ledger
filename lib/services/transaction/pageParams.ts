import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from '@/lib/config/config';
import { formatMonth } from '@/lib/utils/date';

export type SearchParamValue = string | string[] | undefined;
export type TransactionPageSearchParams = Record<string, SearchParamValue>;

export interface TransactionRangePageParams {
  month?: string;
  range: string;
  start?: string;
  end?: string;
}

export interface HomePageRequestParams extends TransactionRangePageParams {
  currency: string;
  monthLabel: string;
}

export interface TransactionPageSearchUpdates {
  currency?: string | null;
  month?: string | null;
  range?: string | null;
  start?: string | null;
  end?: string | null;
}

export function getSearchParamString(value?: SearchParamValue): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function resolveTransactionRangePageParams(
  searchParams?: TransactionPageSearchParams
): TransactionRangePageParams {
  return {
    month: getSearchParamString(searchParams?.month),
    range: getSearchParamString(searchParams?.range) || 'today',
    start: getSearchParamString(searchParams?.start),
    end: getSearchParamString(searchParams?.end),
  };
}

export function resolveHomePageRequestParams(
  searchParams?: TransactionPageSearchParams
): HomePageRequestParams {
  const rangeParams = resolveTransactionRangePageParams(searchParams);
  const currencyParam = getSearchParamString(searchParams?.currency);
  const currency = SUPPORTED_CURRENCIES.some((item) => item.code === currencyParam)
    ? (currencyParam as string)
    : DEFAULT_CURRENCY;

  return {
    ...rangeParams,
    currency,
    monthLabel: rangeParams.month || formatMonth(new Date()),
  };
}

export function updateTransactionPageSearchParams(
  searchParams?: string,
  updates?: TransactionPageSearchUpdates
): URLSearchParams {
  const params = new URLSearchParams(searchParams);

  if (!updates) {
    return params;
  }

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) {
      continue;
    }

    if (value === null || value === '') {
      params.delete(key);
      continue;
    }

    params.set(key, value);
  }

  return params;
}

export function buildTransactionPageHref(
  pathname: string,
  searchParams?: string,
  updates?: TransactionPageSearchUpdates
) {
  const nextParams = updateTransactionPageSearchParams(searchParams, updates);
  const queryString = nextParams.toString();

  return queryString ? `${pathname}?${queryString}` : pathname;
}

export function buildSingleDayTransactionPageHref(
  pathname: string,
  searchParams: string | undefined,
  date: string
) {
  return buildTransactionPageHref(pathname, searchParams, {
    range: 'custom',
    start: date,
    end: date,
    month: null,
  });
}
