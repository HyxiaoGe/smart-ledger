"use client";

import React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { SUPPORTED_CURRENCIES } from '@/lib/config';

type CurrencySelectProps = {
  value: string;
  month: string;
  range: string;
};

export function CurrencySelect({ value, month, range }: CurrencySelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value;
    const params = new URLSearchParams(searchParams?.toString());
    params.set('currency', next);
    if (month) params.set('month', month);
    if (range) params.set('range', range);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <select
      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
      value={value}
      onChange={handleChange}
    >
      {SUPPORTED_CURRENCIES.map((item) => (
        <option key={item.code} value={item.code}>
          {item.code}
        </option>
      ))}
    </select>
  );
}
