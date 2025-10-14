import { SUPPORTED_CURRENCIES } from '@/lib/config';

export function currencySymbol(code: string): string {
  const c = SUPPORTED_CURRENCIES.find((x) => x.code === code);
  return c?.symbol ?? '';
}

export function formatAmount(n: number): string {
  if (Number.isNaN(n)) return '0';
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatCurrency(n: number, code: string): string {
  return `${currencySymbol(code)}${formatAmount(n)}`;
}

