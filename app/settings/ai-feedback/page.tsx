'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  MessageSquare,
  TrendingUp,
  Users,
  Download,
  Calendar,
  Star,
  ThumbsUp,
  ThumbsDown,
  Filter,
  RefreshCw
} from 'lucide-react';
import { aiFeedbackService } from '@/lib/services/aiFeedbackService';
import type { AIFeedback, AIFeedbackStats } from '@/types/ai-feedback';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AIFeedbackManagementPage() {
  const [feedbacks, setFeedbacks] = useState<AIFeedback[]>([]);
  const [stats, setStats] = useState<AIFeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    featureType: 'all' as string,
    status: 'all' as string,
    timeRange: '7d' as string
  });

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const allFeedbacks = aiFeedbackService.getAllFeedbacks();
      const feedbackStats = aiFeedbackService.getFeedbackStats();

      // 应用过滤
      const filteredFeedbacks = filterFeedbacks(allFeedbacks);
      setFeedbacks(filteredFeedbacks);
      setStats(feedbackStats);
    } catch (error) {
      console.error('加载AI反馈数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 过滤反馈
  const filterFeedbacks = (allFeedbacks: AIFeedback[]): AIFeedback[] => {
    let filtered = [...allFeedbacks];

    if (filter.featureType !== 'all') {
      filtered = filtered.filter(f => f.featureType === filter.featureType);
    }

    if (filter.status !== 'all') {
      filtered = filtered.filter(f => f.status === filter.status);
    }

    // 时间范围过滤
    const now = new Date();
    let cutoffDate: Date;

    switch (filter.timeRange) {
      case '1d':
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    filtered = filtered.filter(f => new Date(f.timestamp) >= cutoffDate);

    return filtered.reverse(); // 最新的在前
  };

  useEffect(() => {
    loadData();
  }, [filter]);

  // 导出数据
  const exportData = (format: 'json' | 'csv' = 'json') => {
    try {
      const data = aiFeedbackService.exportFeedbacks(format);
      const blob = new Blob([data], {
        type: format === 'json' ? 'application/json' : 'text/csv'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-feedbacks-${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  // 批量更新状态
  const updateStatus = async (feedbackIds: string[], status: AIFeedback['status']) => {
    try {
      for (const id of feedbackIds) {
        await aiFeedbackService.updateFeedbackStatus(id, status);
      }
      loadData();
    } catch (error) {
      console.error('更新状态失败:', error);
    }
  };

  // 图表数据准备
  const getFeatureTypeData = () => {
    if (!stats) return [];

    return Object.entries(stats.featureStats).map(([feature, data]) => ({
      name: getFeatureTypeName(feature),
      count: data.count,
      avgRating: data.avgRating
    }));
  };

  const getSentimentData = () => {
    if (!stats) return [];

    return [
      { name: '积极', value: stats.sentimentAnalysis.positive, color: '#10b981' },
      { name: '中性', value: stats.sentimentAnalysis.neutral, color: '#f59e0b' },
      { name: '消极', value: stats.sentimentAnalysis.negative, color: '#ef4444' }
    ];
  };

  const getTimeSeriesData = () => {
    if (!stats) return [];

    const data = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayFeedbacks = feedbacks.filter(f => {
        const feedbackDate = new Date(f.timestamp);
        return feedbackDate.toDateString() === date.toDateString();
      });

      data.push({
        date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        count: dayFeedbacks.length,
        avgRating: dayFeedbacks.length > 0
          ? dayFeedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / dayFeedbacks.length
          : 0
      });
    }

    return data;
  };

  const getFeatureTypeName = (feature: string): string => {
    const names: Record<string, string> = {
      spending_prediction: '支出预测',
      smart_analysis: '智能分析',
      budget_recommendation: '预算建议',
      anomaly_detection: '异常检测',
      auto_categorization: '自动分类',
      deep_insight: '深度洞察'
    };
    return names[feature] || feature;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600 dark:text-gray-300 dark:text-gray-300">加载AI反馈数据...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">AI反馈管理</h1>
          <p className="text-gray-600 mt-1">管理和分析用户对AI功能的反馈</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => exportData('json')} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            导出JSON
          </Button>
          <Button onClick={() => exportData('csv')} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            导出CSV
          </Button>
          <Button onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>
      </div>

      {/* 统计概览 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 dark:text-gray-300">总反馈数</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalFeedbacks}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 dark:text-gray-300">平均评分</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.averageRating.toFixed(1)}</p>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 dark:text-gray-300">积极率</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{(stats.positiveRate * 100).toFixed(1)}%</p>
                </div>
                <ThumbsUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 dark:text-gray-300">本周反馈</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.timeStats.thisWeek}</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 过滤器 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500" />
              <span className="text-sm font-medium text-gray-700">筛选:</span>
            </div>

            <select
              value={filter.featureType}
              onChange={(e) => setFilter(prev => ({ ...prev, featureType: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md text-sm transition-all duration-200 ease-in-out hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm cursor-pointer"
            >
              <option value="all">所有功能</option>
              <option value="spending_prediction">支出预测</option>
              <option value="smart_analysis">智能分析</option>
              <option value="budget_recommendation">预算建议</option>
              <option value="anomaly_detection">异常检测</option>
              <option value="auto_categorization">自动分类</option>
            </select>

            <select
              value={filter.status}
              onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md text-sm transition-all duration-200 ease-in-out hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm cursor-pointer"
            >
              <option value="all">所有状态</option>
              <option value="pending">待处理</option>
              <option value="reviewed">已审核</option>
              <option value="resolved">已解决</option>
              <option value="ignored">已忽略</option>
            </select>

            <select
              value={filter.timeRange}
              onChange={(e) => setFilter(prev => ({ ...prev, timeRange: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md text-sm transition-all duration-200 ease-in-out hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm cursor-pointer"
            >
              <option value="1d">最近1天</option>
              <option value="7d">最近7天</option>
              <option value="30d">最近30天</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 功能类型分布 */}
        <Card>
          <CardHeader>
            <CardTitle>功能类型分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getFeatureTypeData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 情感分析 */}
        <Card>
          <CardHeader>
            <CardTitle>情感分析</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={getSentimentData()}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {getSentimentData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 时间趋势 */}
      <Card>
        <CardHeader>
          <CardTitle>反馈趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={getTimeSeriesData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Bar yAxisId="left" dataKey="count" fill="#3b82f6" />
              <Line yAxisId="right" type="monotone" dataKey="avgRating" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 反馈列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>最近反馈</span>
            <span className="text-sm font-normal text-gray-600 dark:text-gray-300 dark:text-gray-300">
              显示 {feedbacks.length} 条反馈
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {feedbacks.slice(0, 10).map((feedback) => (
              <div key={feedback.id} className="border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">
                        {getFeatureTypeName(feedback.featureType)}
                      </Badge>
                      <Badge variant={feedback.status === 'pending' ? 'default' : 'outline'}>
                        {feedback.status}
                      </Badge>
                      {feedback.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500" fill="currentColor" />
                          <span className="text-sm">{feedback.rating}</span>
                        </div>
                      )}
                    </div>

                    {feedback.comment && (
                      <p className="text-sm text-gray-700 mb-2">{feedback.comment}</p>
                    )}

                    <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                      {new Date(feedback.timestamp).toLocaleString('zh-CN')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {feedback.isPositive !== undefined && (
                      feedback.isPositive ?
                        <ThumbsUp className="w-4 h-4 text-green-600" /> :
                        <ThumbsDown className="w-4 h-4 text-red-600" />
                    )}

                    {feedback.status === 'pending' && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus([feedback.id], 'reviewed')}
                        >
                          标记已审
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus([feedback.id], 'resolved')}
                        >
                          标记解决
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {feedbacks.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>暂无符合条件的反馈数据</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}