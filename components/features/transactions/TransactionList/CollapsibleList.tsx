"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TransactionGroupedList } from '@/components/features/transactions/TransactionList/GroupedList';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, List, FileText } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import Link from 'next/link';
import { enhancedDataSync } from '@/lib/core/EnhancedDataSync';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  currency?: string;
  note?: string;
  date: string;
  merchant?: string;
  subcategory?: string;
  product?: string;
}

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
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  // 监听数据同步事件并刷新页面
  useEffect(() => {
    const handleTransactionChange = () => {
      // 刷新页面以获取最新数据
      router.refresh();
    };

    const offAdded = enhancedDataSync.onEvent('transaction_added', handleTransactionChange);
    const offUpdated = enhancedDataSync.onEvent('transaction_updated', handleTransactionChange);
    const offDeleted = enhancedDataSync.onEvent('transaction_deleted', handleTransactionChange);

    return () => {
      offAdded();
      offUpdated();
      offDeleted();
    };
  }, [router]);

  return (
    <div className={className}>
      {/* 控制按钮 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <List className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            账单明细
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
            共 {totalCount} 笔
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
        >
          <span className="text-sm">
            {isExpanded ? '收起明细' : '展开明细'}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* 交易列表 */}
      {isExpanded && (
        <div className="animate-in slide-in-from-top-2 duration-200">
          <TransactionGroupedList
            initialTransactions={initialTransactions}
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