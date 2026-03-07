'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generateTimeContext } from '@/lib/domain/noteContext';
import { Zap, Clock, TrendingUp } from 'lucide-react';
import { useQuickSuggestions } from '@/lib/api/hooks';
import { useQuickSuggestionSubmission } from './useQuickSuggestionSubmission';
import {
  QuickSuggestionEmptyState,
  QuickSuggestionList,
  QuickSuggestionLoadingState,
  QuickSuccessToast,
} from './components';

interface QuickTransactionProps {
  onSuccess?: () => void;
  className?: string;
}

export function QuickTransaction({ onSuccess, className = '' }: QuickTransactionProps) {
  // 获取当前时间上下文
  const timeContext = useMemo(() => generateTimeContext(), []);

  // 使用 React Query 获取快速建议
  const {
    data: suggestionsData,
    isLoading,
    refetch: refetchSuggestions,
  } = useQuickSuggestions(timeContext.label);

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
    onSuccess: () => {
      onSuccess?.();
    },
    refreshSuggestions: refetchSuggestions,
  });

  const loading = isLoading || createTransaction.isPending;

  return (
    <>
      <QuickSuccessToast
        open={showToast && Boolean(lastSuccessSuggestion)}
        message={toastMessage}
        onClose={hideSuccessToast}
      />

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
            <QuickSuggestionLoadingState message="AI正在生成快速记账建议..." />
          )}

          {/* 快速记账建议列表 */}
          {!isLoading && suggestions.length > 0 && (
            <QuickSuggestionList
              suggestions={suggestions}
              submittingId={submittingId}
              isPending={createTransaction.isPending}
              lastSuccessSuggestionId={showToast ? lastSuccessSuggestion?.id : undefined}
              showSuccessIndicator
              onSubmit={submitSuggestion}
            />
          )}

          {/* 空状态 */}
          {!isLoading && suggestions.length === 0 && (
            <QuickSuggestionEmptyState
              title="暂无快速记账建议"
              description="请稍后再试或手动添加账单"
            />
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
