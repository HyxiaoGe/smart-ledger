'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Clock, RefreshCw, X } from 'lucide-react';
import { generateTimeContext } from '@/lib/domain/noteContext';
import { useQuickSuggestions } from '@/lib/api/hooks';
import type { QuickTransactionSuggestion } from '@/lib/api/services/ai';
import { useRouter } from 'next/navigation';
import { useQuickSuggestionSubmission } from './useQuickSuggestionSubmission';
import {
  QuickSuggestionEmptyState,
  QuickSuggestionList,
  QuickSuggestionLoadingState,
  QuickModalShell,
  QuickSuggestionSection,
  QuickSuccessToast,
} from './components';

interface QuickTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (transaction: QuickTransactionSuggestion) => void;
}

export function QuickTransactionDialog({ open, onOpenChange, onSuccess }: QuickTransactionDialogProps) {
  const router = useRouter();
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
    hideSuccessToast,
    showToast,
    submitSuggestion,
    submittingId,
    toastMessage,
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

  if (!open) return null;

  return (
    <QuickModalShell
      open={open}
      onClose={() => onOpenChange(false)}
      panelClassName="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden mx-4"
    >
      <QuickSuccessToast
        open={showToast && Boolean(lastSuccessSuggestion)}
        message={toastMessage}
        onClose={hideSuccessToast}
      />
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
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-700">
              当前时间: {timeContext.label}
            </span>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {loading && suggestions.length === 0 && (
            <QuickSuggestionLoadingState message="AI正在分析您的消费模式..." />
          )}

          {!loading && suggestions.length > 0 && (
            <QuickSuggestionSection title="基于当前时间的智能建议">
              <QuickSuggestionList
                suggestions={suggestions}
                submittingId={submittingId}
                isPending={createTransaction.isPending}
                onSubmit={submitSuggestion}
              />
            </QuickSuggestionSection>
          )}

          {!loading && suggestions.length === 0 && !error && (
            <QuickSuggestionEmptyState
              title="暂无快速记账建议"
              description="请稍后再试或使用详细记账功能"
            />
          )}

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
                onClick={() => {
                  onOpenChange(false);
                  router.push('/add');
                }}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-800"
              >
                详细记账
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                关闭
              </Button>
            </div>
          </div>

          <div className="text-xs text-gray-400 dark:text-gray-400 pt-2 border-t border-gray-100">
            快速记账适用于日常高频消费，基于您的个人历史数据进行智能预测。
          </div>
        </CardContent>
      </Card>
    </QuickModalShell>
  );
}
