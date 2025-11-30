/**
 * 固定账单生成服务 - 服务端版本
 * 使用 Prisma 替代 Supabase，用于 API 路由和 Server Components
 */

import { prisma } from '@/lib/clients/db/prisma';

export type RecurringGenerationResult = {
  expense_name: string;
  status: 'success' | 'failed' | 'skipped';
  message: string;
};

export type GenerationHistoryItem = {
  id: string;
  recurring_expense_id: string | null;
  generation_date: string;
  generated_transaction_id: string | null;
  status: string | null;
  reason: string | null;
  created_at: string;
  recurring_expense: {
    name: string;
    amount: number;
    category: string;
  } | null;
  transaction: {
    id: string;
    amount: number;
    note: string | null;
    date: string;
  } | null;
};

export type GenerationStats = {
  total: number;
  success: number;
  failed: number;
  date: string;
};

// Internal types for Prisma query results
type LogRow = {
  id: string;
  recurring_expense_id: string | null;
  generation_date: Date;
  generated_transaction_id: string | null;
  status: string | null;
  reason: string | null;
  created_at: Date | null;
};

type ExpenseRow = {
  id: string;
  name: string;
  amount: unknown;
  category: string;
  frequency: string;
  next_generate: Date | null;
  last_generated: Date | null;
  start_date: Date;
  end_date: Date | null;
  is_active: boolean;
};

type TransactionRow = {
  id: string;
  amount: unknown;
  note: string | null;
  date: Date;
};

/**
 * 手动触发固定账单生成
 * 检查所有符合条件的固定支出，生成对应的交易记录
 */
export async function manualGenerateRecurring(): Promise<RecurringGenerationResult[]> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const results: RecurringGenerationResult[] = [];

  // 获取所有激活的固定支出
  const recurringExpenses = await prisma.recurring_expenses.findMany({
    where: {
      is_active: true,
      start_date: { lte: today },
      OR: [
        { end_date: null },
        { end_date: { gte: today } },
      ],
    },
  });

  for (const expense of recurringExpenses) {
    try {
      // 检查是否应该生成
      const shouldGenerate = checkShouldGenerate(expense, today);

      if (!shouldGenerate) {
        results.push({
          expense_name: expense.name,
          status: 'skipped',
          message: '不在生成日期',
        });
        continue;
      }

      // 检查今天是否已经生成过
      const existingLog = await prisma.recurring_generation_logs.findFirst({
        where: {
          recurring_expense_id: expense.id,
          generation_date: today,
          status: 'success',
        },
      });

      if (existingLog) {
        results.push({
          expense_name: expense.name,
          status: 'skipped',
          message: '今日已生成',
        });
        continue;
      }

      // 创建交易记录
      const transaction = await prisma.transactions.create({
        data: {
          type: 'expense',
          category: expense.category,
          amount: expense.amount,
          note: expense.name,
          date: today,
          currency: 'CNY',
          recurring_expense_id: expense.id,
          is_auto_generated: true,
        },
      });

      // 更新固定支出的最后生成日期和下次生成日期
      const nextGenerateDate = calculateNextGenerateDate(expense, today);
      await prisma.recurring_expenses.update({
        where: { id: expense.id },
        data: {
          last_generated: today,
          next_generate: nextGenerateDate,
          updated_at: new Date(),
        },
      });

      // 记录生成日志
      await prisma.recurring_generation_logs.create({
        data: {
          recurring_expense_id: expense.id,
          generation_date: today,
          generated_transaction_id: transaction.id,
          status: 'success',
          reason: '手动触发生成',
        },
      });

      results.push({
        expense_name: expense.name,
        status: 'success',
        message: `已生成交易 ¥${Number(expense.amount).toFixed(2)}`,
      });
    } catch (error) {
      console.error(`生成固定账单失败 [${expense.name}]:`, error);

      // 记录失败日志
      await prisma.recurring_generation_logs.create({
        data: {
          recurring_expense_id: expense.id,
          generation_date: today,
          status: 'failed',
          reason: error instanceof Error ? error.message : '未知错误',
        },
      });

      results.push({
        expense_name: expense.name,
        status: 'failed',
        message: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  return results;
}

/**
 * 检查是否应该在指定日期生成
 */
function checkShouldGenerate(expense: any, date: Date): boolean {
  const config = expense.frequency_config as any;
  const dayOfMonth = date.getDate();
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ...
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  switch (expense.frequency) {
    case 'daily':
      return true;

    case 'weekly':
      // config.day_of_week: 0-6 (Sunday to Saturday)
      return config?.day_of_week === dayOfWeek;

    case 'monthly':
      // config.day: 1-31 或 'last' 表示最后一天
      if (config?.day === 'last') {
        return dayOfMonth === lastDayOfMonth;
      }
      // 如果设置的日期大于当月天数，在最后一天生成
      const targetDay = Math.min(config?.day || 1, lastDayOfMonth);
      return dayOfMonth === targetDay;

    case 'yearly':
      // config.month: 1-12, config.day: 1-31
      const targetMonth = config?.month || 1;
      const targetDayOfYear = config?.day || 1;
      return date.getMonth() + 1 === targetMonth && dayOfMonth === targetDayOfYear;

    default:
      return false;
  }
}

/**
 * 计算下次生成日期
 */
function calculateNextGenerateDate(expense: any, fromDate: Date): Date {
  const config = expense.frequency_config as any;
  const nextDate = new Date(fromDate);

  switch (expense.frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;

    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;

    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      if (config?.day === 'last') {
        // 设置为下个月的最后一天
        nextDate.setMonth(nextDate.getMonth() + 1, 0);
      } else {
        const targetDay = config?.day || 1;
        const lastDayOfNextMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        nextDate.setDate(Math.min(targetDay, lastDayOfNextMonth));
      }
      break;

    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }

  return nextDate;
}

/**
 * 查询固定账单生成历史
 * 优化：原来 N*2 次查询 → 3 次批量查询
 */
export async function getGenerationHistory(limit = 20): Promise<GenerationHistoryItem[]> {
  const logs = await prisma.recurring_generation_logs.findMany({
    orderBy: { created_at: 'desc' },
    take: limit,
  });

  if (logs.length === 0) {
    return [];
  }

  // 收集所有需要查询的 ID
  const typedLogs = logs as LogRow[];
  const expenseIds = typedLogs
    .map((log: LogRow) => log.recurring_expense_id)
    .filter((id): id is string => id !== null);
  const transactionIds = typedLogs
    .map((log: LogRow) => log.generated_transaction_id)
    .filter((id): id is string => id !== null);

  // 批量查询关联数据（2 次查询代替 N*2 次）
  type ExpenseSelect = { id: string; name: string; amount: unknown; category: string };
  type TransactionSelect = { id: string; amount: unknown; note: string | null; date: Date };

  const [expenses, transactions] = await Promise.all([
    expenseIds.length > 0
      ? prisma.recurring_expenses.findMany({
          where: { id: { in: expenseIds } },
          select: { id: true, name: true, amount: true, category: true },
        })
      : Promise.resolve([] as ExpenseSelect[]),
    transactionIds.length > 0
      ? prisma.transactions.findMany({
          where: { id: { in: transactionIds } },
          select: { id: true, amount: true, note: true, date: true },
        })
      : Promise.resolve([] as TransactionSelect[]),
  ]);

  // 构建查找映射
  const expenseMap = new Map((expenses as ExpenseSelect[]).map((e: ExpenseSelect) => [e.id, e]));
  const transactionMap = new Map((transactions as TransactionSelect[]).map((t: TransactionSelect) => [t.id, t]));

  // 组装结果
  return typedLogs.map((log: LogRow) => {
    const expense = log.recurring_expense_id ? expenseMap.get(log.recurring_expense_id) : null;
    const tx = log.generated_transaction_id ? transactionMap.get(log.generated_transaction_id) : null;

    return {
      id: log.id,
      recurring_expense_id: log.recurring_expense_id,
      generation_date: log.generation_date.toISOString().split('T')[0],
      generated_transaction_id: log.generated_transaction_id,
      status: log.status,
      reason: log.reason,
      created_at: log.created_at?.toISOString() || new Date().toISOString(),
      recurring_expense: expense
        ? {
            name: expense.name,
            amount: Number(expense.amount),
            category: expense.category,
          }
        : null,
      transaction: tx
        ? {
            id: tx.id,
            amount: Number(tx.amount),
            note: tx.note,
            date: tx.date.toISOString().split('T')[0],
          }
        : null,
    };
  });
}

/**
 * 查询今日生成统计
 */
export async function getTodayGenerationStats(): Promise<GenerationStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const logs = await prisma.recurring_generation_logs.findMany({
    where: {
      generation_date: {
        gte: today,
        lt: tomorrow,
      },
    },
  });

  const typedLogs = logs as { status: string | null }[];
  const successCount = typedLogs.filter((d: { status: string | null }) => d.status === 'success').length;
  const failedCount = typedLogs.filter((d: { status: string | null }) => d.status === 'failed').length;

  return {
    total: logs.length,
    success: successCount,
    failed: failedCount,
    date: today.toISOString().split('T')[0],
  };
}

/**
 * 获取待生成的固定支出列表
 */
export async function getPendingRecurringExpenses(): Promise<any[]> {
  const today = new Date();

  const expenses = await prisma.recurring_expenses.findMany({
    where: {
      is_active: true,
      start_date: { lte: today },
      OR: [
        { end_date: null },
        { end_date: { gte: today } },
      ],
      next_generate: { lte: today },
    },
    orderBy: { next_generate: 'asc' },
  });

  return (expenses as ExpenseRow[]).map((e: ExpenseRow) => ({
    id: e.id,
    name: e.name,
    amount: Number(e.amount),
    category: e.category,
    frequency: e.frequency,
    next_generate: e.next_generate?.toISOString().split('T')[0],
    last_generated: e.last_generated?.toISOString().split('T')[0],
  }));
}
