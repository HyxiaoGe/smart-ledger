"use client";
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { SUPPORTED_CURRENCIES } from '@/lib/config';

export function CurrencySelect({ value, month, range }: { value: string; month: string; range: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const c = e.target.value;
    const sp = new URLSearchParams(search?.toString());
    sp.set('currency', c);
    if (month) sp.set('month', month);
    if (range) sp.set('range', range);
    router.push(`${pathname}?${sp.toString()}` as any);
  }

  return (
    <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={value} onChange={onChange}>
      {SUPPORTED_CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>{c.code}</option>
      ))}
    </select>
  );
}

