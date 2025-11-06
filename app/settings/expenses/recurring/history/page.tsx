'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { getGenerationHistory } from '@/lib/services/recurringService';
import {
  ChevronLeft,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  TrendingUp,
  Filter
} from 'lucide-react';

interface GenerationLog {
  id: string;
  recurring_expense_id: string;
  transaction_id: string | null;
  status: 'success' | 'failed' | 'skipped';
  message: string;
  created_at: string;
  recurring_expense?: {
    name: string;
    amount: number;
    category: string;
  };
  transaction?: {
    id: string;
    amount: number;
    note: string;
    date: string;
  };
}

type FilterStatus = 'all' | 'success' | 'failed' | 'skipped';

export default function RecurringHistoryPage() {
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await getGenerationHistory(50);
      setLogs(data);
    } catch (error) {
      console.error('获取生成历史失败:', error);
      setError('获取生成历史失败');
    } finally {
      setLoading(false);
    }
  };

  // 筛选日志
  const filteredLogs = logs.filter(log => {
    if (filterStatus === 'all') return true;
    return log.status === filterStatus;
  });

  // 统计数据
  const stats = {
    total: logs.length,
    success: logs.filter(l => l.status === 'success').length,
    failed: logs.filter(l => l.status === 'failed').length,
    skipped: logs.filter(l => l.status === 'skipped').length,
  };

  // 状态样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'success':
        return {
          icon: CheckCircle2,
          bgColor: 'bg-green-50 dark:bg-green-950',
          borderColor: 'border-green-200',
          textColor: 'text-green-700',
          dotColor: 'bg-green-500',
          label: '成功'
        };
      case 'failed':
        return {
          icon: XCircle,
          bgColor: 'bg-red-50 dark:bg-red-950',
          borderColor: 'border-red-200',
          textColor: 'text-red-700',
          dotColor: 'bg-red-500',
          label: '失败'
        };
      case 'skipped':
        return {
          icon: Clock,
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-600',
          dotColor: 'bg-gray-400',
          label: '跳过'
        };
      default:
        return {
          icon: Clock,
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-600',
          dotColor: 'bg-gray-400',
          label: '未知'
        };
    }
  };

  // 格式化时间
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
      time: date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      full: date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
    };
  };

  if (loading) {
    return <PageSkeleton stats={4} listColumns={1} />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link href="/settings/expenses/recurring">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900 dark:text-gray-100">
                <ChevronLeft className="h-4 w-4 mr-2" />
                返回固定支出
              </Button>
            </Link>
          </div>
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">{error}</div>
            <Button onClick={fetchHistory}>重试</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回导航 */}
        <div className="mb-6">
          <Link href="/settings/expenses/recurring">
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900 dark:text-gray-100 hover:bg-gray-50 rounded-lg px-3 py-2 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200">
              <ChevronLeft className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
              返回固定支出
            </Button>
          </Link>
        </div>

        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 dark:bg-blue-900 rounded-lg">
              <History className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">生成历史记录</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-300">查看固定支出的自动生成记录和执行状态</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
                  <div className="text-sm text-gray-600 mt-1">总记录数</div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950 dark:bg-blue-950 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.success}</div>
                  <div className="text-sm text-gray-600 mt-1">成功生成</div>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950 dark:bg-green-950 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                  <div className="text-sm text-gray-600 mt-1">生成失败</div>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-950 dark:bg-red-950 rounded-lg">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-600 dark:text-gray-300">{stats.skipped}</div>
                  <div className="text-sm text-gray-600 mt-1">已跳过</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <Clock className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 筛选器 */}
        <Card className="border-0 shadow-md mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-700">
                <Filter className="h-4 w-4" />
                <span className="font-medium">筛选状态：</span>
              </div>
              <div className="flex gap-2">
                {[
                  { value: 'all', label: '全部', count: stats.total },
                  { value: 'success', label: '成功', count: stats.success },
                  { value: 'failed', label: '失败', count: stats.failed },
                  { value: 'skipped', label: '跳过', count: stats.skipped },
                ].map((filter) => (
                  <Button
                    key={filter.value}
                    variant={filterStatus === filter.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus(filter.value as FilterStatus)}
                    className="min-w-[80px]"
                  >
                    {filter.label} ({filter.count})
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 历史记录列表 */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b dark:border-gray-700">
            <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-gray-100">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 dark:bg-blue-900 rounded-lg">
                <History className="h-5 w-5 text-blue-600" />
              </div>
              <span>生成记录</span>
              <span className="text-sm text-gray-500 font-normal">
                ({filteredLogs.length} 条记录)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
                  <History className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {filterStatus === 'all' ? '还没有生成记录' : `没有${getStatusStyle(filterStatus).label}的记录`}
                </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  {filterStatus === 'all'
                    ? '系统会在每天 00:01 自动检查并生成符合条件的固定支出，生成记录会显示在这里'
                    : '尝试切换其他筛选条件查看记录'
                  }
                </p>
                {filterStatus !== 'all' && (
                  <Button onClick={() => setFilterStatus('all')} variant="outline">
                    查看全部记录
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log, index) => {
                  const statusStyle = getStatusStyle(log.status);
                  const StatusIcon = statusStyle.icon;
                  const time = formatDateTime(log.created_at);

                  return (
                    <div
                      key={log.id}
                      className={`group relative rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-md ${statusStyle.borderColor} ${statusStyle.bgColor}`}
                    >
                      {/* 时间线连接线 */}
                      {index < filteredLogs.length - 1 && (
                        <div className={`absolute left-8 top-14 w-0.5 h-8 ${statusStyle.dotColor} opacity-20`}></div>
                      )}

                      <div className="flex items-start gap-4">
                        {/* 状态图标 */}
                        <div className={`relative flex-shrink-0 p-2 rounded-lg ${statusStyle.bgColor} border-2 ${statusStyle.borderColor}`}>
                          <StatusIcon className={`h-5 w-5 ${statusStyle.textColor}`} />
                          <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ${statusStyle.dotColor} border-2 border-white`}></div>
                        </div>

                        {/* 内容区域 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                                {log.recurring_expense?.name || '未知支出'}
                              </h3>
                              <div className="flex items-center gap-4 mt-1">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusStyle.bgColor} ${statusStyle.textColor} border ${statusStyle.borderColor}`}>
                                  {statusStyle.label}
                                </span>
                                {log.recurring_expense && (
                                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                    ¥{log.recurring_expense.amount.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                              <Calendar className="h-4 w-4" />
                              <div className="text-right">
                                <div className="font-medium">{time.date}</div>
                                <div className="text-xs">{time.time}</div>
                              </div>
                            </div>
                          </div>

                          {/* 详细信息 */}
                          <div className="text-sm text-gray-600 mb-2">
                            {log.message}
                          </div>

                          {/* 关联交易信息 */}
                          {log.transaction && (
                            <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 dark:border-gray-700">
                              <div className="flex items-center justify-between">
                                <div className="text-sm">
                                  <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500">生成交易：</span>
                                  <span className="text-gray-900 dark:text-gray-100 font-medium ml-2">{log.transaction.note}</span>
                                </div>
                                <Link href={`/records`}>
                                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950 dark:bg-blue-950">
                                    查看详情 →
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 说明信息 */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <div className="p-1 bg-blue-100 dark:bg-blue-900 dark:bg-blue-900 rounded">
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-sm text-blue-900 dark:text-blue-100 dark:text-blue-100">
              <p className="font-medium mb-1">自动生成说明</p>
              <p className="text-blue-700 dark:text-blue-300">
                系统会在每天 00:01 自动执行定时任务，检查所有启用的固定支出并根据频率规则生成相应的交易记录。
                所有执行结果（成功/失败）都会记录在此页面。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
