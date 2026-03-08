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
    <div className="space-y-4">
      {showPanel && (
        <Card className="sticky top-6 overflow-hidden border-slate-200 shadow-sm dark:border-slate-800">
          <CardHeader className="border-b border-slate-100 bg-slate-50/80 pb-4 dark:border-slate-800 dark:bg-slate-900/70">
            <CardTitle className="text-lg">智能建议面板</CardTitle>
            <p className="text-xs text-muted-foreground">常用分类、商户、金额和最近记录集中在这里</p>
          </CardHeader>
          <CardContent className="space-y-5 p-5 text-sm">
            {/* 常用分类 */}
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">常用分类</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {commonCategories.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onSelectCategory(item.key)}
                    className={`rounded-xl border px-3 py-2 text-xs text-left transition ${
                      selectedCategory === item.key
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : 'border-border bg-white hover:border-blue-400 dark:bg-slate-950'
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
              <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">常用商户</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {commonMerchants.length === 0 ? (
                  <span className="text-xs text-muted-foreground">暂无</span>
                ) : (
                  commonMerchants.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => onSelectMerchant(item)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        selectedMerchant === item
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : 'border-border bg-white hover:border-blue-400 dark:bg-slate-950'
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
              <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">高频金额</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {quickAmounts.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onSelectAmount(item)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      Math.abs(currentAmount - item) < 0.001
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : 'border-border bg-white hover:border-blue-400 dark:bg-slate-950'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* 最近记录 */}
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">最近记录</div>
              <div className="mt-3 space-y-2">
                {recentTransactions.length === 0 ? (
                  <span className="text-xs text-muted-foreground">暂无</span>
                ) : (
                  recentTransactions.map((tx) => (
                    <button
                      key={tx.id}
                      type="button"
                      onClick={() => onApplyTransaction(tx)}
                      className="w-full rounded-xl border border-border bg-white px-3 py-3 text-left text-xs transition hover:border-blue-400 dark:bg-slate-950"
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
      <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 dark:border-blue-900 dark:bg-blue-950/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">智能建议</span>
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
        <p className="mt-2 text-xs leading-5 text-blue-600 dark:text-blue-400">
          这块更适合辅助输入，不强行打断主表单。用它来快速补分类、商户和金额就够了。
        </p>
      </div>
    </div>
  );
}
