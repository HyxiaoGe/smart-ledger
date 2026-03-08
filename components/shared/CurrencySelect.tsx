'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { Route } from 'next';
import { SUPPORTED_CURRENCIES } from '@/lib/config/config';
import { buildTransactionPageHref } from '@/lib/services/transaction/pageParams';

type CurrencySelectProps = {
  value: string;
};

function CurrencySelectContent({ value }: CurrencySelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value;
    router.push(
      buildTransactionPageHref(pathname, searchParams?.toString(), {
        currency: next,
      }) as Route
    );
  };

  return (
    <select
      className="h-9 rounded-md border border-input bg-background px-3 text-sm transition-all duration-200 ease-in-out hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm cursor-pointer"
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

export function CurrencySelect(props: CurrencySelectProps) {
  return (
    <Suspense fallback={<select className="h-9 rounded-md border border-input bg-background px-3 text-sm" disabled><option>CNY</option></select>}>
      <CurrencySelectContent {...props} />
    </Suspense>
  );
}
