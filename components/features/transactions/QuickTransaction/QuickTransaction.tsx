'use client';

import React, { useState, useCallback } from 'react';
import { supabase } from '@/lib/clients/supabase/client';
import { Button } from '@/components/ui/button';
import { formatDateToLocal } from '@/lib/utils/date';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProgressToast } from '@/components/shared/ProgressToast';
import { dataSync, markTransactionsDirty } from '@/lib/core/dataSync';
import { generateTimeContext } from '@/lib/domain/noteContext';
import { aiPredictionService, type QuickTransactionSuggestion } from '@/lib/services/aiPrediction';
import { Zap, Clock, TrendingUp, CheckCircle } from 'lucide-react';

interface QuickTransactionProps {
  onSuccess?: () => void;
  className?: string;
}

export function QuickTransaction({ onSuccess, className = '' }: QuickTransactionProps) {
  const [suggestions, setSuggestions] = useState<QuickTransactionSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [lastSuccessTransaction, setLastSuccessTransaction] = useState<QuickTransactionSuggestion | null>(null);

  // 获取快速记账建议
  const fetchQuickSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const timeContext = generateTimeContext();
      const quickSuggestions = await aiPredictionService.generateQuickSuggestions(timeContext.label);
      setSuggestions(quickSuggestions);
    } catch (error) {
      console.error('获取快速记账建议失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 组件加载时获取建议
  React.useEffect(() => {
    fetchQuickSuggestions();
  }, [fetchQuickSuggestions]);

  // 一键快速记账
  const handleQuickTransaction = useCallback(async (suggestion: QuickTransactionSuggestion) => {
    setSubmittingId(suggestion.id);
    setLoading(true);

    try {
      const type = 'expense';
      const date = formatDateToLocal(new Date());

      // 检查是否存在相同业务记录
      const { data: existingRecord, error: queryError } = await supabase
        .from('transactions')
        .select('*')
        .eq('type', type)
        .eq('category', suggestion.category)
        .eq('date', date)
        .eq('currency', 'CNY')
        .eq('note', suggestion.note)
        .single();

      let transactionError;

      if (existingRecord) {
        if (existingRecord.deleted_at) {
          // 记录已删除，替换为新金额
          const { error: updateError } = await supabase
            .from('transactions')
            .update({
              amount: suggestion.amount,
              deleted_at: null
            })
            .eq('id', existingRecord.id);
          transactionError = updateError;
        } else {
          // 记录未删除，累加金额
          const { error: updateError } = await supabase
            .from('transactions')
            .update({
              amount: existingRecord.amount + suggestion.amount
            })
            .eq('id', existingRecord.id);
          transactionError = updateError;
        }
      } else {
        // 插入新记录
        const { error: insertError } = await supabase
          .from('transactions')
          .insert([{
            type,
            category: suggestion.category,
            amount: suggestion.amount,
            note: suggestion.note,
            date,
            currency: 'CNY'
          }]);

        transactionError = insertError;
      }

      if (queryError && queryError.code !== 'PGRST116') {
        throw queryError;
      }

      if (transactionError) {
        throw transactionError;
      }

      // 更新常用备注
      await updateCommonNote(suggestion.note, suggestion.amount, suggestion.category);

      // 触发同步事件
      dataSync.notifyTransactionAdded({
        type,
        category: suggestion.category,
        amount: suggestion.amount,
        note: suggestion.note,
        date: new Date().toISOString(),
        currency: 'CNY'
      });
      markTransactionsDirty();

      // 清除缓存
      localStorage.removeItem('common-notes-cache');

      // 显示成功提示
      setLastSuccessTransaction(suggestion);
      setShowToast(true);

      // 调用成功回调
      onSuccess?.();

      // 刷新建议
      setTimeout(() => {
        fetchQuickSuggestions();
      }, 1000);

    } catch (error: any) {
      console.error('快速记账失败:', error);
      // 这里可以显示错误提示
    } finally {
      setSubmittingId(null);
      setLoading(false);
    }
  }, [onSuccess, fetchQuickSuggestions]);

  // 更新常用备注
  const updateCommonNote = async (noteContent: string, amount: number, category: string) => {
    try {
      const timeContext = generateTimeContext();

      const response = await fetch('/api/common-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: noteContent,
          amount: amount,
          category: category,
          time_context: timeContext.label
        })
      });

      if (!response.ok) {
        console.error('更新常用备注失败');
      }
    } catch (error) {
      console.error('更新常用备注失败:', error);
    }
  };

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
          {loading && suggestions.length === 0 && (
            <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
              <div className="text-sm">AI正在生成快速记账建议...</div>
            </div>
          )}

          {/* 快速记账建议列表 */}
          {!loading && suggestions.length > 0 && (
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
                        disabled={submittingId === suggestion.id}
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
          {!loading && suggestions.length === 0 && (
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
                onClick={fetchQuickSuggestions}
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
                  <span>基于当前时间: {generateTimeContext().label}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}