'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Wallet, Calendar, History } from 'lucide-react';
import type { RecurringExpense } from '@/lib/api/services/recurring-expenses';

interface StatsCardsProps {
  expenses: RecurringExpense[];
  getExpenseGenerationStatus: (expense: RecurringExpense) => { status: string };
}

export function StatsCards({ expenses, getExpenseGenerationStatus }: StatsCardsProps) {
  // 计算本月已生成数量
  const monthlyGeneratedCount = expenses.filter(e => {
    if (!e.is_active || !e.last_generated) return false;
    const lastGenerated = new Date(e.last_generated);
    const now = new Date();
    return lastGenerated.getMonth() === now.getMonth() &&
           lastGenerated.getFullYear() === now.getFullYear();
  }).length;

  // 计算明日生成数量
  const tomorrowGenerateCount = (() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const dayOfWeek = tomorrow.getDay();

    return expenses.filter(e => {
      if (!e.is_active) return false;
      if (e.next_generate !== tomorrowStr) return false;

      switch (e.frequency) {
        case 'daily':
          return true;
        case 'weekly':
          return e.frequency_config?.days_of_week?.includes(dayOfWeek);
        case 'monthly':
          return e.frequency_config?.day_of_month === tomorrow.getDate();
        default:
          return false;
      }
    }).length;
  })();

  // 计算今日已生成数量
  const todayGeneratedCount = expenses.filter(
    e => getExpenseGenerationStatus(e).status === 'generated'
  ).length;

  const activeCount = expenses.filter(e => e.is_active).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {/* 本月生成统计卡片 */}
      <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-10">
          <Wallet className="h-32 w-32" />
        </div>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Wallet className="h-6 w-6 text-white" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{monthlyGeneratedCount}</div>
              <div className="text-sm text-blue-100 mt-1">个本月已生成</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-blue-100">{activeCount} 个活跃项目</div>
            <div className="text-xs bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm">
              自动化管理
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 明日自动生成卡片 */}
      <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-10">
          <Calendar className="h-32 w-32" />
        </div>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{tomorrowGenerateCount}</div>
              <div className="text-sm text-amber-100 mt-1">个明日生成</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-amber-100">明日自动生成</div>
            <div className="text-xs bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm">
              预计
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 已生成记录卡片 */}
      <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-green-600 text-white">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-10">
          <History className="h-32 w-32" />
        </div>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <History className="h-6 w-6 text-white" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{todayGeneratedCount}</div>
              <div className="text-sm text-emerald-100 mt-1">个今日已生成</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-emerald-100">今日自动生成记录</div>
            <div className="text-xs bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm">
              已完成
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
