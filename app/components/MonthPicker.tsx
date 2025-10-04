"use client";
// 月份选择器（中文注释）：使用 <input type="month"> 并同步到 URL 查询参数
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

export function MonthPicker({ param = 'month' }: { param?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const cur = search.get(param) || '';
  const [value, setValue] = useState(cur);

  const onChange = useCallback((v: string) => {
    setValue(v);
    const sp = new URLSearchParams(search?.toString());
    if (v) sp.set(param, v); else sp.delete(param);
    router.push(`${pathname}?${sp.toString()}`);
  }, [router, pathname, search, param]);

  return (
    <input
      className="h-9 w-[160px] rounded-md border border-input bg-background px-3 text-sm"
      type="month"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

