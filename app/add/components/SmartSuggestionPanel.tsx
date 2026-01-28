'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatAmount } from '@/lib/utils/format';
import type { Transaction } from '@/types/domain/transaction';
import type { Category } from '@/lib/services/categoryService';

interface SmartSuggestionPanelProps {
  // 显示/隐藏状态
  showPanel: boolean;
  onTogglePanel: () => void;
  // 分类相关
  commonCategories: Category[];
  selectedCategory: string;
  onSelectCategory: (_key: string) => void;
  // 商户相关
  commonMerchants: string[];
  selectedMerchant: string;
  onSelectMerchant: (_merchant: string) => void;
  // 金额相关
  quickAmounts: number[];
  currentAmount: number;
  onSelectAmount: (_amount: number) => void;
  // 最近记录
  recentTransactions: Transaction[];
  onApplyTransaction: (_tx: Transaction) => void;
}

export function SmartSuggestionPanel({
  showPanel,
  onTogglePanel,
  commonCategories,
  selectedCategory,
  onSelectCategory,
  commonMerchants,
  selectedMerchant,
  onSelectMerchant,
  quickAmounts,
  currentAmount,
  onSelectAmount,
  recentTransactions,
  onApplyTransaction
}: SmartSuggestionPanelProps) {
  return (
    <div className="lg:col-span-1">
      {showPanel && (
        <Card className="sticky top-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">智能建议</CardTitle>
            <p className="text-xs text-muted-foreground">基于最近 30 天的记录</p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {/* 常用分类 */}
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">常用分类</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {commonCategories.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onSelectCategory(item.key)}
                    className={`rounded-md border px-2 py-1 text-xs text-left transition ${
                      selectedCategory === item.key
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : 'border-border hover:border-blue-400'
                    }`}
                  >
                    {item.icon ? `${item.icon} ` : ''}
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 常用商户 */}
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">常用商户</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {commonMerchants.length === 0 ? (
                  <span className="text-xs text-muted-foreground">暂无</span>
                ) : (
                  commonMerchants.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => onSelectMerchant(item)}
                      className={`rounded-full border px-2 py-1 text-xs transition ${
                        selectedMerchant === item
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : 'border-border hover:border-blue-400'
                      }`}
                    >
                      {item}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* 高频金额 */}
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">高频金额</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {quickAmounts.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onSelectAmount(item)}
                    className={`rounded-full border px-2 py-1 text-xs transition ${
                      Math.abs(currentAmount - item) < 0.001
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : 'border-border hover:border-blue-400'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* 最近记录 */}
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">最近记录</div>
              <div className="mt-2 space-y-2">
                {recentTransactions.length === 0 ? (
                  <span className="text-xs text-muted-foreground">暂无</span>
                ) : (
                  recentTransactions.map((tx) => (
                    <button
                      key={tx.id}
                      type="button"
                      onClick={() => onApplyTransaction(tx)}
                      className="w-full rounded-md border border-border px-2 py-2 text-left text-xs transition hover:border-blue-400"
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{tx.note || tx.merchant || '未填写备注'}</span>
                        <span className="font-semibold">
                          {formatAmount(Number(tx.amount || 0))}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 智能建议开关 */}
      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
            <span className="text-sm text-blue-700 dark:text-blue-400">智能建议</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onTogglePanel}
            className="h-6 px-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {showPanel ? '隐藏' : '显示'}
          </Button>
        </div>
        <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
          基于最近记录的常用分类、商户与金额建议
        </p>
      </div>
    </div>
  );
}
