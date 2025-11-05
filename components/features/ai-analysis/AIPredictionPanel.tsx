'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingUp, Clock, Target, Zap } from 'lucide-react';
import { generateTimeContext } from '@/lib/domain/noteContext';
import {
  aiPredictionService,
  type TransactionPrediction,
  type QuickTransactionSuggestion
} from '@/lib/services/aiPrediction';

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
  const [predictions, setPredictions] = useState<TransactionPrediction[]>([]);
  const [quickSuggestions, setQuickSuggestions] = useState<QuickTransactionSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'predictions' | 'quick'>('quick');

  // 获取预测数据
  const fetchPredictions = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const timeContext = generateTimeContext();

      // 获取通用交易预测
      const transactionPredictions = await aiPredictionService.predictTransaction({
        timeContext: timeContext.label,
        includeRecent: true
      });

      // 根据当前状态获取特定预测
      let specificPredictions: TransactionPrediction[] = [];

      if (currentAmount && !currentCategory) {
        // 有金额无分类，预测分类
        specificPredictions = await aiPredictionService.predictCategory(
          currentAmount,
          timeContext.label
        );
      } else if (currentCategory && !currentAmount) {
        // 有分类无金额，预测金额
        specificPredictions = await aiPredictionService.predictAmount(
          currentCategory,
          timeContext.label
        );
      } else if (currentAmount && currentCategory) {
        // 两者都有，预测完整交易
        specificPredictions = await aiPredictionService.predictTransaction({
          timeContext: timeContext.label,
          includeRecent: true
        });
      }

      // 合并预测结果
      const allPredictions = [...transactionPredictions, ...specificPredictions]
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 6);

      setPredictions(allPredictions);

      // 获取快速建议
      const quickSuggestions = await aiPredictionService.generateQuickSuggestions(timeContext.label);
      setQuickSuggestions(quickSuggestions);

    } catch (err: any) {
      console.error('获取AI预测失败:', err);
      setError(err.message || 'AI预测加载失败');
    } finally {
      setIsLoading(false);
    }
  }, [currentAmount, currentCategory]);

  // 组件加载时获取预测
  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

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
    return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
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
            <span className="text-sm">{error}</span>
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
            <div className="text-sm text-gray-600 dark:text-gray-400">
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
                      <div className="font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100">
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
            <div className="text-sm text-gray-600 dark:text-gray-400">
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
                          <Badge variant="secondary" className="text-xs">
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
            <div className="text-xs text-gray-400 mt-1">
              请稍后再试或手动填写
            </div>
          </div>
        )}

        {!isLoading && !error && activeTab === 'predictions' && predictions.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Target className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <div className="text-sm">暂无AI预测数据</div>
            <div className="text-xs text-gray-400 mt-1">
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
              onClick={fetchPredictions}
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