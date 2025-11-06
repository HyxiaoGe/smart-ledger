'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProgressToast } from '@/components/shared/ProgressToast';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import {
  getAllCronJobs,
  getCronJobHistory,
  getCronJobStats,
  manualTriggerCronJob,
  parseCronExpression,
  calculateNextRun,
  getJobDescription,
  type CronJob,
  type CronJobRun,
  type CronJobStats,
} from '@/lib/services/cronService';
import {
  ChevronLeft,
  Clock,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Activity,
  Calendar,
  Zap,
  TrendingUp,
  AlertCircle,
  Database,
  Cpu,
  Sparkles,
  Settings
} from 'lucide-react';

export default function CronManagementPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [stats, setStats] = useState<CronJobStats[]>([]);
  const [history, setHistory] = useState<CronJobRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedJobId !== null) {
      fetchHistory(selectedJobId);
    }
  }, [selectedJobId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [jobsData, statsData, historyData] = await Promise.all([
        getAllCronJobs(),
        getCronJobStats(),
        getCronJobHistory(undefined, 20),
      ]);

      setJobs(jobsData);
      setStats(statsData);
      setHistory(historyData);
    } catch (error) {
      console.error('获取 Cron 数据失败:', error);
      setError('获取 Cron 数据失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (jobId: number) => {
    try {
      const historyData = await getCronJobHistory(jobId, 50);
      setHistory(historyData);
    } catch (error) {
      console.error('获取执行历史失败:', error);
    }
  };

  const handleTrigger = async (jobName: string) => {
    try {
      setTriggering(jobName);
      await manualTriggerCronJob(jobName);
      setToastMessage(`✅ 任务 "${getJobDescription(jobName).title}" 执行成功`);
      setShowToast(true);

      // 刷新数据
      await fetchData();
    } catch (error) {
      console.error('触发任务失败:', error);
      setToastMessage(`❌ 任务执行失败`);
      setShowToast(true);
    } finally {
      setTriggering(null);
    }
  };

  // 计算总体统计
  const totalStats = {
    totalJobs: jobs.length,
    activeJobs: jobs.filter(j => j.active).length,
    totalRuns: stats.reduce((sum, s) => sum + Number(s.total_runs), 0),
    successRate: stats.length > 0
      ? (stats.reduce((sum, s) => sum + Number(s.success_count), 0) /
        Math.max(stats.reduce((sum, s) => sum + Number(s.total_runs), 0), 1) * 100).toFixed(1)
      : '0',
  };

  // 获取分类图标和颜色
  const getCategoryStyle = (category: string) => {
    switch (category) {
      case 'business':
        return {
          icon: Database,
          bgColor: 'bg-blue-50 dark:bg-blue-950',
          iconColor: 'text-blue-600',
          borderColor: 'border-blue-200 dark:border-blue-800'
        };
      case 'ai':
        return {
          icon: Sparkles,
          bgColor: 'bg-purple-50 dark:bg-purple-950',
          iconColor: 'text-purple-600',
          borderColor: 'border-purple-200 dark:border-purple-800'
        };
      case 'maintenance':
        return {
          icon: Settings,
          bgColor: 'bg-green-50 dark:bg-green-950',
          iconColor: 'text-green-600',
          borderColor: 'border-green-200 dark:border-green-800'
        };
      default:
        return {
          icon: Cpu,
          bgColor: 'bg-gray-50 dark:bg-gray-900',
          iconColor: 'text-gray-600',
          borderColor: 'border-gray-200 dark:border-gray-700'
        };
    }
  };

  // 状态样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'succeeded':
        return {
          icon: CheckCircle2,
          color: 'text-green-600',
          bg: 'bg-green-50 dark:bg-green-950',
          border: 'border-green-200 dark:border-green-800',
          label: '成功'
        };
      case 'failed':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bg: 'bg-red-50 dark:bg-red-950',
          border: 'border-red-200 dark:border-red-800',
          label: '失败'
        };
      case 'running':
        return {
          icon: Activity,
          color: 'text-blue-600',
          bg: 'bg-blue-50 dark:bg-blue-950',
          border: 'border-blue-200 dark:border-blue-800',
          label: '运行中'
        };
      default:
        return {
          icon: AlertCircle,
          color: 'text-gray-600',
          bg: 'bg-gray-50 dark:bg-gray-900',
          border: 'border-gray-200 dark:border-gray-700',
          label: '未知'
        };
    }
  };

  // 格式化时间
  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <PageSkeleton stats={4} listColumns={1} />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link href="/settings">
              <Button variant="ghost" className="text-gray-600 dark:text-gray-300 hover:text-gray-900">
                <ChevronLeft className="h-4 w-4 mr-2" />
                返回设置
              </Button>
            </Link>
          </div>
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">{error}</div>
            <Button onClick={fetchData}>重试</Button>
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
          <Link href="/settings">
            <Button variant="ghost" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 hover:bg-gray-50 rounded-lg px-3 py-2 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200">
              <ChevronLeft className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
              返回设置
            </Button>
          </Link>
        </div>

        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 dark:bg-blue-900 dark:bg-blue-900 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">定时任务管理</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-300">查看和管理系统自动化任务</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{totalStats.totalJobs}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">总任务数</div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950 dark:bg-blue-950 dark:bg-blue-950 rounded-lg">
                  <Database className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{totalStats.activeJobs}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">活跃任务</div>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950 dark:bg-green-950 dark:bg-green-950 rounded-lg">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-600">{totalStats.totalRuns}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">总执行次数</div>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950 dark:bg-purple-950 dark:bg-purple-950 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-orange-600">{totalStats.successRate}%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">成功率</div>
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-950 dark:bg-orange-950 dark:bg-orange-950 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 任务列表 */}
        <Card className="border-0 shadow-lg mb-6">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
            <CardTitle className="flex items-center gap-3 text-gray-900">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 dark:bg-blue-900 dark:bg-blue-900 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <span>定时任务</span>
              <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                ({jobs.length} 个任务)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {jobs.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                暂无定时任务
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => {
                  const jobDesc = getJobDescription(job.jobname);
                  const categoryStyle = getCategoryStyle(jobDesc.category);
                  const CategoryIcon = categoryStyle.icon;
                  const jobStat = stats.find(s => s.jobid === job.jobid);
                  const nextRun = calculateNextRun(job.schedule, jobStat?.last_run_time || undefined);

                  return (
                    <div
                      key={job.jobid}
                      className={`group relative rounded-xl border-2 p-5 transition-all duration-200 hover:shadow-md ${
                        job.active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* 分类图标 */}
                        <div className={`flex-shrink-0 p-3 rounded-xl ${categoryStyle.bgColor} ${categoryStyle.borderColor} border-2`}>
                          <CategoryIcon className={`h-6 w-6 ${categoryStyle.iconColor}`} />
                        </div>

                        {/* 任务信息 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div>
                              <h3 className="font-semibold text-gray-900 text-lg mb-1">
                                {jobDesc.title}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                {jobDesc.description}
                              </p>
                              <div className="flex items-center gap-4 flex-wrap">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                  job.active
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {job.active ? '● 活跃' : '○ 禁用'}
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-300 font-mono bg-gray-100 px-2 py-1 rounded">
                                  {parseCronExpression(job.schedule)}
                                </span>
                              </div>
                            </div>

                            {/* 操作按钮 */}
                            <Button
                              size="sm"
                              onClick={() => handleTrigger(job.jobname)}
                              disabled={triggering === job.jobname}
                              className="group/btn"
                            >
                              <Zap className="h-4 w-4 mr-1 group-hover/btn:text-yellow-400 transition-colors" />
                              {triggering === job.jobname ? '执行中...' : '手动触发'}
                            </Button>
                          </div>

                          {/* 统计信息 */}
                          {jobStat && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200 dark:border-gray-700">
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">总执行</div>
                                <div className="text-lg font-semibold text-gray-900">{jobStat.total_runs}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">成功</div>
                                <div className="text-lg font-semibold text-green-600">{jobStat.success_count}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">失败</div>
                                <div className="text-lg font-semibold text-red-600">{jobStat.failed_count}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">上次执行</div>
                                <div className="text-xs font-medium text-gray-900">{formatTime(jobStat.last_run_time)}</div>
                              </div>
                            </div>
                          )}

                          {/* 下次执行时间 */}
                          {nextRun && (
                            <div className="mt-3 flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-blue-600" />
                              <span className="text-gray-600 dark:text-gray-300">下次执行：</span>
                              <span className="text-blue-600 font-medium">{formatTime(nextRun.toISOString())}</span>
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

        {/* 最近执行历史 */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
            <CardTitle className="flex items-center gap-3 text-gray-900">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 dark:bg-purple-900 rounded-lg">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
              <span>最近执行记录</span>
              <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                (最近 {history.length} 条)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {history.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                暂无执行记录
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((run) => {
                  const statusStyle = getStatusStyle(run.status);
                  const StatusIcon = statusStyle.icon;
                  const job = jobs.find(j => j.jobid === run.jobid);
                  const jobDesc = job ? getJobDescription(job.jobname) : null;

                  return (
                    <div
                      key={run.runid}
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 ${statusStyle.border} ${statusStyle.bg} transition-all hover:shadow-sm`}
                    >
                      <div className={`p-2 rounded-lg bg-white border ${statusStyle.border}`}>
                        <StatusIcon className={`h-4 w-4 ${statusStyle.color}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-medium text-gray-900">
                            {jobDesc?.title || `Job #${run.jobid}`}
                          </h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle.bg} ${statusStyle.color} border ${statusStyle.border}`}>
                            {statusStyle.label}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {formatTime(run.start_time)}
                          {run.end_time && (
                            <span className="ml-2 text-gray-400 dark:text-gray-400">
                              • 耗时 {Math.round((new Date(run.end_time).getTime() - new Date(run.start_time).getTime()) / 1000)}s
                            </span>
                          )}
                        </div>
                        {run.return_message && run.status === 'failed' && (
                          <div className="mt-2 text-xs text-red-600 bg-red-50 dark:bg-red-950 dark:bg-red-950 p-2 rounded border border-red-200 dark:border-red-800 dark:border-red-800">
                            {run.return_message}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 说明信息 */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 dark:bg-blue-950 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 dark:border-blue-800 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <div className="p-1 bg-blue-100 dark:bg-blue-900 dark:bg-blue-900 dark:bg-blue-900 rounded">
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-sm text-blue-900 dark:text-blue-100 dark:text-blue-100">
              <p className="font-medium mb-1">关于定时任务</p>
              <p className="text-blue-700 dark:text-blue-300">
                所有定时任务由 PostgreSQL pg_cron 扩展管理，按照设定的时间表自动执行。
                您可以手动触发任务进行测试，但这不会影响定时调度。
              </p>
            </div>
          </div>
        </div>

        {/* Toast提示 */}
        {showToast && (
          <ProgressToast
            message={toastMessage}
            onClose={() => setShowToast(false)}
          />
        )}
      </div>
    </div>
  );
}
