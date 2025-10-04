"use client";
// 币种下拉选择（中文注释）：客户端组件，切换后通过路由参数跳转
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
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={value} onChange={onChange}>
      {SUPPORTED_CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>{c.code}</option>
      ))}
    </select>
  );
}

