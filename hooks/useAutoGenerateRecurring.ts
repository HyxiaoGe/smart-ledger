import { useCallback } from 'react';

/**
 * 固定账单状态展示 Hook
 * 注意：自动生成逻辑已迁移到 Supabase Cron 定时任务
 * 每天 00:01 自动执行，不再依赖前端触发
 */
export function useAutoGenerateRecurring(recurringExpenses: any[]) {
  // 计算固定支出的生成状态（纯展示用）
  const getExpenseGenerationStatus = useCallback((expense: any) => {
    const today = new Date().toISOString().split('T')[0];
    const alreadyGeneratedToday = expense.last_generated === today;

    if (alreadyGeneratedToday) {
      return {
        status: 'generated',
        text: '✅ 今日已生成',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    }

    return {
      status: 'scheduled',
      text: '待生成',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    };
  }, []);

  // 空的 checkAndGenerate 函数 - 保持向后兼容
  // 实际的生成逻辑由 Supabase Cron 处理
  const checkAndGenerate = useCallback(() => {
    // No-op: 自动生成已迁移到 Supabase Cron
    return Promise.resolve();
  }, []);

  return {
    getExpenseGenerationStatus,
    // 保持向后兼容的属性
    isChecking: false,
    lastResult: undefined,
    checkAndGenerate
  };
}
