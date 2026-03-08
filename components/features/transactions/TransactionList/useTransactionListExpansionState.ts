'use client';

import { useEffect, useRef, useState } from 'react';

type ExpandedState = {
  dates?: string[];
  categories?: string[];
  merchants?: string[];
};

const STORAGE_KEY = 'records:expanded';

function toggleSetValue(current: Set<string>, key: string) {
  const next = new Set(current);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  return next;
}

export function useTransactionListExpansionState(defaultExpandedDates?: Set<string>) {
  const initRef = useRef(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedMerchants, setExpandedMerchants] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    if (typeof window === 'undefined') return;

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ExpandedState;
        if (parsed.dates?.length) setExpandedDates(new Set(parsed.dates));
        if (parsed.categories?.length) setExpandedCategories(new Set(parsed.categories));
        if (parsed.merchants?.length) setExpandedMerchants(new Set(parsed.merchants));
        return;
      } catch {
        // ignore malformed storage
      }
    }

    if (defaultExpandedDates) {
      setExpandedDates(new Set(defaultExpandedDates));
    }
  }, [defaultExpandedDates]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = JSON.stringify({
      dates: Array.from(expandedDates),
      categories: Array.from(expandedCategories),
      merchants: Array.from(expandedMerchants),
    });
    window.localStorage.setItem(STORAGE_KEY, payload);
  }, [expandedCategories, expandedDates, expandedMerchants]);

  return {
    expandedDates,
    expandedCategories,
    expandedMerchants,
    toggleDate: (date: string) => setExpandedDates((current) => toggleSetValue(current, date)),
    toggleCategory: (key: string) =>
      setExpandedCategories((current) => toggleSetValue(current, key)),
    toggleMerchant: (key: string) =>
      setExpandedMerchants((current) => toggleSetValue(current, key)),
  };
}
