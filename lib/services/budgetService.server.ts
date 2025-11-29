/**
 * 预算服务 - 服务端版本
 * 使用 Prisma 替代 Supabase，用于 API 路由和 Server Components
 */

import { prisma } from '@/lib/clients/db/prisma';
import { getBudgetRepository, getTransactionRepository, getCategoryRepository } from '@/lib/infrastructure/repositories/index.server';

/**
 * 预算定义
 */
export interface Budget {
  id: string;
  year: number;
  month: number;
  category_key: string | null;
  amount: number;
  alert_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 预算执行状态
 */
export interface BudgetStatus {
  id: string;
  category_key: string | null;
  category_label: string;
  category_icon: string | null;
  category_color: string | null;
  budget_amount: number;
  spent_amount: number;
  remaining_amount: number;
  usage_percentage: number;
  alert_threshold: number;
  is_over_budget: boolean;
  is_near_limit: boolean;
  transaction_count: number;
}

/**
 * 总预算汇总
 */
export interface TotalBudgetSummary {
  total_budget: number;
  total_spent: number;
  total_remaining: number;
  usage_percentage: number;
  category_budgets_count: number;
  over_budget_count: number;
  near_limit_count: number;
}

/**
 * 预算历史记录
 */
export interface BudgetHistory {
  year: number;
  month: number;
  budget_amount: number;
  spent_amount: number;
  usage_percentage: number;
}

/**
 * 预算预测结果
 */
export interface BudgetPrediction {
  current_spending: number;
  daily_rate: number;
  predicted_total: number;
  days_passed: number;
  days_remaining: number;
  will_exceed_budget: boolean;
  predicted_overage?: number;
}

/**
 * 预算建议
 */
export interface BudgetSuggestion {
  categoryKey: string;
  suggestedAmount: number;
  confidenceLevel: string;
  reason: string;
  historicalAvg: number;
  historicalMonths: number;
  currentMonthSpending: number;
  currentDailyRate: number;
  predictedMonthTotal: number;
  trendDirection: string;
  daysIntoMonth: number;
  calculatedAt: string;
}

/**
 * 设置或更新预算
 */
export async function setBudget(params: {
  year: number;
  month: number;
  categoryKey: string | null;
  amount: number;
  alertThreshold?: number;
}): Promise<string> {
  const { year, month, categoryKey, amount, alertThreshold = 0.80 } = params;

  // 使用 upsert 实现设置或更新
  const existingBudget = await prisma.budgets.findFirst({
    where: {
      year,
      month,
      category_key: categoryKey,
    },
  });

  if (existingBudget) {
    // 更新现有预算
    const updated = await prisma.budgets.update({
      where: { id: existingBudget.id },
      data: {
        amount,
        alert_threshold: alertThreshold,
        is_active: true,
        updated_at: new Date(),
      },
    });
    return updated.id;
  } else {
    // 创建新预算
    const created = await prisma.budgets.create({
      data: {
        year,
        month,
        category_key: categoryKey,
        amount,
        alert_threshold: alertThreshold,
        is_active: true,
      },
    });
    return created.id;
  }
}

/**
 * 获取本月预算执行情况
 */
export async function getMonthlyBudgetStatus(
  year: number,
  month: number
): Promise<BudgetStatus[]> {
  // 1. 获取所有激活的预算
  const budgets = await prisma.budgets.findMany({
    where: {
      year,
      month,
      is_active: true,
    },
  });

  if (budgets.length === 0) {
    return [];
  }

  // 2. 获取分类信息
  const categories = await prisma.categories.findMany({
    where: { is_active: true },
  });
  const categoryMap = new Map(categories.map(c => [c.key, c]));

  // 3. 计算本月日期范围
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  // 4. 获取本月所有交易的分类支出汇总
  const transactions = await prisma.transactions.findMany({
    where: {
      deleted_at: null,
      type: 'expense',
      date: {
        gte: startDate,
        lt: endDate,
      },
    },
    select: {
      category: true,
      amount: true,
    },
  });

  // 按分类汇总支出
  const spendingByCategory: Record<string, { total: number; count: number }> = {};
  let totalSpending = 0;
  let totalCount = 0;

  for (const tx of transactions) {
    const amount = Number(tx.amount);
    totalSpending += amount;
    totalCount++;

    if (!spendingByCategory[tx.category]) {
      spendingByCategory[tx.category] = { total: 0, count: 0 };
    }
    spendingByCategory[tx.category].total += amount;
    spendingByCategory[tx.category].count++;
  }

  // 5. 构建预算状态列表
  const result: BudgetStatus[] = [];

  for (const budget of budgets) {
    const budgetAmount = Number(budget.amount);
    const alertThreshold = Number(budget.alert_threshold);

    let spentAmount: number;
    let transactionCount: number;
    let categoryLabel: string;
    let categoryIcon: string | null = null;
    let categoryColor: string | null = null;

    if (budget.category_key === null) {
      // 总预算
      spentAmount = totalSpending;
      transactionCount = totalCount;
      categoryLabel = '总预算';
    } else {
      // 分类预算
      const spending = spendingByCategory[budget.category_key] || { total: 0, count: 0 };
      spentAmount = spending.total;
      transactionCount = spending.count;

      const category = categoryMap.get(budget.category_key);
      categoryLabel = category?.label || budget.category_key;
      categoryIcon = category?.icon || null;
      categoryColor = category?.color || null;
    }

    const remainingAmount = budgetAmount - spentAmount;
    const usagePercentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;
    const isOverBudget = spentAmount > budgetAmount;
    const isNearLimit = !isOverBudget && usagePercentage >= alertThreshold * 100;

    result.push({
      id: budget.id,
      category_key: budget.category_key,
      category_label: categoryLabel,
      category_icon: categoryIcon,
      category_color: categoryColor,
      budget_amount: budgetAmount,
      spent_amount: spentAmount,
      remaining_amount: remainingAmount,
      usage_percentage: usagePercentage,
      alert_threshold: alertThreshold,
      is_over_budget: isOverBudget,
      is_near_limit: isNearLimit,
      transaction_count: transactionCount,
    });
  }

  return result;
}

/**
 * 直接查询本月实际支出
 */
export async function getMonthlyActualExpense(
  year: number,
  month: number,
  currency: string = 'CNY'
): Promise<number> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const result = await prisma.transactions.aggregate({
    where: {
      deleted_at: null,
      type: 'expense',
      currency,
      date: {
        gte: startDate,
        lt: endDate,
      },
    },
    _sum: {
      amount: true,
    },
  });

  return Number(result._sum.amount || 0);
}

/**
 * 获取总预算汇总
 */
export async function getTotalBudgetSummary(
  year: number,
  month: number,
  currency: string = 'CNY'
): Promise<TotalBudgetSummary> {
  // 1. 获取所有预算设置
  const budgets = await prisma.budgets.findMany({
    where: {
      year,
      month,
      is_active: true,
    },
  });

  // 2. 获取本月实际支出
  const actualExpense = await getMonthlyActualExpense(year, month, currency);

  // 3. 计算总预算
  const totalBudgetRecord = budgets.find(b => b.category_key === null);
  const totalBudget = totalBudgetRecord ? Number(totalBudgetRecord.amount) : 0;

  // 4. 计算分类预算相关统计
  const categoryBudgets = budgets.filter(b => b.category_key !== null);
  const categoryBudgetsCount = categoryBudgets.length;

  // 5. 获取所有分类的实际支出
  const budgetStatuses = await getMonthlyBudgetStatus(year, month);
  const overBudgetCount = budgetStatuses.filter(b => b.is_over_budget && b.category_key).length;
  const nearLimitCount = budgetStatuses.filter(b => b.is_near_limit && !b.is_over_budget && b.category_key).length;

  // 6. 计算汇总数据
  const totalRemaining = totalBudget - actualExpense;
  const usagePercentage = totalBudget > 0 ? (actualExpense / totalBudget) * 100 : 0;

  return {
    total_budget: totalBudget,
    total_spent: actualExpense,
    total_remaining: totalRemaining,
    usage_percentage: usagePercentage,
    category_budgets_count: categoryBudgetsCount,
    over_budget_count: overBudgetCount,
    near_limit_count: nearLimitCount,
  };
}

/**
 * 删除预算
 */
export async function deleteBudget(id: string): Promise<boolean> {
  try {
    await prisma.budgets.delete({
      where: { id },
    });
    return true;
  } catch (error) {
    console.error('删除预算失败:', error);
    return false;
  }
}

/**
 * 获取预算历史数据
 */
export async function getBudgetHistory(
  categoryKey: string | null = null,
  months: number = 6
): Promise<BudgetHistory[]> {
  const now = new Date();
  const result: BudgetHistory[] = [];

  for (let i = 0; i < months; i++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;

    // 获取该月的预算
    const budget = await prisma.budgets.findFirst({
      where: {
        year,
        month,
        category_key: categoryKey,
        is_active: true,
      },
    });

    if (!budget) continue;

    // 计算该月的支出
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    let spentAmount: number;

    if (categoryKey === null) {
      // 总预算 - 统计所有支出
      const aggregateResult = await prisma.transactions.aggregate({
        where: {
          deleted_at: null,
          type: 'expense',
          date: {
            gte: startDate,
            lt: endDate,
          },
        },
        _sum: { amount: true },
      });
      spentAmount = Number(aggregateResult._sum.amount || 0);
    } else {
      // 分类预算
      const aggregateResult = await prisma.transactions.aggregate({
        where: {
          deleted_at: null,
          type: 'expense',
          category: categoryKey,
          date: {
            gte: startDate,
            lt: endDate,
          },
        },
        _sum: { amount: true },
      });
      spentAmount = Number(aggregateResult._sum.amount || 0);
    }

    const budgetAmount = Number(budget.amount);
    const usagePercentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;

    result.push({
      year,
      month,
      budget_amount: budgetAmount,
      spent_amount: spentAmount,
      usage_percentage: usagePercentage,
    });
  }

  return result;
}

/**
 * 获取当前年月
 */
export function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

/**
 * 格式化月份显示
 */
export function formatMonth(year: number, month: number): string {
  return `${year}年${month}月`;
}

/**
 * 获取动态预算建议
 */
export async function getBudgetSuggestions(
  year: number,
  month: number
): Promise<BudgetSuggestion[]> {
  const data = await prisma.budget_suggestions.findMany({
    where: {
      year,
      month,
      is_active: true,
    },
    orderBy: { calculated_at: 'desc' },
  });

  return data.map(row => ({
    categoryKey: row.category_key || '',
    suggestedAmount: Number(row.suggested_amount),
    confidenceLevel: row.confidence_level,
    reason: row.reason,
    historicalAvg: Number(row.historical_avg || 0),
    historicalMonths: row.historical_months || 0,
    currentMonthSpending: Number(row.current_month_spending || 0),
    currentDailyRate: Number(row.current_daily_rate || 0),
    predictedMonthTotal: Number(row.predicted_month_total || 0),
    trendDirection: row.trend_direction || 'unknown',
    daysIntoMonth: row.days_into_month || 0,
    calculatedAt: row.calculated_at?.toISOString() || new Date().toISOString(),
  }));
}

/**
 * 手动刷新预算建议
 * 基于历史数据计算每个分类的建议预算
 */
export async function refreshBudgetSuggestions(
  year: number,
  month: number
): Promise<number> {
  const now = new Date();
  const daysIntoMonth = now.getDate();
  const daysInMonth = new Date(year, month, 0).getDate();

  // 获取所有分类
  const categories = await prisma.categories.findMany({
    where: { is_active: true, type: 'expense' },
  });

  let count = 0;

  for (const category of categories) {
    // 获取过去6个月该分类的支出
    const historicalData: { month: number; total: number }[] = [];

    for (let i = 1; i <= 6; i++) {
      const targetDate = new Date(year, month - 1 - i, 1);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth() + 1;
      const startDate = new Date(targetYear, targetMonth - 1, 1);
      const endDate = new Date(targetYear, targetMonth, 1);

      const result = await prisma.transactions.aggregate({
        where: {
          deleted_at: null,
          type: 'expense',
          category: category.key,
          date: {
            gte: startDate,
            lt: endDate,
          },
        },
        _sum: { amount: true },
      });

      const total = Number(result._sum.amount || 0);
      if (total > 0) {
        historicalData.push({ month: targetMonth, total });
      }
    }

    if (historicalData.length === 0) continue;

    // 计算历史平均
    const historicalAvg = historicalData.reduce((sum, d) => sum + d.total, 0) / historicalData.length;

    // 获取当月已有支出
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);
    const currentResult = await prisma.transactions.aggregate({
      where: {
        deleted_at: null,
        type: 'expense',
        category: category.key,
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      _sum: { amount: true },
    });

    const currentMonthSpending = Number(currentResult._sum.amount || 0);
    const currentDailyRate = daysIntoMonth > 0 ? currentMonthSpending / daysIntoMonth : 0;
    const predictedMonthTotal = currentDailyRate * daysInMonth;

    // 计算趋势
    let trendDirection = 'stable';
    if (historicalData.length >= 2) {
      const recentAvg = historicalData.slice(0, 3).reduce((sum, d) => sum + d.total, 0) / Math.min(3, historicalData.length);
      const olderAvg = historicalData.slice(3).reduce((sum, d) => sum + d.total, 0) / Math.max(1, historicalData.length - 3);
      if (recentAvg > olderAvg * 1.1) trendDirection = 'increasing';
      else if (recentAvg < olderAvg * 0.9) trendDirection = 'decreasing';
    }

    // 计算建议金额
    const suggestedAmount = Math.max(predictedMonthTotal, historicalAvg) * 1.1; // 留10%余量

    // 计算置信度
    let confidenceLevel = 'low';
    if (historicalData.length >= 4) confidenceLevel = 'high';
    else if (historicalData.length >= 2) confidenceLevel = 'medium';

    // 生成原因
    const reason = `基于过去${historicalData.length}个月平均支出¥${historicalAvg.toFixed(0)}，本月预计¥${predictedMonthTotal.toFixed(0)}`;

    // 更新或创建建议
    await prisma.budget_suggestions.upsert({
      where: {
        id: (await prisma.budget_suggestions.findFirst({
          where: { category_key: category.key, year, month },
        }))?.id || '00000000-0000-0000-0000-000000000000',
      },
      update: {
        suggested_amount: suggestedAmount,
        confidence_level: confidenceLevel,
        reason,
        historical_avg: historicalAvg,
        historical_months: historicalData.length,
        current_month_spending: currentMonthSpending,
        current_daily_rate: currentDailyRate,
        predicted_month_total: predictedMonthTotal,
        trend_direction: trendDirection,
        days_into_month: daysIntoMonth,
        calculated_at: now,
        is_active: true,
      },
      create: {
        category_key: category.key,
        year,
        month,
        suggested_amount: suggestedAmount,
        confidence_level: confidenceLevel,
        reason,
        historical_avg: historicalAvg,
        historical_months: historicalData.length,
        current_month_spending: currentMonthSpending,
        current_daily_rate: currentDailyRate,
        predicted_month_total: predictedMonthTotal,
        trend_direction: trendDirection,
        days_into_month: daysIntoMonth,
        calculated_at: now,
        is_active: true,
      },
    });

    count++;
  }

  return count;
}

/**
 * 预测月底支出
 */
export async function predictMonthEndSpending(
  categoryKey: string,
  year: number,
  month: number,
  budgetAmount: number,
  currency: string = 'CNY'
): Promise<BudgetPrediction | null> {
  try {
    const now = new Date();
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysPassed = now.getDate();
    const daysRemaining = daysInMonth - daysPassed;

    // 计算当月已有支出
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const whereCondition: any = {
      deleted_at: null,
      type: 'expense',
      currency,
      date: {
        gte: startDate,
        lt: endDate,
      },
    };

    // 如果不是总预算，添加分类筛选
    if (categoryKey !== 'total' && categoryKey !== '') {
      whereCondition.category = categoryKey;
    }

    const result = await prisma.transactions.aggregate({
      where: whereCondition,
      _sum: { amount: true },
    });

    const currentSpending = Number(result._sum.amount || 0);
    const dailyRate = daysPassed > 0 ? currentSpending / daysPassed : 0;
    const predictedTotal = dailyRate * daysInMonth;
    const willExceedBudget = predictedTotal > budgetAmount;
    const predictedOverage = willExceedBudget ? predictedTotal - budgetAmount : undefined;

    return {
      current_spending: currentSpending,
      daily_rate: dailyRate,
      predicted_total: predictedTotal,
      days_passed: daysPassed,
      days_remaining: daysRemaining,
      will_exceed_budget: willExceedBudget,
      predicted_overage: predictedOverage,
    };
  } catch (error) {
    console.error('预测月底支出失败:', error);
    return null;
  }
}

/**
 * 计算预算使用状态标签
 */
export function getBudgetStatusLabel(status: BudgetStatus): {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
} {
  if (status.is_over_budget) {
    return {
      label: '超支',
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      icon: '⚠️',
    };
  }

  if (status.is_near_limit) {
    return {
      label: '接近上限',
      color: 'text-orange-700',
      bgColor: 'bg-orange-50',
      icon: '⚡',
    };
  }

  if (status.usage_percentage >= 50) {
    return {
      label: '进行中',
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      icon: '📊',
    };
  }

  return {
    label: '充足',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    icon: '✅',
  };
}

/**
 * 计算进度条颜色
 */
export function getProgressBarColor(percentage: number, isOverBudget: boolean): string {
  if (isOverBudget) return 'bg-red-500';
  if (percentage >= 80) return 'bg-orange-500';
  if (percentage >= 50) return 'bg-blue-500';
  return 'bg-green-500';
}
