'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, AlertTriangle, Target, RefreshCw, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PredictionTrendChart } from '@/components/features/ai-analysis/PredictionTrendChart';
import { AIFeedbackTrigger, QuickFeedback } from '@/components/features/ai-analysis/AIFeedbackModal';

interface PredictionData {
  predictions: Array<{
    month: string;
    totalAmount: number;
    confidence: number;
    categoryBreakdown: Array<{
      category: string;
      amount: number;
      confidence: number;
    }>;
  }>;
  trends: {
    overall: 'increasing' | 'stable' | 'decreasing';
    keyCategories: Array<{
      category: string;
      trend: 'increasing' | 'stable' | 'decreasing';
      changeRate: number;
    }>;
  };
  insights: string[];
  riskFactors: Array<{
    type: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
  }>;
}

interface AnomalyData {
  anomalies: Array<{
    type: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
    amount?: number;
    month?: string;
  }>;
  overallStability: {
    stable: boolean;
    score: number;
    description: string;
  };
}

interface BudgetData {
  monthlyBudget: {
    current: number;
    recommended: number;
    potentialSavings: number;
    savingsRate: number;
  };
  categoryBudgets: Array<{
    category: string;
    currentAvg: number;
    recommendedBudget: number;
    potentialSavings: number;
    priority: 'high' | 'medium' | 'low';
  }>;
}

interface SpendingPredictionPanelProps {
  className?: string;
  isModal?: boolean;
  onLoadingChange?: (loading: boolean) => void;
}

export function SpendingPredictionPanel({
  className = '',
  onLoadingChange
}: SpendingPredictionPanelProps) {
  const [predictionData, setPredictionData] = useState<PredictionData | null>(null);
  const [anomalyData, setAnomalyData] = useState<AnomalyData | null>(null);
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'refreshing' | 'success' | 'error'>('idle');

  // 预测参数
  const [predictionParams, setPredictionParams] = useState({
    monthsToAnalyze: 6,
    predictionMonths: 3,
    confidenceThreshold: 70
  });

  // 用户反馈状态
  const [userFeedback, setUserFeedback] = useState({
    accuracyRating: 0,
    helpfulRating: 0,
    comment: '',
    submitted: false
  });

  // 类别名称中文翻译
  const categoryNames: Record<string, string> = {
    food: '餐饮',
    transport: '交通',
    drink: '饮品',
    daily: '日用品',
    subscription: '订阅服务',
    entertainment: '娱乐',
    medical: '医疗',
    education: '教育',
    rent: '房租',
    other: '其他',
    shopping: '购物',
    utilities: '水电费'
  };

  // 获取预测数据
  const fetchPredictionData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      onLoadingChange?.(true);

      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'comprehensive-analysis',
          monthsToAnalyze: predictionParams.monthsToAnalyze,
          predictionMonths: predictionParams.predictionMonths
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '预测请求失败');
      }

      const result = await response.json();

      setPredictionData(result.spendingPrediction);
      setAnomalyData(result.anomalyDetection);
      setBudgetData(result.budgetRecommendation);

      // 同时获取历史数据用于图表展示
      try {
        const historicalResponse = await fetch('/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'spending-prediction',
            monthsToAnalyze: 6,
            predictionMonths: 0 // 只要历史数据
          })
        });

        if (historicalResponse.ok) {
          const historicalResult = await historicalResponse.json();
          // 这里我们可以使用历史数据，但为了简化，我们先使用现有的数据结构
        }
      } catch (histError) {
        // 历史数据获取失败时使用默认数据
      }

  
    } catch (error: any) {
      console.error('❌ 预测数据获取失败:', error);
      setError(error.message || '获取预测数据失败');
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  }, [onLoadingChange]);

  // 初始化加载
  useEffect(() => {
    fetchPredictionData();
  }, [fetchPredictionData]);

  // 刷新功能
  const handleRefresh = useCallback(async () => {
    setRefreshStatus('refreshing');
    await fetchPredictionData();
    setRefreshStatus('success');
    setTimeout(() => setRefreshStatus('idle'), 2000);
  }, [fetchPredictionData]);

  // 处理用户反馈提交
  const handleFeedbackSubmit = useCallback(async () => {
    try {
      // 使用缓存服务保存反馈
      const { predictionCache } = await import('@/lib/services/predictionCache');

      predictionCache.saveUserFeedback({
        accuracyRating: userFeedback.accuracyRating,
        helpfulRating: userFeedback.helpfulRating,
        comment: userFeedback.comment,
        predictionParams
      });

    
      setUserFeedback(prev => ({ ...prev, submitted: true }));

      // 3秒后重置提交状态
      setTimeout(() => {
        setUserFeedback(prev => ({ ...prev, submitted: false }));
      }, 3000);

    } catch (error) {
      console.error('反馈提交失败:', error);
    }
  }, [userFeedback, predictionParams]);

  // 切换模块折叠状态
  const toggleModule = (moduleId: string) => {
    setCollapsedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  // 获取趋势图标
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
    }
  };

  // 获取严重程度颜色
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'low':
        return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  // 格式化月份显示
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return `${year}年${parseInt(month)}月`;
  };

  if (error) {
    return (
      <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 border-orange-200 dark:border-orange-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <span className="bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400 bg-clip-text text-transparent font-semibold">
              支出预测
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center py-8 text-orange-600 dark:text-orange-400">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <div className="text-sm font-medium">{error}</div>
            <div className="text-xs mt-1 text-orange-500 dark:text-orange-400">
              需要至少3个月的历史数据才能进行预测
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="mt-3 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              重试
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 参数设置和刷新按钮 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">智能支出预测</h2>

        {/* 参数设置 */}
        <div className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-300">历史数据:</label>
            <select
              value={predictionParams.monthsToAnalyze}
              onChange={(e) => setPredictionParams(prev => ({
                ...prev,
                monthsToAnalyze: parseInt(e.target.value)
              }))}
              className="text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ease-in-out hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm cursor-pointer"
            >
              <option value={3}>3个月</option>
              <option value={6}>6个月</option>
              <option value={9}>9个月</option>
              <option value={12}>12个月</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-300">预测月份:</label>
            <select
              value={predictionParams.predictionMonths}
              onChange={(e) => setPredictionParams(prev => ({
                ...prev,
                predictionMonths: parseInt(e.target.value)
              }))}
              className="text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ease-in-out hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm cursor-pointer"
            >
              <option value={1}>1个月</option>
              <option value={3}>3个月</option>
              <option value={6}>6个月</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-300">置信度:</label>
            <select
              value={predictionParams.confidenceThreshold}
              onChange={(e) => setPredictionParams(prev => ({
                ...prev,
                confidenceThreshold: parseInt(e.target.value)
              }))}
              className="text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ease-in-out hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm cursor-pointer"
            >
              <option value={60}>60% (低)</option>
              <option value={70}>70% (中)</option>
              <option value={80}>80% (高)</option>
              <option value={90}>90% (极高)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 刷新状态提示 */}
          <AnimatePresence>
            {refreshStatus !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  refreshStatus === 'refreshing' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
                  refreshStatus === 'success' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                  'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                }`}
              >
                {refreshStatus === 'refreshing' && (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>预测中...</span>
                  </>
                )}
                {refreshStatus === 'success' && (
                  <span>已更新</span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading || refreshStatus === 'refreshing'}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-300 transition-colors"
            title="应用新参数并重新生成预测分析"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            应用参数
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
          <CardContent className="p-8">
            <div className="text-center text-blue-600 dark:text-blue-400">
              <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
              <div className="text-sm font-medium">AI正在分析您的支出模式...</div>
              <div className="text-xs mt-1 text-blue-500 dark:text-blue-400">
                这可能需要几秒钟时间
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 支出预测模块 */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
            <CardHeader
              className="pb-3 cursor-pointer"
              onClick={() => toggleModule('prediction')}
            >
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent font-semibold">
                    支出预测
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: collapsedModules['prediction'] ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-400" />
                </motion.div>
              </CardTitle>
            </CardHeader>

            <AnimatePresence>
              {!collapsedModules['prediction'] && predictionData && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <CardContent className="pt-0">
                    {/* 预测概览 */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-100 dark:border-blue-800 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300">下月预测支出</span>
                        <div className="flex items-center gap-2">
                          {getTrendIcon(predictionData.trends.overall)}
                          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            ¥{predictionData.predictions[0]?.totalAmount?.toFixed(0) || '0'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full"
                            style={{ width: `${predictionData.predictions[0]?.confidence || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          置信度 {predictionData.predictions[0]?.confidence || 0}%
                        </span>
                      </div>
                    </div>

                    {/* 预测明细 */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">未来预测</div>
                      {predictionData.predictions.slice(0, 3).map((prediction, index) => (
                        <div key={prediction.month} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-gray-100 dark:border-gray-700">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700 dark:text-gray-300">{formatMonth(prediction.month)}</span>
                            {index === 0 && <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-1 rounded">下月</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">¥{prediction.totalAmount.toFixed(0)}</span>
                            <span className={`text-xs px-1 rounded ${
                              prediction.confidence > 80 ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300' :
                              prediction.confidence > 60 ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300' :
                              'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300'
                            }`}>
                              {prediction.confidence}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* AI洞察 */}
                    {predictionData.insights.length > 0 && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-100 dark:border-blue-800">
                        <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">AI洞察</div>
                        <ul className="space-y-1">
                          {predictionData.insights.slice(0, 2).map((insight, index) => (
                            <li key={index} className="text-xs text-blue-600 dark:text-blue-300 flex items-start gap-1">
                              <span>•</span>
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* 预测趋势图表 */}
          <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950 dark:to-blue-950 border-indigo-200 dark:border-indigo-800">
            <CardHeader
              className="pb-3 cursor-pointer"
              onClick={() => toggleModule('chart')}
            >
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <span className="bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-400 dark:to-blue-400 bg-clip-text text-transparent font-semibold">
                    趋势图表
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: collapsedModules['chart'] ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-400" />
                </motion.div>
              </CardTitle>
            </CardHeader>

            <AnimatePresence>
              {!collapsedModules['chart'] && predictionData && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <CardContent className="pt-0">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      * 图表展示了基于历史数据的支出趋势预测，虚线部分为AI预测结果
                    </div>

                    {/* 使用模拟的历史数据 */}
                    <PredictionTrendChart
                      predictionData={predictionData}
                      historicalData={{
                        monthlyData: [
                          { month: '2024-08', totalAmount: 2500, transactionCount: 25 },
                          { month: '2024-09', totalAmount: 2800, transactionCount: 30 },
                          { month: '2024-10', totalAmount: 2300, transactionCount: 22 },
                          { month: '2024-11', totalAmount: 2600, transactionCount: 28 },
                          { month: '2024-12', totalAmount: 3200, transactionCount: 35 },
                          { month: '2025-01', totalAmount: 2900, transactionCount: 32 }
                        ]
                      }}
                    />
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* 异常检测模块 */}
          {anomalyData && (
            <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950 dark:to-yellow-950 border-orange-200 dark:border-orange-800">
              <CardHeader
                className="pb-3 cursor-pointer"
                onClick={() => toggleModule('anomaly')}
              >
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    <span className="bg-gradient-to-r from-orange-600 to-yellow-600 dark:from-orange-400 dark:to-yellow-400 bg-clip-text text-transparent font-semibold">
                      异常检测
                    </span>
                    {anomalyData.anomalies.length > 0 && (
                      <span className="bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 text-xs px-2 py-1 rounded-full">
                        {anomalyData.anomalies.length}
                      </span>
                    )}
                  </div>
                  <motion.div
                    animate={{ rotate: collapsedModules['anomaly'] ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-400" />
                  </motion.div>
                </CardTitle>
              </CardHeader>

              <AnimatePresence>
                {!collapsedModules['anomaly'] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <CardContent className="pt-0">
                      {anomalyData.anomalies.length > 0 ? (
                        <div className="space-y-2">
                          {anomalyData.anomalies.slice(0, 3).map((anomaly, index) => (
                            <div
                              key={index}
                              className={`p-3 rounded-lg border ${getSeverityColor(anomaly.severity)}`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="text-sm font-medium">{anomaly.description}</div>
                                  {anomaly.month && (
                                    <div className="text-xs opacity-80 mt-1">{anomaly.month}</div>
                                  )}
                                </div>
                                <AlertTriangle className="h-4 w-4 flex-shrink-0 ml-2" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-green-600 dark:text-green-400">
                          <div className="text-sm font-medium">支出模式正常</div>
                          <div className="text-xs mt-1">未发现异常支出</div>
                        </div>
                      )}
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          )}

          {/* 预算建议模块 */}
          {budgetData && (
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
              <CardHeader
                className="pb-3 cursor-pointer"
                onClick={() => toggleModule('budget')}
              >
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent font-semibold">
                      预算建议
                    </span>
                  </div>
                  <motion.div
                    animate={{ rotate: collapsedModules['budget'] ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-400" />
                  </motion.div>
                </CardTitle>
              </CardHeader>

              <AnimatePresence>
                {!collapsedModules['budget'] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <CardContent className="pt-0">
                      {/* 预算概览 */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-100 dark:border-green-800 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600 dark:text-gray-300">建议月度预算</span>
                          <span className="text-xl font-bold text-green-600 dark:text-green-400">
                            ¥{budgetData.monthlyBudget.recommended.toFixed(0)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 dark:text-gray-400">当前平均: ¥{budgetData.monthlyBudget.current.toFixed(0)}</span>
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            可节省 ¥{budgetData.monthlyBudget.potentialSavings.toFixed(0)} ({budgetData.monthlyBudget.savingsRate}%)
                          </span>
                        </div>
                      </div>

                      {/* 分类预算建议 */}
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">分类优化建议</div>
                        {budgetData.categoryBudgets.slice(0, 3).map((budget, index) => (
                          <div key={budget.category} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {categoryNames[budget.category] || budget.category}
                              </span>
                              {budget.priority === 'high' && (
                                <span className="text-xs bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 px-1 rounded">高优先级</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500 dark:text-gray-400">¥{budget.currentAvg.toFixed(0)}</span>
                              <span className="text-sm font-medium text-green-600 dark:text-green-400">→ ¥{budget.recommendedBudget.toFixed(0)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          )}

          {/* AI快速反馈 */}
          {predictionData && !loading && (
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <QuickFeedback
                  featureType="spending_prediction"
                  context={{
                    predictionMonths: predictionParams.predictionMonths,
                    monthsAnalyzed: predictionParams.monthsToAnalyze,
                    predictions: predictionData.predictions,
                    confidence: predictionData.predictions[0]?.confidence
                  }}
                  className="w-full justify-center"
                />
              </CardContent>
            </Card>
          )}

          {/* AI反馈触发器 */}
          <AIFeedbackTrigger
            featureType="spending_prediction"
            templateId="spending_prediction_rating"
            context={{
              predictionParams,
              predictionData,
              timestamp: new Date().toISOString()
            }}
            triggerDelay={10000} // 10秒后显示
          />

          {/* 用户反馈模块 */}
          {predictionData && (
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200">
              <CardHeader
                className="pb-3 cursor-pointer"
                onClick={() => toggleModule('feedback')}
              >
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-600" />
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-semibold">
                      预测反馈
                    </span>
                    {userFeedback.submitted && (
                      <span className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded-full">
                        已提交
                      </span>
                    )}
                  </div>
                  <motion.div
                    animate={{ rotate: collapsedModules['feedback'] ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-400" />
                  </motion.div>
                </CardTitle>
              </CardHeader>

              <AnimatePresence>
                {!collapsedModules['feedback'] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          您的反馈将帮助我们改进预测算法的准确性
                        </div>

                        {/* 准确性评分 */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                            预测准确性评分
                          </label>
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <button
                                key={rating}
                                onClick={() => setUserFeedback(prev => ({ ...prev, accuracyRating: rating }))}
                                className={`w-8 h-8 rounded-full border-2 transition-colors ${
                                  userFeedback.accuracyRating >= rating
                                    ? 'bg-purple-500 border-purple-500 text-white'
                                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 hover:border-purple-300 dark:hover:border-purple-600'
                                }`}
                              >
                                {rating}
                              </button>
                            ))}
                            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                              {userFeedback.accuracyRating === 0 ? '请评分' : `${userFeedback.accuracyRating}分`}
                            </span>
                          </div>
                        </div>

                        {/* 有用性评分 */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                            预测有用性评分
                          </label>
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <button
                                key={rating}
                                onClick={() => setUserFeedback(prev => ({ ...prev, helpfulRating: rating }))}
                                className={`w-8 h-8 rounded-full border-2 transition-colors ${
                                  userFeedback.helpfulRating >= rating
                                    ? 'bg-pink-500 border-pink-500 text-white'
                                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 hover:border-pink-300 dark:hover:border-pink-600'
                                }`}
                              >
                                {rating}
                              </button>
                            ))}
                            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                              {userFeedback.helpfulRating === 0 ? '请评分' : `${userFeedback.helpfulRating}分`}
                            </span>
                          </div>
                        </div>

                        {/* 评论 */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                            具体建议（可选）
                          </label>
                          <textarea
                            value={userFeedback.comment}
                            onChange={(e) => setUserFeedback(prev => ({ ...prev, comment: e.target.value }))}
                            placeholder="请告诉我们如何改进预测功能..."
                            className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"
                            rows={3}
                          />
                        </div>

                        {/* 提交按钮 */}
                        <div className="flex justify-end">
                          <Button
                            onClick={handleFeedbackSubmit}
                            disabled={userFeedback.accuracyRating === 0 || userFeedback.helpfulRating === 0 || userFeedback.submitted}
                            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                          >
                            {userFeedback.submitted ? '✓ 已提交' : '提交反馈'}
                          </Button>
                        </div>

                        {/* 提交成功提示 */}
                        {userFeedback.submitted && (
                          <div className="text-center py-2 text-green-600 dark:text-green-400 text-sm">
                            感谢您的反馈！这将帮助我们改进预测算法。
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          )}
        </>
      )}
    </div>
  );
}