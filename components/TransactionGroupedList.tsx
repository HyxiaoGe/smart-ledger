"use client";
// 按日期分组的交易列表组件（中文注释）
import { useState, useMemo } from 'react';
import { format, isSameDay, startOfMonth, endOfMonth, isWithinInterval, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CategoryChip } from '@/components/CategoryChip';
import { formatCurrency } from '@/lib/format';
import { PRESET_CATEGORIES } from '@/lib/config';
import type { TransactionType } from '@/types/transaction';

type Transaction = {
  id: string;
  type: TransactionType;
  category: string;
  amount: number;
  currency?: string;
  note?: string;
  date: string;
};

export interface TransactionGroup {
  date: string;
  total: number;
  count: number;
  transactions: Transaction[];
}

interface TransactionGroupedListProps {
  transactions: Transaction[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  className?: string;
  renderTransactionItem?: (transaction: Transaction) => React.ReactNode;
}

export function TransactionGroupedList({
  transactions,
  onEdit,
  onDelete,
  className,
  renderTransactionItem
}: TransactionGroupedListProps) {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // 按日期分组交易
  const groupedTransactions = useMemo(() => {
    const groups = new Map<string, TransactionGroup>();

    transactions.forEach(transaction => {
      const date = transaction.date;
      if (!groups.has(date)) {
        groups.set(date, {
          date,
          total: 0,
          count: 0,
          transactions: []
        });
      }

      const group = groups.get(date)!;
      group.total += Number(transaction.amount || 0);
      group.count += 1;
      group.transactions.push(transaction);
    });

    // 转换为数组并按日期排序
    return Array.from(groups.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);

  // 计算统计信息
  const stats = useMemo(() => {
    const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalCount = transactions.length;
    const avgAmount = totalCount > 0 ? totalAmount / totalCount : 0;

    // 计算分类统计
    const categoryStats = new Map<string, number>();
    transactions.forEach(t => {
      categoryStats.set(t.category, (categoryStats.get(t.category) || 0) + Number(t.amount || 0));
    });

    const topCategories = Array.from(categoryStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      totalAmount,
      totalCount,
      avgAmount,
      topCategories
    };
  }, [transactions]);

  const toggleDateExpansion = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  const expandAll = () => {
    setExpandedDates(new Set(groupedTransactions.map(g => g.date)));
  };

  const collapseAll = () => {
    setExpandedDates(new Set());
  };

  const isToday = (date: string) => {
    return isSameDay(new Date(date), new Date());
  };

  const isYesterday = (date: string) => {
    return isSameDay(new Date(date), subDays(new Date(), 1));
  };

  const getRelativeLabel = (date: string) => {
    if (isToday(date)) return '今天';
    if (isYesterday(date)) return '昨天';
    return '';
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* 统计概览卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">账单概览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">¥{stats.totalAmount.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">总支出</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.totalCount}</div>
              <div className="text-sm text-muted-foreground">笔数</div>
            </div>
            <div>
              <div className="text-2xl font-bold">¥{stats.avgAmount.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">平均</div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="text-lg font-semibold mb-2">主要支出分类</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {stats.topCategories.map(([category, amount]) => {
                const categoryMeta = PRESET_CATEGORIES.find((c) => c.key === category);
                const categoryLabel = categoryMeta?.label || category;
                return (
                  <div key={category} className="flex justify-between items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                    <span className="truncate flex-1 text-sm font-medium text-gray-700">{categoryLabel}</span>
                    <span className="font-semibold text-sm text-red-600">¥{amount.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            展开全部
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            收起全部
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          共 {groupedTransactions.length} 天
        </div>
      </div>

      {/* 分组列表 */}
      <div className="space-y-2">
        {groupedTransactions.map((group) => {
          const isExpanded = expandedDates.has(group.date);
          const relativeLabel = getRelativeLabel(group.date);

          return (
            <Card key={group.date} className="overflow-hidden">
              <CardHeader
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleDateExpansion(group.date)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "transition-transform duration-200",
                      isExpanded && "rotate-90"
                    )}>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{group.date}</span>
                        {relativeLabel && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                            {relativeLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">¥{group.total.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">{group.count}笔</div>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {group.transactions.map((transaction: Transaction) => (
                      <div
                        key={transaction.id}
                        className="hover:bg-muted/50 rounded-lg transition-colors"
                      >
                        {renderTransactionItem ? (
                          renderTransactionItem(transaction)
                        ) : (
                          <div className="flex items-center justify-between p-3 border-l-2 border-l-blue-200">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <CategoryChip category={transaction.category} />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{transaction.note || '无备注'}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">
                                ¥{formatCurrency(Number(transaction.amount || 0), transaction.currency || 'CNY')}
                              </div>
                              <div className="flex gap-1 mt-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onEdit?.(transaction)}
                                >
                                  编辑
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => onDelete?.(transaction)}
                                >
                                  删除
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* 加载更多 */}
      {/* 这里可以添加加载更多的逻辑 */}
    </div>
  );
}