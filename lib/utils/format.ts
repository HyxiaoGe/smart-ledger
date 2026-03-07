import { SUPPORTED_CURRENCIES } from '@/lib/config/config';

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

export function formatCurrencyAmount(amount: number | null | undefined): string {
  if (amount == null) return '0.00';

  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatSignedPercentage(
  value: number | null | undefined,
  digits = 1
): string {
  if (value == null) return `+${(0).toFixed(digits)}%`;

  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatSharePercentage(
  value: number,
  total: number,
  digits = 1
): string {
  if (total <= 0) return `${(0).toFixed(digits)}%`;
  return `${((value / total) * 100).toFixed(digits)}%`;
}
