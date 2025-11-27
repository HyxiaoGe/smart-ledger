'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Brain, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DeepInsightPanel } from '@/components/features/ai-analysis/DeepInsightPanel';
import { SpendingPredictionPanel } from '@/components/features/ai-analysis/SpendingPredictionPanel';
import { QuickFeedback } from '@/components/features/ai-analysis/AIFeedbackModal';
import { TrendAnalysis } from './AIAnalysisPanel/TrendAnalysis';
import { OptimizationAdvice } from './AIAnalysisPanel/OptimizationAdvice';
import {
  processTrendAnalysisData,
  processPersonalizedAdviceData,
  type TrendAnalysisData,
  type PersonalizedAdviceData
} from './AIAnalysisPanel/utils';
import { memoryCache } from '@/lib/infrastructure/cache';

interface AIAnalysisPanelProps {
  className?: string;
  dateRange?: string;
  categories?: string[];
  currentMonth?: string;
  aiData?: {
    currentMonthFull: any[];
    lastMonth: any[];
    currentMonthTop20: any[];
    currentMonthStr: string;
    lastMonthStr: string;
  };
  isModal?: boolean;
}

export function AIAnalysisPanel({
  className = '',
  dateRange = 'current-month',
  categories = [],
  currentMonth = '',
  aiData,
  isModal = false
}: AIAnalysisPanelProps) {
  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysisData | null>(null);
  const [advice, setAdvice] = useState<PersonalizedAdviceData | null>(null);
  const [currentExpense, setCurrentExpense] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});
  const [selectedSuggestion, setSelectedSuggestion] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'refreshing' | 'success' | 'error'>('idle');
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  // 处理数据
  const processData = useCallback(() => {
    if (!aiData) return;

    setLoading(true);

    try {
      // 处理趋势分析数据
      const trendData = processTrendAnalysisData(aiData);
      setTrendAnalysis(trendData);

      if (trendData) {
        setCurrentExpense(trendData.currentMonth);
      }

      // 处理个性化建议数据
      const adviceData = processPersonalizedAdviceData(aiData);
      setAdvice(adviceData);
    } catch (error) {
      console.error('数据处理失败:', error);
    } finally {
      setLoading(false);
    }
  }, [aiData]);

  // 初始化加载 - 先尝试从缓存加载 AI 分析结果
  useEffect(() => {
    if (aiData) {
      processData();

      // 尝试从缓存加载 AI 分析结果
      const loadCachedAnalysis = () => {
        const month = currentMonth || new Date().toISOString().slice(0, 7);
        const dataHash = JSON.stringify(aiData.currentMonthTop20).substring(0, 50);
        const cacheKey = `ai_analysis_${month}_${dataHash}`;

        const cached = memoryCache.get<string>(cacheKey);
        if (cached) {
          console.log('✅ 从缓存加载AI分析结果');
          setAiSummary(cached);
        } else {
          console.log('📭 缓存未命中，将在用户需要时调用AI分析');
        }
      };

      loadCachedAnalysis();
    }
  }, [aiData, processData, currentMonth]);

  // 调用真正的AI分析接口
  const callAIAnalysis = useCallback(async (transactions: any[]) => {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: currentMonth || new Date().toISOString().slice(0, 7),
          transactions: transactions
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🤖 AI分析结果:', result.summary);
        return result.summary;
      } else {
        console.error('AI分析请求失败:', response.status);
        return null;
      }
    } catch (error) {
      console.error('AI分析出错:', error);
      return null;
    }
  }, [currentMonth]);

  // 增强的刷新功能 - 重新获取数据并处理
  const handleRefresh = useCallback(async () => {
    setRefreshStatus('refreshing');
    setLoading(true);

    try {
      // 1. 清除数据缓存，强制重新获取
      const revalidateResponse = await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: 'transactions' }),
        cache: 'no-store'
      });

      if (revalidateResponse.ok) {
        console.log('✅ 缓存已清除');

        // 2. 调用真正的AI分析
        if (aiData?.currentMonthFull) {
          const aiSummaryResult = await callAIAnalysis(aiData.currentMonthFull);
          if (aiSummaryResult) {
            setAiSummary(aiSummaryResult);
            console.log('🤖 获得AI分析:', aiSummaryResult);

            // 3. 保存到缓存（30分钟有效期）
            const month = currentMonth || new Date().toISOString().slice(0, 7);
            const dataHash = JSON.stringify(aiData.currentMonthTop20).substring(0, 50);
            const cacheKey = `ai_analysis_${month}_${dataHash}`;
            memoryCache.set(cacheKey, aiSummaryResult, {
              ttl: 30 * 60 * 1000, // 30分钟
              tags: ['ai-cache']
            });
            console.log('💾 AI分析结果已缓存');
          }
        }

        // 4. 重新处理本地数据（作为补充）
        processData();

        setRefreshStatus('success');
        setTimeout(() => setRefreshStatus('idle'), 2000);
        console.log('✅ AI分析完成');
      } else {
        setRefreshStatus('error');
        setTimeout(() => setRefreshStatus('idle'), 3000);
        console.error('❌ 刷新失败');
      }
    } catch (error) {
      setRefreshStatus('error');
      setTimeout(() => setRefreshStatus('idle'), 3000);
      console.error('❌ 刷新出错:', error);
    } finally {
      setLoading(false);
    }
  }, [processData, aiData, callAIAnalysis]);

  // 切换模块折叠状态
  const toggleModule = (moduleId: string) => {
    setCollapsedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 刷新按钮 */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">智能财务分析</h2>
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
                    <span>刷新中...</span>
                  </>
                )}
                {refreshStatus === 'success' && (
                  <>
                    <CheckCircle className="h-3 w-3" />
                    <span>已更新</span>
                  </>
                )}
                {refreshStatus === 'error' && (
                  <>
                    <AlertCircle className="h-3 w-3" />
                    <span>失败</span>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading || refreshStatus === 'refreshing'}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
            title="清除缓存并重新分析数据"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            AI分析
          </Button>
        </div>
      </div>

      {/* 优化潜力总览 - 顶部醒目展示 */}
      {advice && (
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold mb-2">💎 您的财务优化潜力</h3>
              <p className="opacity-90">基于AI分析的可变支出优化建议</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">
                ¥{advice.suggestions.reduce((sum, s) => sum + s.potential, 0).toFixed(2)}
              </div>
              <div className="text-sm opacity-90">预计月节省</div>
            </div>
          </div>

          <div className={isModal ? "grid grid-cols-4 gap-6" : "grid grid-cols-4 gap-4"}>
            <div className="bg-white/20 rounded-lg p-4 text-center">
              <div className={isModal ? "text-2xl font-bold" : "text-xl font-bold"}>
                ¥{advice.suggestions.reduce((sum, s) => sum + s.potential, 0).toFixed(2)}
              </div>
              <div className={isModal ? "text-sm opacity-90" : "text-xs opacity-90"}>月度节省</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4 text-center">
              <div className={isModal ? "text-2xl font-bold" : "text-xl font-bold"}>
                {advice.suggestions.filter(s => s.priority === 'high').length}
              </div>
              <div className={isModal ? "text-sm opacity-90" : "text-xs opacity-90"}>高优先级</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4 text-center">
              <div className={isModal ? "text-2xl font-bold" : "text-xl font-bold"}>¥{advice.recommendedBudget.toFixed(2)}</div>
              <div className={isModal ? "text-sm opacity-90" : "text-xs opacity-90"}>建议预算</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4 text-center">
              <div className={isModal ? "text-2xl font-bold" : "text-xl font-bold"}>
                {currentExpense > 0 ? Math.round((advice.suggestions.reduce((sum, s) => sum + s.potential, 0) / currentExpense) * 100) : 0}%
              </div>
              <div className={isModal ? "text-sm opacity-90" : "text-xs opacity-90"}>优化率</div>
            </div>
          </div>

          <div className="bg-white/20 rounded-lg p-3 mt-4">
            <div className="flex items-center justify-between text-sm">
              <span>执行建议后：¥{currentExpense.toFixed(2)} → ¥{(advice.recommendedBudget - advice.suggestedSavings).toFixed(2)}</span>
              <span className="font-bold">立即开始优化</span>
            </div>
          </div>
        </div>
      )}

      {/* 主要内容区域 - 根据模式选择布局 */}
      <div className={isModal ? "space-y-6" : "grid grid-cols-1 lg:grid-cols-2 gap-6"}>
        {/* 趋势分析组件 */}
        <TrendAnalysis
          data={trendAnalysis}
          loading={loading}
          collapsed={collapsedModules['trend']}
          onToggle={() => toggleModule('trend')}
        />

        {/* 优化建议组件 */}
        <OptimizationAdvice
          data={advice}
          loading={loading}
          collapsed={collapsedModules['advice']}
          onToggle={() => toggleModule('advice')}
          onSuggestionClick={(suggestion) => {
            setSelectedSuggestion(suggestion);
            setShowDetailModal(true);
          }}
          maxDisplay={3}
        />
      </div>

      {/* AI智能分析结果 */}
      {aiSummary && (
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent font-semibold">
                AI智能分析
              </span>
              <span className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded-full">
                DeepSeek
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="prose prose-sm max-w-none text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {/* 将Markdown文本转换为HTML显示 */}
              <div
                className="whitespace-pre-wrap ai-analysis-content"
                dangerouslySetInnerHTML={{
                  __html: aiSummary
                    .replace(/### (.*?)\n/g, '<h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-2 mt-3">$1</h3>')
                    .replace(/^- (.*?)\n/g, '<li class="ml-4 dark:text-gray-300">• $1</li>')
                    .replace(/1\. (.*?)\n/g, '<li class="ml-4 dark:text-gray-300">1. $1</li>')
                    .replace(/2\. (.*?)\n/g, '<li class="ml-4 dark:text-gray-300">2. $1</li>')
                    .replace(/3\. (.*?)\n/g, '<li class="ml-4 dark:text-gray-300">3. $1</li>')
                    .replace(/\n\n/g, '</p><p class="mb-2 dark:text-gray-300">')
                    .replace(/^(?!<[h|l])/g, '<p class="mb-2 dark:text-gray-300">')
                    .replace(/(<p[^>]*>)<p/g, '$1') // 修复连续的p标签
                    + '</p>'
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI分析反馈 */}
      {aiSummary && (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <QuickFeedback
              featureType="smart_analysis"
              context={{
                analysisType: 'ai_summary',
                dateRange,
                currentMonth,
                hasAnalysis: true
              }}
              className="w-full justify-center"
            />
          </CardContent>
        </Card>
      )}

      {/* 支出预测面板 */}
      <SpendingPredictionPanel
        className="w-full"
        isModal={isModal}
      />

      {/* 深度洞察面板 */}
      <DeepInsightPanel
        dateRange={dateRange}
        currentMonth={currentMonth}
        aiData={aiData}
      />
    </div>
  );
}
