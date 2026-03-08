'use client';

import type { DateGroup, TransactionRowEditControls } from '../types';
import { DateGroupRow } from './DateGroupRow';
import { TransactionListEmptyState } from './TransactionListEmptyState';

interface GroupedTransactionTreeProps {
  hierarchicalData: Record<string, DateGroup>;
  sortedDates: string[];
  expandedDates: Set<string>;
  expandedCategories: Set<string>;
  expandedMerchants: Set<string>;
  rowControls: TransactionRowEditControls;
  onToggleDate: (date: string) => void;
  onToggleCategory: (key: string) => void;
  onToggleMerchant: (key: string) => void;
}

export function GroupedTransactionTree({
  hierarchicalData,
  sortedDates,
  expandedDates,
  expandedCategories,
  expandedMerchants,
  rowControls,
  onToggleDate,
  onToggleCategory,
  onToggleMerchant,
}: GroupedTransactionTreeProps) {
  if (sortedDates.length === 0) {
    return <TransactionListEmptyState />;
  }

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => (
        <DateGroupRow
          key={date}
          dateData={hierarchicalData[date]}
          date={date}
          isExpanded={expandedDates.has(date)}
          onToggle={() => onToggleDate(date)}
          expandedCategories={expandedCategories}
          onToggleCategory={onToggleCategory}
          expandedMerchants={expandedMerchants}
          onToggleMerchant={onToggleMerchant}
          rowControls={rowControls}
        />
      ))}
    </div>
  );
}
