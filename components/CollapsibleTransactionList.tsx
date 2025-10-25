"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TransactionGroupedList } from '@/components/TransactionGroupedList';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, List } from 'lucide-react';
import { dataSync } from '@/lib/dataSync';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  currency?: string;
  note?: string;
  date: string;
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

    const offAdded = dataSync.onEvent('transaction_added', handleTransactionChange);
    const offUpdated = dataSync.onEvent('transaction_updated', handleTransactionChange);
    const offDeleted = dataSync.onEvent('transaction_deleted', handleTransactionChange);

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
          <List className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">
            账单明细
          </h3>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            共 {totalCount} 笔
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 hover:bg-gray-50 transition-colors duration-200"
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
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-gray-500">
            <div className="text-sm mb-2">账单明细已收起</div>
            <div className="text-xs text-gray-400">
              点击"展开明细"按钮查看所有账单记录
            </div>
          </div>
        </div>
      )}

      {/* 无数据状态 */}
      {!isExpanded && totalCount === 0 && (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-lg">暂无账单记录</div>
          <div className="text-sm mt-2">点击"添加账单"开始记录您的支出</div>
        </div>
      )}
    </div>
  );
}