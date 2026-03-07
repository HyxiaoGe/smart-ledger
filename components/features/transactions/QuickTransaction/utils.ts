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

export function getQuickSuggestionConfidenceColor(confidence: number) {
  if (confidence >= 0.8) return 'bg-green-100 text-green-700 border-green-200';
  if (confidence >= 0.6) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (confidence >= 0.4) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-gray-100 text-gray-700 border-gray-200 dark:border-gray-700';
}

export function getQuickSuggestionCategoryIcon(category: string) {
  const icons: Record<string, string> = {
    food: '🍱',
    drink: '☕',
    transport: '🚇',
    daily: '🛒',
    subscription: '📱',
    entertainment: '🎮',
    medical: '💊',
    education: '📚',
  };

  return icons[category] || '💰';
}

export function resolveQuickTransactionAmount(
  item: QuickTransactionItem,
  customAmount?: string
): { amount?: number; error?: string } {
  if (item.isFixed) {
    return { amount: item.fixedAmount };
  }

  if (!customAmount || customAmount.trim() === '') {
    if (item.suggestedAmount && item.suggestedAmount > 0) {
      return { amount: item.suggestedAmount };
    }

    return { error: '请输入有效金额' };
  }

  const parsedAmount = parseFloat(customAmount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return { error: '请输入有效金额' };
  }

  return { amount: parsedAmount };
}
