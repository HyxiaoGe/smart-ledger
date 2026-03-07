'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Clock, CheckCircle, RefreshCw, X } from 'lucide-react';
import { ProgressToast } from '@/components/shared/ProgressToast';
import { generateTimeContext } from '@/lib/domain/noteContext';
import { useQuickSuggestions } from '@/lib/api/hooks';
import type { QuickTransactionSuggestion } from '@/lib/api/services/ai';
import { useQuickSuggestionSubmission } from './useQuickSuggestionSubmission';

interface QuickTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (transaction: QuickTransactionSuggestion) => void;
}

export function QuickTransactionDialog({ open, onOpenChange, onSuccess }: QuickTransactionDialogProps) {
  const timeContext = useMemo(() => generateTimeContext(), []);

  const {
    data: suggestionsData,
    isLoading: loading,
    error: queryError,
    refetch: fetchSuggestions
  } = useQuickSuggestions(timeContext.label, open);

  const suggestions = suggestionsData?.suggestions || [];
  const {
    createTransaction,
    lastSuccessSuggestion,
    setShowToast,
    showToast,
    submitSuggestion,
    submittingId,
  } = useQuickSuggestionSubmission({
    onSuccess,
    afterSuccess: () => {
      onOpenChange(false);
    },
    refreshSuggestions: fetchSuggestions,
    refreshDelayMs: 1500,
  });

  // 错误信息
  const error = queryError
    ? (queryError instanceof Error ? queryError.message : '获取建议失败')
    : createTransaction.error
    ? '记账失败，请重试'
    : '';

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {showToast && lastSuccessSuggestion && (
        <ProgressToast
          message={`${lastSuccessSuggestion.title} (¥${lastSuccessSuggestion.amount}) 记账成功！`}
          duration={2000}
          onClose={() => setShowToast(false)}
        />
      )}

      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />

      {/* 对话框内容 */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden mx-4">
        <Card className="border-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Zap className="h-5 w-5 text-orange-500" />
              AI快速记账
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* 时间上下文 */}
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700">
                当前时间: {timeContext.label}
              </span>
            </div>

            {/* 错误状态 */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {/* 加载状态 */}
            {loading && suggestions.length === 0 && (
              <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                <div className="text-sm">AI正在分析您的消费模式...</div>
              </div>
            )}

            {/* 快速记账建议 */}
            {!loading && suggestions.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-700">
                  基于当前时间的智能建议
                </div>

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
                            onClick={() => submitSuggestion(suggestion)}
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
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 空状态 */}
            {!loading && suggestions.length === 0 && !error && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <div className="text-sm">暂无快速记账建议</div>
                <div className="text-xs text-gray-400 dark:text-gray-400 mt-1">
                  请稍后再试或使用详细记账功能
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchSuggestions()}
                disabled={loading || createTransaction.isPending}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${(loading || createTransaction.isPending) ? 'animate-spin' : ''}`} />
                刷新建议
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open('/add', '_blank')}
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-800"
                >
                  详细记账
                </Button>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  关闭
                </Button>
              </div>
            </div>

            {/* 提示信息 */}
            <div className="text-xs text-gray-400 dark:text-gray-400 pt-2 border-t border-gray-100">
              快速记账适用于日常高频消费，基于您的个人历史数据进行智能预测。
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
