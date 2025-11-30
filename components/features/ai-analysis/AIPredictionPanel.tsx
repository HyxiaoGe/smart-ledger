'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingUp, Clock, Target, Zap } from 'lucide-react';
import { generateTimeContext } from '@/lib/domain/noteContext';
import { useAIPrediction } from '@/lib/api/hooks';
import { aiApi } from '@/lib/api/services/ai';
import { useQuery } from '@tanstack/react-query';

// 类型定义
interface TransactionPrediction {
  id: string;
  type: 'category' | 'amount' | 'full';
  confidence: number;
  reason: string;
  predictedCategory?: string;
  predictedAmount?: number;
  suggestedNote?: string;
  metadata?: unknown;
}

interface QuickTransactionSuggestion {
  id: string;
  title: string;
  description: string;
  category: string;
  amount: number;
  note: string;
  confidence: number;
  icon?: string;
  reason: string;
}

type AIPredictionPanelProps = {
  onPredictionSelect?: (prediction: TransactionPrediction | QuickTransactionSuggestion) => void;
  currentAmount?: number;
  currentCategory?: string;
  className?: string;
};

export function AIPredictionPanel({
  onPredictionSelect,
  currentAmount,
  currentCategory,
  className = ''
}: AIPredictionPanelProps) {
  const [activeTab, setActiveTab] = useState<'predictions' | 'quick'>('quick');

  // 获取时间上下文
  const timeContext = useMemo(() => generateTimeContext(), []);

  // 获取快速建议
  const {
    data: quickSuggestionsData,
    isLoading: isLoadingQuick,
    error: quickError,
    refetch: refetchQuick
  } = useQuery({
    queryKey: ['ai', 'quick-suggestions', timeContext.label],
    queryFn: () => aiApi.predict({ type: 'quick-suggestions', timeContext: timeContext.label }),
  });

  // 获取交易预测
  const {
    data: predictionsData,
    isLoading: isLoadingPredictions,
    error: predictionsError,
    refetch: refetchPredictions
  } = useQuery({
    queryKey: ['ai', 'predictions', { currentAmount, currentCategory, timeContext: timeContext.label }],
    queryFn: async () => {
      const results: TransactionPrediction[] = [];

      // 获取通用交易预测
      const transactionPrediction = await aiApi.predict({
        type: 'full',
        timeContext: timeContext.label
      });
      if (transactionPrediction.category) {
        results.push({
          id: 'full-1',
          type: 'full',
          confidence: transactionPrediction.confidence || 0.7,
          reason: '基于您的消费习惯预测',
          predictedCategory: transactionPrediction.category,
          predictedAmount: transactionPrediction.amount
        });
      }

      // 根据当前状态获取特定预测
      if (currentAmount && !currentCategory) {
        const categoryPrediction = await aiApi.predict({
          type: 'category',
          amount: currentAmount,
          timeContext: timeContext.label
        });
        if (categoryPrediction.category) {
          results.push({
            id: 'category-1',
            type: 'category',
            confidence: categoryPrediction.confidence || 0.7,
            reason: `金额 ¥${currentAmount} 的常见分类`,
            predictedCategory: categoryPrediction.category
          });
        }
      } else if (currentCategory && !currentAmount) {
        const amountPrediction = await aiApi.predict({
          type: 'amount',
          note: currentCategory,
          timeContext: timeContext.label
        });
        if (amountPrediction.amount) {
          results.push({
            id: 'amount-1',
            type: 'amount',
            confidence: amountPrediction.confidence || 0.7,
            reason: `${currentCategory} 分类的常见金额`,
            predictedAmount: amountPrediction.amount
          });
        }
      }

      return results.sort((a, b) => b.confidence - a.confidence).slice(0, 6);
    },
    enabled: activeTab === 'predictions',
  });

  const quickSuggestions = (quickSuggestionsData?.suggestions || []) as QuickTransactionSuggestion[];
  const predictions = predictionsData || [];
  const isLoading = activeTab === 'quick' ? isLoadingQuick : isLoadingPredictions;
  const error = activeTab === 'quick' ? quickError : predictionsError;

  // 刷新数据
  const handleRefresh = useCallback(() => {
    if (activeTab === 'quick') {
      refetchQuick();
    } else {
      refetchPredictions();
    }
  }, [activeTab, refetchQuick, refetchPredictions]);

  // 处理预测选择
  const handlePredictionSelect = useCallback((prediction: TransactionPrediction) => {
    onPredictionSelect?.(prediction);
  }, [onPredictionSelect]);

  // 处理快速建议选择
  const handleQuickSuggestionSelect = useCallback((suggestion: QuickTransactionSuggestion) => {
    onPredictionSelect?.(suggestion);
  }, [onPredictionSelect]);

  // 获取预测图标
  const getPredictionIcon = (prediction: TransactionPrediction) => {
    switch (prediction.type) {
      case 'category':
        return <Target className="h-4 w-4" />;
      case 'amount':
        return <TrendingUp className="h-4 w-4" />;
      case 'full':
        return <Zap className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  // 获取预测类型标签
  const getPredictionTypeLabel = (prediction: TransactionPrediction) => {
    switch (prediction.type) {
      case 'category':
        return '分类预测';
      case 'amount':
        return '金额预测';
      case 'full':
        return '完整预测';
      default:
        return 'AI预测';
    }
  };

  // 获取置信度颜色
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (confidence >= 0.6) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (confidence >= 0.4) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:border-gray-700';
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-blue-600" />
          AI智能预测
        </CardTitle>

        {/* 标签切换 */}
        <div className="flex gap-2 mt-2">
          <Button
            variant={activeTab === 'quick' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('quick')}
          >
            快速记账
          </Button>
          <Button
            variant={activeTab === 'predictions' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('predictions')}
          >
            智能预测
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 错误状态 */}
        {error && (
          <div className="flex items-center gap-2 p-3 text-red-600 bg-red-50 rounded-lg border border-red-200">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error instanceof Error ? error.message : 'AI预测加载失败'}</span>
          </div>
        )}

        {/* 加载状态 */}
        {isLoading && (
          <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
            <div className="text-sm">AI正在分析您的消费模式...</div>
          </div>
        )}

        {/* 快速记账建议 */}
        {!isLoading && !error && activeTab === 'quick' && quickSuggestions.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <Clock className="h-4 w-4 inline mr-1" />
              基于当前时间的快速记账建议
            </div>

            <div className="grid gap-2">
              {quickSuggestions.map((suggestion) => (
                <Button
                  key={suggestion.id}
                  variant="outline"
                  className="h-auto p-3 justify-start text-left hover:bg-blue-50 dark:hover:bg-blue-950 hover:border-blue dark:hover:border-blue-200 transition-colors"
                  onClick={() => handleQuickSuggestionSelect(suggestion)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="text-2xl flex-shrink-0">
                      {suggestion.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {suggestion.title}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {suggestion.description}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        ¥{suggestion.amount}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs ${getConfidenceColor(suggestion.confidence)}`}
                      >
                        {Math.round(suggestion.confidence * 100)}%
                      </Badge>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* AI预测结果 */}
        {!isLoading && !error && activeTab === 'predictions' && predictions.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <Target className="h-4 w-4 inline mr-1" />
              基于您的历史数据智能预测
            </div>

            <div className="space-y-2">
              {predictions.map((prediction) => (
                <Button
                  key={prediction.id}
                  variant="outline"
                  className="h-auto p-3 justify-start text-left hover:bg-green-50 hover:border-green-200 transition-colors w-full"
                  onClick={() => handlePredictionSelect(prediction)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className={`p-1 rounded border ${getConfidenceColor(prediction.confidence)} flex-shrink-0`}>
                      {getPredictionIcon(prediction)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {getPredictionTypeLabel(prediction)}
                        </Badge>
                        {prediction.predictedCategory && (
                          <Badge variant="default" className="text-xs">
                            {prediction.predictedCategory}
                          </Badge>
                        )}
                      </div>

                      <div className="text-sm font-medium text-gray-900 mb-1">
                        {prediction.reason}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        {prediction.predictedAmount && (
                          <span>建议金额: ¥{prediction.predictedAmount}</span>
                        )}
                        {prediction.suggestedNote && (
                          <span>建议备注: {prediction.suggestedNote}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-xs ${getConfidenceColor(prediction.confidence)}`}
                      >
                        {Math.round(prediction.confidence * 100)}%
                      </Badge>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* 空状态 */}
        {!isLoading && !error && activeTab === 'quick' && quickSuggestions.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <div className="text-sm">暂无快速记账建议</div>
            <div className="text-xs text-gray-400 dark:text-gray-400 mt-1">
              请稍后再试或手动填写
            </div>
          </div>
        )}

        {!isLoading && !error && activeTab === 'predictions' && predictions.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Target className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <div className="text-sm">暂无AI预测数据</div>
            <div className="text-xs text-gray-400 dark:text-gray-400 mt-1">
              请先记录一些交易以获得更好的预测
            </div>
          </div>
        )}

        {/* 刷新按钮 */}
        {!isLoading && (
          <div className="flex justify-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              刷新预测
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
