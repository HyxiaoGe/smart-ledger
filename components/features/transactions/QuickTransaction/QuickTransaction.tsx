'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { formatDateToLocal } from '@/lib/utils/date';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProgressToast } from '@/components/shared/ProgressToast';
import { generateTimeContext } from '@/lib/domain/noteContext';
import { Zap, Clock, TrendingUp, CheckCircle } from 'lucide-react';
import { useQuickSuggestions, useCreateTransaction } from '@/lib/api/hooks';
import type { QuickTransactionSuggestion } from '@/lib/api/services/ai';

interface QuickTransactionProps {
  onSuccess?: () => void;
  className?: string;
}

export function QuickTransaction({ onSuccess, className = '' }: QuickTransactionProps) {
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [lastSuccessTransaction, setLastSuccessTransaction] = useState<QuickTransactionSuggestion | null>(null);

  // 获取当前时间上下文
  const timeContext = useMemo(() => generateTimeContext(), []);

  // 使用 React Query 获取快速建议
  const {
    data: suggestionsData,
    isLoading,
    refetch: refetchSuggestions,
  } = useQuickSuggestions(timeContext.label);

  const suggestions = suggestionsData?.suggestions || [];

  // 使用 React Query 创建交易
  const createTransaction = useCreateTransaction();

  // 一键快速记账
  const handleQuickTransaction = useCallback(async (suggestion: QuickTransactionSuggestion) => {
    setSubmittingId(suggestion.id);

    try {
      const date = formatDateToLocal(new Date());

      await createTransaction.mutateAsync({
        type: 'expense',
        category: suggestion.category,
        amount: suggestion.amount,
        note: suggestion.note,
        date,
        currency: 'CNY',
      });

      // 显示成功提示
      setLastSuccessTransaction(suggestion);
      setShowToast(true);

      // 调用成功回调
      onSuccess?.();

      // 刷新建议
      setTimeout(() => {
        refetchSuggestions();
      }, 1000);

    } catch (error: unknown) {
      console.error('快速记账失败:', error);
      // 错误已由 React Query 处理
    } finally {
      setSubmittingId(null);
    }
  }, [createTransaction, onSuccess, refetchSuggestions]);

  // 获取置信度颜色
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-700 border-green-200';
    if (confidence >= 0.6) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (confidence >= 0.4) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-gray-100 text-gray-700 border-gray-200 dark:border-gray-700';
  };

  // 获取类别图标
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      food: '🍱',
      drink: '☕',
      transport: '🚇',
      daily: '🛒',
      subscription: '📱',
      entertainment: '🎮',
      medical: '💊',
      education: '📚'
    };
    return icons[category] || '💰';
  };

  const loading = isLoading || createTransaction.isPending;

  return (
    <>
      {showToast && lastSuccessTransaction && (
        <ProgressToast
          message={`${lastSuccessTransaction.title} (¥${lastSuccessTransaction.amount}) 记账成功！`}
          duration={2000}
          onClose={() => setShowToast(false)}
        />
      )}

      <Card className={`w-full ${className}`}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-orange-500" />
            一键快速记账
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            基于当前时间的智能记账建议，点击即可快速记录
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* 加载状态 */}
          {isLoading && suggestions.length === 0 && (
            <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
              <div className="text-sm">AI正在生成快速记账建议...</div>
            </div>
          )}

          {/* 快速记账建议列表 */}
          {!isLoading && suggestions.length > 0 && (
            <div className="grid gap-3">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="group relative rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-orange-300 hover:bg-orange-50 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    {/* 左侧内容 */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="text-2xl flex-shrink-0">
                        {suggestion.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-medium text-gray-900 group-hover:text-orange-700">
                            {suggestion.title}
                          </div>
                          <div className="text-xl">
                            {getCategoryIcon(suggestion.category)}
                          </div>
                        </div>

                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate mb-2">
                          {suggestion.description}
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getConfidenceColor(suggestion.confidence)}`}
                          >
                            {Math.round(suggestion.confidence * 100)}% 置信度
                          </Badge>
                          <span className="text-xs text-gray-400 dark:text-gray-400">
                            {suggestion.reason}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 右侧金额和按钮 */}
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className="text-lg font-bold text-gray-900 mb-2">
                        ¥{suggestion.amount}
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleQuickTransaction(suggestion)}
                        disabled={submittingId === suggestion.id || createTransaction.isPending}
                        className="min-w-[80px] bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        {submittingId === suggestion.id ? (
                          <>
                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                            记录中
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            快速记账
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* 成功指示器 */}
                  {lastSuccessTransaction?.id === suggestion.id && showToast && (
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 空状态 */}
          {!isLoading && suggestions.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <div className="text-sm">暂无快速记账建议</div>
              <div className="text-xs text-gray-400 dark:text-gray-400 mt-1">
                请稍后再试或手动添加账单
              </div>
            </div>
          )}

          {/* 刷新按钮 */}
          {!loading && (
            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchSuggestions()}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700"
              >
                刷新建议
              </Button>
            </div>
          )}

          {/* 统计信息 */}
          {suggestions.length > 0 && (
            <div className="flex items-center justify-center pt-2 border-t border-gray-100">
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>平均置信度: {Math.round(suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length * 100)}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>基于当前时间: {timeContext.label}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
