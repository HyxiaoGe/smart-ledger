'use client';

import { ITEM_KEYWORDS, QUICK_ITEMS } from './constants';
import type { QuickTransactionItem } from './types';

type TransactionLike = {
  note?: string | null;
  amount?: number | null;
};

export function matchQuickTransactionItem(note?: string | null): QuickTransactionItem | undefined {
  if (!note) return undefined;

  return QUICK_ITEMS.find(item => {
    if (note === item.title) return true;

    const itemKeywords = ITEM_KEYWORDS[item.id] || [item.title];
    return itemKeywords.some(keyword => note.includes(keyword) || keyword.includes(note));
  });
}

export function getQuickTransactionStats(transactions: TransactionLike[]) {
  let totalAmount = 0;
  const matchedItems = new Set<string>();
  let matchedCount = 0;

  transactions.forEach(transaction => {
    const matchedItem = matchQuickTransactionItem(transaction.note);
    if (!matchedItem) return;

    matchedCount += 1;
    matchedItems.add(matchedItem.id);
    totalAmount += transaction.amount || 0;
  });

  return {
    matchedCount,
    matchedItems,
    totalAmount,
  };
}
