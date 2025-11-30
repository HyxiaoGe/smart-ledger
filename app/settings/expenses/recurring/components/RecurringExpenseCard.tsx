'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Calendar, Pause, Play, Edit, Trash2, History, Clock } from 'lucide-react';
import type { RecurringExpense } from '@/lib/api/services/recurring-expenses';
import { FREQUENCY_LABELS, CATEGORY_ICONS } from '../constants';

interface GenerationStatus {
  status: string;
  text: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface RecurringExpenseCardProps {
  expense: RecurringExpense;
  generationStatus: GenerationStatus;
  onToggleActive: () => void;
  onDelete: () => void;
}

export function RecurringExpenseCard({
  expense,
  generationStatus,
  onToggleActive,
  onDelete,
}: RecurringExpenseCardProps) {
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
        expense.is_active
          ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600'
          : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      {/* 状态指示条 */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
        expense.is_active ? 'bg-green-500' : 'bg-gray-400'
      }`}></div>

      <div className="p-6 pl-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* 类别图标 */}
            <div className={`relative p-3 rounded-xl transition-transform group-hover:scale-110 ${
              expense.is_active
                ? 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 shadow-sm'
                : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              <div className="text-2xl">
                {CATEGORY_ICONS[expense.category] || '💰'}
              </div>
              {expense.is_active && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 dark:bg-green-400 rounded-full border-2 border-white dark:border-gray-800"></div>
              )}
            </div>

            {/* 详细信息 */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                  {expense.name}
                </h3>
                {expense.is_active ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                    <div className="w-1.5 h-1.5 bg-green-500 dark:bg-green-400 rounded-full mr-1.5 animate-pulse"></div>
                    活跃
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                    <Pause className="h-3 w-3 mr-1" />
                    暂停
                  </span>
                )}
              </div>

              {/* 金额和频率 */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                  <span className="text-lg">¥</span>
                  <span>{expense.amount.toFixed(0)}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                    .{(expense.amount % 1).toFixed(2).slice(2)}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  {FREQUENCY_LABELS[expense.frequency]}
                  {expense.frequency === 'monthly' && expense.frequency_config?.day_of_month &&
                    ` · 每月${expense.frequency_config.day_of_month}号`
                  }
                  {expense.frequency === 'weekly' && expense.frequency_config?.days_of_week &&
                    ` · 周${expense.frequency_config.days_of_week.map((d: number) => ['日','一','二','三','四','五','六'][d]).join('、')}`
                  }
                </div>
              </div>

              {/* 时间信息 */}
              <div className="flex items-center gap-6 text-xs">
                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <Calendar className="h-3 w-3" />
                  开始: {expense.start_date}
                </span>
                <span className={`flex items-center gap-1 px-2 py-1 rounded-full border ${generationStatus.bgColor} ${generationStatus.borderColor} ${generationStatus.color} font-medium`}>
                  {generationStatus.status === 'generated' && <History className="h-3 w-3" />}
                  {generationStatus.status === 'pending' && <Clock className="h-3 w-3" />}
                  {generationStatus.status === 'scheduled' && <Clock className="h-3 w-3" />}
                  {generationStatus.text}
                </span>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            <Button
              variant={expense.is_active ? "outline" : "default"}
              size="sm"
              onClick={onToggleActive}
              className={expense.is_active ? "hover:bg-orange-50 dark:hover:bg-orange-950 hover:border-orange-300 dark:hover:border-orange-700 hover:text-orange-700 dark:hover:text-orange-300" : "bg-green-600 hover:bg-green-700"}
            >
              {expense.is_active ? (
                <><Pause className="h-4 w-4 mr-1" /> 暂停</>
              ) : (
                <><Play className="h-4 w-4 mr-1" /> 启用</>
              )}
            </Button>

            <Link href={`/settings/expenses/recurring/${expense.id}/edit`}>
              <Button variant="outline" size="sm" className="hover:bg-blue-50 dark:hover:bg-blue-950 dark:bg-blue-950 hover:border-blue-300 dark:border-blue-700 hover:text-blue-700 dark:text-blue-300">
                <Edit className="h-4 w-4" />
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="hover:bg-red-50 dark:bg-red-950 hover:border-red-300 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
