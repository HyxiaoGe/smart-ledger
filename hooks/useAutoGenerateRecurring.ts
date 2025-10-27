import { useState, useEffect, useCallback } from 'react';

interface AutoGenerateResult {
  generated: number;
  errors: string[];
  message: string;
}

export function useAutoGenerateRecurring(recurringExpenses: any[]) {
  const [isChecking, setIsChecking] = useState(false);
  const [lastResult, setLastResult] = useState<AutoGenerateResult | null>(null);

  // 计算固定支出的生成状态
  const getExpenseGenerationStatus = useCallback((expense: any) => {
    const today = new Date().toISOString().split('T')[0];
    const todayDate = new Date();
    const dayOfWeek = todayDate.getDay();

    let shouldGenerateToday = false;

    if (expense.is_active && expense.next_generate === today) {
      switch (expense.frequency) {
        case 'daily':
          shouldGenerateToday = true;
          break;
        case 'weekly':
          if (expense.frequency_config.days_of_week &&
              expense.frequency_config.days_of_week.includes(dayOfWeek)) {
            shouldGenerateToday = true;
          }
          break;
        case 'monthly':
          const todayDay = todayDate.getDate();
          if (expense.frequency_config.day_of_month === todayDay) {
            shouldGenerateToday = true;
          }
          break;
      }
    }

    const alreadyGeneratedToday = expense.last_generated === today;

    if (alreadyGeneratedToday) {
      return {
        status: 'generated',
        text: '✅ 今日已生成',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    } else if (shouldGenerateToday) {
      return {
        status: 'pending',
        text: '⏰ 待生成',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200'
      };
    } else {
      return {
        status: 'scheduled',
        text: `下次: ${expense.next_generate || '未设置'}`,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      };
    }
  }, []);

  // 获取今天的待生成数量
  const getPendingCount = useCallback(() => {
    return recurringExpenses.filter(e => getExpenseGenerationStatus(e).status === 'pending').length;
  }, [recurringExpenses, getExpenseGenerationStatus]);

  // 检查并生成待生成的固定支出
  const checkAndGenerate = useCallback(async (showFeedback = false) => {
    if (isChecking) return;

    try {
      setIsChecking(true);

      // 双重检查机制：localStorage + 数据库校验
      const today = new Date().toISOString().split('T')[0];
      const lastCheckKey = 'recurring_expenses_last_check';
      const lastCheck = localStorage.getItem(lastCheckKey);

      // 第一层：localStorage检查
      if (lastCheck === today) {
        console.log('今天已经检查过固定支出，跳过');
        return null;
      }

      // 第二层：数据库二次校验
      // 检查今天是否已经有自动生成的交易记录
      const todayTransactionsResponse = await fetch('/api/transactions/today-auto-generated');
      if (todayTransactionsResponse.ok) {
        const todayData = await todayTransactionsResponse.json();
        if (todayData.count > 0) {
          console.log('数据库检测到今天已生成记录，跳过自动生成');
          localStorage.setItem(lastCheckKey, today);
          return null;
        }
      }

      // 检查是否有待生成的固定支出
      const pendingCount = getPendingCount();

      if (pendingCount > 0) {
        console.log(`发现 ${pendingCount} 个待生成的固定支出，开始自动生成...`);

        const response = await fetch('/api/recurring-expenses/generate', {
          method: 'POST',
        });

        if (response.ok) {
          const result: AutoGenerateResult = await response.json();
          setLastResult(result);

          console.log('自动生成结果:', result);

          if (showFeedback && result.generated > 0) {
            // 可以通过回调或自定义hook来显示提示
            console.log(`✅ 自动生成 ${result.generated} 笔固定支出记录`);
          }

          // 记录今天已经检查过
          localStorage.setItem(lastCheckKey, today);

          return result;
        } else {
          console.error('自动生成失败:', response.status);
          return null;
        }
      } else {
        console.log('没有待生成的固定支出');
        localStorage.setItem(lastCheckKey, today);
        return null;
      }

    } catch (error) {
      console.error('自动检查固定支出失败:', error);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, getPendingCount]);

  // 自动检查（在数据加载完成时触发）
  useEffect(() => {
    if (recurringExpenses.length > 0) {
      checkAndGenerate();
    }
  }, [recurringExpenses, checkAndGenerate]);

  return {
    isChecking,
    lastResult,
    pendingCount: getPendingCount(),
    checkAndGenerate,
    getExpenseGenerationStatus
  };
}