import HomePageClient from './page-client';
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from '@/lib/config/config';
import { loadPageData, resolveMonthLabel } from './home-page-data';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function ensureString(value?: string | string[]): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export default async function HomePage({ searchParams }: { searchParams?: SearchParams }) {
  const currencyParam = ensureString(searchParams?.currency);
  const rangeParam = ensureString(searchParams?.range) || 'today';
  const monthParam = ensureString(searchParams?.month);
  const startParam = ensureString(searchParams?.start);
  const endParam = ensureString(searchParams?.end);

  const currency = SUPPORTED_CURRENCIES.some((c) => c.code === (currencyParam || ''))
    ? (currencyParam as string)
    : DEFAULT_CURRENCY;

  const monthLabel = resolveMonthLabel(monthParam);
  const pageData = await loadPageData(currency, monthLabel, rangeParam, startParam, endParam);

  return (
    <HomePageClient
      data={pageData}
      currency={currency}
      rangeParam={rangeParam}
      monthLabel={monthLabel}
    />
  );
}
