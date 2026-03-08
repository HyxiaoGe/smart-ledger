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
