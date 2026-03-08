"use client";

import { TransactionGroupedList } from '@/components/features/transactions/TransactionList/GroupedList';
import { FileText } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import Link from 'next/link';
import type { Transaction } from '@/types/domain/transaction';
import { CollapsibleListControls } from './components/CollapsibleListControls';
import { useCollapsibleTransactionListController } from './useCollapsibleTransactionListController';

interface CollapsibleTransactionListProps {
  initialTransactions: Transaction[];
  totalCount: number;
  className?: string;
}

export function CollapsibleTransactionList({
  initialTransactions,
  totalCount,
  className
}: CollapsibleTransactionListProps) {
  const {
    isExpanded,
    setIsExpanded,
    defaultExpandedDates,
    activeCategory,
    setActiveCategory,
    currentRange,
    quickRanges,
    commonCategories,
    filteredTransactions,
    displayCount,
    updateRange,
  } = useCollapsibleTransactionListController({
    initialTransactions,
    totalCount,
  });

  return (
    <div className={className}>
      <CollapsibleListControls
        isExpanded={isExpanded}
        displayCount={displayCount}
        totalCount={totalCount}
        currentRange={currentRange}
        quickRanges={quickRanges}
        commonCategories={commonCategories}
        activeCategory={activeCategory}
        onToggleExpanded={() => setIsExpanded(!isExpanded)}
        onSelectRange={updateRange}
        onSelectCategory={setActiveCategory}
      />

      {/* 交易列表 */}
      {isExpanded && (
        <div className="animate-in slide-in-from-top-2 duration-200">
          <TransactionGroupedList
            initialTransactions={filteredTransactions}
            defaultExpandedDates={defaultExpandedDates}
          />
        </div>
      )}

      {/* 收起状态的提示 */}
      {!isExpanded && totalCount > 0 && (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-gray-500 dark:text-gray-400">
            <div className="text-sm mb-2">账单明细已收起</div>
            <div className="text-xs text-gray-400 dark:text-gray-500">
              点击"展开明细"按钮查看所有账单记录
            </div>
          </div>
        </div>
      )}

      {/* 无数据状态 */}
      {!isExpanded && totalCount === 0 && (
        <EmptyState
          icon={FileText}
          title="暂无账单记录"
          description="点击下方按钮开始记录您的第一笔支出"
          action={
            <Link
              href="/add"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              添加账单
            </Link>
          }
        />
      )}
    </div>
  );
}
