'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressToast } from '@/components/shared/ProgressToast';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { SectionIntro } from '@/components/shared/SectionIntro';
import { SettingsInfoPanel } from '@/components/shared/SettingsInfoPanel';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import {
  parseCronExpression,
  calculateNextRun,
  getJobDescription,
} from '@/lib/services/cronService';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { adminApi } from '@/lib/api/services/admin';
import { formatDateTimeShortZhCN } from '@/lib/utils/date';
import { getCronCategoryStyle, getCronStatusStyle } from './utils';
import { EmptyState } from '@/app/components/EmptyState';
import {
  Clock,
  CheckCircle2,
  Activity,
  Calendar,
  Zap,
  TrendingUp,
  Database,
} from 'lucide-react';

export default function CronManagementPage() {
  const queryClient = useQueryClient();
  const [selectedJobId] = useState<number | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // 使用 React Query 获取 Cron 数据
  const { data: cronData, isLoading: loading, error: fetchError, refetch } = useQuery({
    queryKey: ['admin-cron'],
    queryFn: () => adminApi.getCronData(),
  });

  // 获取任务执行历史
  const { data: historyData } = useQuery({
    queryKey: ['admin-cron-history', selectedJobId],
    queryFn: () => adminApi.getCronHistory(selectedJobId!, 50),
    enabled: selectedJobId !== null,
  });

  // 触发任务的 mutation
  const triggerMutation = useMutation({
    mutationFn: (jobName: string) => adminApi.triggerCronJob(jobName),
    onSuccess: (result, jobName) => {
      if (result.success) {
        setToastMessage(`✅ 任务 "${getJobDescription(jobName).title}" 执行成功`);
      } else {
        setToastMessage(`❌ ${result.error || '任务执行失败'}`);
      }
      setShowToast(true);
      // 刷新数据
      queryClient.invalidateQueries({ queryKey: ['admin-cron'] });
    },
    onError: () => {
      setToastMessage(`❌ 任务执行失败`);
      setShowToast(true);
    },
  });

  // 从查询结果中提取数据
  const jobs = cronData?.jobs || [];
  const stats = cronData?.stats || [];
  const history = historyData || cronData?.history || [];
  const error = fetchError ? '获取 Cron 数据失败' : null;

  const handleTrigger = (jobName: string) => {
    triggerMutation.mutate(jobName);
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

  // 格式化时间
  const formatTime = (dateStr: string | null) => {
    return formatDateTimeShortZhCN(dateStr, '-');
  };

  // 过滤今天的执行记录
  const todayHistory = history.filter((run) => {
    const runDate = new Date(run.start_time);
    const today = new Date();
    return (
      runDate.getFullYear() === today.getFullYear() &&
      runDate.getMonth() === today.getMonth() &&
      runDate.getDate() === today.getDate()
    );
  });

  if (loading) {
    return <PageSkeleton stats={4} listColumns={1} />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb
            items={[
              { label: '设置', href: '/settings' },
              { label: '高级配置', href: '/settings/advanced' },
              { label: '定时任务' }
            ]}
            className="mb-6"
          />
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">{error}</div>
            <Button onClick={() => refetch()}>重试</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 面包屑导航 */}
        <Breadcrumb
          items={[
            { label: '设置', href: '/settings' },
            { label: '高级配置', href: '/settings/advanced' },
            { label: '定时任务' }
          ]}
          className="mb-6"
        />

        <div className="mb-8 rounded-[2rem] border border-slate-200 bg-gradient-to-r from-sky-50 via-white to-blue-50 p-6 shadow-sm dark:border-slate-800 dark:from-sky-950 dark:via-slate-950 dark:to-blue-950">
          <SettingsPageHeader
            title="定时任务管理"
            description="查看系统自动任务的运行节奏、成功率和手动触发入口。"
            icon={Clock}
            tone="blue"
            eyebrow="Automation"
          />
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border border-slate-200/70 bg-gradient-to-br from-white via-sky-50 to-blue-50 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-sky-950/30 dark:to-blue-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalStats.totalJobs}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">总任务数</div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200/70 bg-gradient-to-br from-white via-emerald-50 to-green-50 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-emerald-950/30 dark:to-green-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totalStats.activeJobs}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">活跃任务</div>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200/70 bg-gradient-to-br from-white via-violet-50 to-purple-50 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-violet-950/30 dark:to-purple-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalStats.totalRuns}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">总执行次数</div>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200/70 bg-gradient-to-br from-white via-amber-50 to-orange-50 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-amber-950/30 dark:to-orange-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{totalStats.successRate}%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">成功率</div>
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 任务列表 */}
        <Card className="border-0 shadow-lg mb-6 bg-white dark:bg-gray-800">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 border-b dark:border-gray-700">
            <SectionIntro
              title="定时任务"
              description={`查看 ${jobs.length} 个自动化任务的执行状态、下次运行和手动触发入口。`}
              className="mb-0"
            />
          </CardHeader>
          <CardContent className="p-6">
            {jobs.length === 0 ? (
              <EmptyState
                title="暂无定时任务"
                description="还没有可展示的自动任务。你可以稍后刷新，或检查后端任务注册状态。"
                icon={Clock}
                className="border-dashed shadow-none"
              />
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => {
                  const jobDesc = getJobDescription(job.jobname);
                  const categoryStyle = getCronCategoryStyle(jobDesc.category);
                  const CategoryIcon = categoryStyle.icon;
                  const jobStat = stats.find(s => s.jobid === job.jobid);
                  const nextRun = calculateNextRun(job.schedule, jobStat?.last_run_time || undefined);

                  return (
                    <div
                      key={job.jobid}
                      className={`group relative rounded-xl border-2 p-5 transition-all duration-200 hover:shadow-md ${
                        job.active
                          ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                          : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-850'
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
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg mb-1">
                                {jobDesc.title}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {jobDesc.description}
                              </p>
                              <div className="flex items-center gap-4 flex-wrap">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                  job.active
                                    ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                }`}>
                                  {job.active ? '● 活跃' : '○ 禁用'}
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                  {parseCronExpression(job.schedule)}
                                </span>
                              </div>
                            </div>

                            {/* 操作按钮 */}
                            <Button
                              size="sm"
                              onClick={() => handleTrigger(job.jobname)}
                              disabled={triggerMutation.isPending && triggerMutation.variables === job.jobname}
                              className="group/btn"
                            >
                              <Zap className="h-4 w-4 mr-1 group-hover/btn:text-yellow-400 transition-colors" />
                              {triggerMutation.isPending && triggerMutation.variables === job.jobname ? '执行中...' : '手动触发'}
                            </Button>
                          </div>

                          {/* 统计信息 */}
                          {jobStat && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">总执行</div>
                                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{jobStat.total_runs}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">成功</div>
                                <div className="text-lg font-semibold text-green-600 dark:text-green-400">{jobStat.success_count}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">失败</div>
                                <div className="text-lg font-semibold text-red-600 dark:text-red-400">{jobStat.failed_count}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">上次执行</div>
                                <div className="text-xs font-medium text-gray-900 dark:text-gray-100">{formatTime(jobStat.last_run_time)}</div>
                              </div>
                            </div>
                          )}

                          {/* 下次执行时间 */}
                          {nextRun && !isNaN(nextRun.getTime()) && (
                            <div className="mt-3 flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              <span className="text-gray-600 dark:text-gray-400">下次执行：</span>
                              <span className="text-blue-600 dark:text-blue-400 font-medium">{formatTime(nextRun.toISOString())}</span>
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
        <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 border-b dark:border-gray-700">
            <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-gray-100">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span>今日执行记录</span>
              <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                (今天 {todayHistory.length} 条)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {todayHistory.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                今天暂无执行记录
              </div>
            ) : (
              <div className="space-y-2">
                {todayHistory.map((run) => {
                  const statusStyle = getCronStatusStyle(run.status);
                  const StatusIcon = statusStyle.icon;
                  const job = jobs.find(j => j.jobid === run.jobid);
                  const jobDesc = job ? getJobDescription(job.jobname) : null;

                  return (
                    <div
                      key={run.runid}
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 ${statusStyle.border} ${statusStyle.bg} transition-all hover:shadow-sm`}
                    >
                      <div className={`p-2 rounded-lg bg-white dark:bg-gray-800 border ${statusStyle.border}`}>
                        <StatusIcon className={`h-4 w-4 ${statusStyle.color}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {jobDesc?.title || `Job #${run.jobid}`}
                          </h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle.bg} ${statusStyle.color} border ${statusStyle.border}`}>
                            {statusStyle.label}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {formatTime(run.start_time)}
                          {run.end_time && (
                            <span className="ml-2 text-gray-400 dark:text-gray-500">
                              • 耗时 {Math.round((new Date(run.end_time).getTime() - new Date(run.start_time).getTime()) / 1000)}s
                            </span>
                          )}
                        </div>
                        {run.return_message && run.status === 'failed' && (
                          <div className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 p-2 rounded border border-red-200 dark:border-red-800">
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
        <SettingsInfoPanel
          title="关于定时任务"
          description="所有定时任务由 PostgreSQL pg_cron 扩展管理，按照设定的时间表自动执行。您可以手动触发任务进行测试，但这不会影响定时调度。"
          icon={Clock}
          tone="blue"
          className="mt-6"
        />

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
