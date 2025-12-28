/**
 * 预算服务 - 服务端版本
 * 使用 Prisma 替代 Supabase，用于 API 路由和 Server Components
 * 带缓存支持，减少数据库查询
 */

import { prisma } from '@/lib/clients/db/prisma';
import { getBudgetRepository, getTransactionRepository, getCategoryRepository } from '@/lib/infrastructure/repositories/index.server';
import { CacheDecorator, memoryCache } from '@/lib/infrastructure/cache';

// 创建缓存装饰器实例
const cacheDecorator = new CacheDecorator(memoryCache, {
  ttl: 60 * 1000, // 60秒缓存（预算数据变化较频繁）
  tags: ['budgets'],
  debug: false,
});

/**
 * 失效预算缓存
 */
function invalidateBudgetCache(): void {
  cacheDecorator.invalidateByTag('budgets');
}

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
    invalidateBudgetCache();
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
    invalidateBudgetCache();
    return created.id;
  }
}

/**
 * 获取本月预算执行情况（带缓存）
 */
export async function getMonthlyBudgetStatus(
  year: number,
  month: number
): Promise<BudgetStatus[]> {
  const cacheKey = `budgets:status:${year}-${month}`;
  return cacheDecorator.wrap(cacheKey, () => getMonthlyBudgetStatusInternal(year, month));
}

/**
 * 获取本月预算执行情况（内部实现）
 */
async function getMonthlyBudgetStatusInternal(
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
  type CategoryInfo = { key: string; label: string; icon: string | null; color: string | null };
  const categoryMap = new Map<string, CategoryInfo>(categories.map((c: CategoryInfo) => [c.key, c]));

  // 3. 计算本月日期范围
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  // 4. 获取本月所有交易的分类支出汇总（排除固定支出，预算只监控可控消费）
  const transactions = await prisma.transactions.findMany({
    where: {
      deleted_at: null,
      type: 'expense',
      date: {
        gte: startDate,
        lt: endDate,
      },
      // 排除固定支出：预算应只监控用户可控的日常消费
      recurring_expense_id: null,
      OR: [
        { is_auto_generated: false },
        { is_auto_generated: null },
      ],
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
 * 直接查询本月实际支出（排除固定支出）
 */
export async function getMonthlyActualExpense(
  year: number,
  month: number,
  currency: string = 'CNY'
): Promise<number> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  // 排除固定支出，只统计可控消费
  const transactions = await prisma.transactions.findMany({
    where: {
      deleted_at: null,
      type: 'expense',
      currency,
      date: {
        gte: startDate,
        lt: endDate,
      },
      recurring_expense_id: null,
      OR: [
        { is_auto_generated: false },
        { is_auto_generated: null },
      ],
    },
    select: {
      amount: true,
    },
  });

  return transactions.reduce((sum: number, tx: { amount: unknown }) => sum + Number(tx.amount), 0);
}

/**
 * 获取总预算汇总
 * 优化：复用 getMonthlyBudgetStatus 的结果，避免重复查询
 * 修复：即使没有设置总预算，也应返回实际支出数据
 */
export async function getTotalBudgetSummary(
  year: number,
  month: number,
  currency: string = 'CNY'
): Promise<TotalBudgetSummary> {
  // 直接调用 getMonthlyBudgetStatus，它已经包含了所有需要的数据
  const budgetStatuses = await getMonthlyBudgetStatus(year, month);

  // 从状态中提取汇总数据
  const totalBudgetStatus = budgetStatuses.find(b => b.category_key === null);
  const categoryStatuses = budgetStatuses.filter(b => b.category_key !== null);

  const totalBudget = totalBudgetStatus?.budget_amount || 0;

  // 修复：如果没有总预算记录，直接查询实际支出
  let totalSpent = totalBudgetStatus?.spent_amount || 0;
  if (!totalBudgetStatus) {
    totalSpent = await getMonthlyActualExpense(year, month, currency);
  }

  const totalRemaining = totalBudget - totalSpent;
  const usagePercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const overBudgetCount = categoryStatuses.filter(b => b.is_over_budget).length;
  const nearLimitCount = categoryStatuses.filter(b => b.is_near_limit && !b.is_over_budget).length;

  return {
    total_budget: totalBudget,
    total_spent: totalSpent,
    total_remaining: totalRemaining,
    usage_percentage: usagePercentage,
    category_budgets_count: categoryStatuses.length,
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
    invalidateBudgetCache();
    return true;
  } catch (error) {
    console.error('删除预算失败:', error);
    return false;
  }
}

/**
 * 获取预算历史数据
 * 优化：原来12次循环查询 → 2次批量查询
 */
export async function getBudgetHistory(
  categoryKey: string | null = null,
  months: number = 6
): Promise<BudgetHistory[]> {
  const now = new Date();

  // 计算日期范围
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  // 生成要查询的年月列表
  const monthsList: { year: number; month: number }[] = [];
  for (let i = 0; i < months; i++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthsList.push({
      year: targetDate.getFullYear(),
      month: targetDate.getMonth() + 1,
    });
  }

  // 批量查询1：获取所有月份的预算
  const budgets = await prisma.budgets.findMany({
    where: {
      is_active: true,
      category_key: categoryKey,
      OR: monthsList.map(({ year, month }) => ({ year, month })),
    },
  });

  // 构建预算映射
  const budgetMap = new Map<string, typeof budgets[0]>();
  for (const budget of budgets) {
    budgetMap.set(`${budget.year}-${budget.month}`, budget);
  }

  // 批量查询2：获取所有月份的支出（排除固定支出）
  const whereCondition: any = {
    deleted_at: null,
    type: 'expense',
    date: {
      gte: startDate,
      lt: endDate,
    },
    // 排除固定支出
    recurring_expense_id: null,
    OR: [
      { is_auto_generated: false },
      { is_auto_generated: null },
    ],
  };

  if (categoryKey !== null) {
    whereCondition.category = categoryKey;
  }

  const transactions = await prisma.transactions.findMany({
    where: whereCondition,
    select: {
      date: true,
      amount: true,
    },
  });

  // 按月份汇总支出
  const spendingByMonth = new Map<string, number>();
  for (const tx of transactions) {
    const txDate = new Date(tx.date);
    const key = `${txDate.getFullYear()}-${txDate.getMonth() + 1}`;
    spendingByMonth.set(key, (spendingByMonth.get(key) || 0) + Number(tx.amount));
  }

  // 构建结果
  const result: BudgetHistory[] = [];
  for (const { year, month } of monthsList) {
    const budget = budgetMap.get(`${year}-${month}`);
    if (!budget) continue;

    const budgetAmount = Number(budget.amount);
    const spentAmount = spendingByMonth.get(`${year}-${month}`) || 0;
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
 * 修复：实时查询当月支出，而不是使用表中的静态数据
 */
export async function getBudgetSuggestions(
  year: number,
  month: number
): Promise<BudgetSuggestion[]> {
  // 获取预算建议数据
  const data = await prisma.budget_suggestions.findMany({
    where: {
      year,
      month,
      is_active: true,
    },
    orderBy: { calculated_at: 'desc' },
  });

  if (data.length === 0) {
    return [];
  }

  // 实时查询当月各分类的实际支出（排除固定支出）
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);
  const now = new Date();
  const daysIntoMonth = now.getDate();
  const daysInMonth = new Date(year, month, 0).getDate();

  const transactions = await prisma.transactions.findMany({
    where: {
      deleted_at: null,
      type: 'expense',
      date: {
        gte: startDate,
        lt: endDate,
      },
      // 排除固定支出
      recurring_expense_id: null,
      OR: [
        { is_auto_generated: false },
        { is_auto_generated: null },
      ],
    },
    select: {
      category: true,
      amount: true,
    },
  });

  // 按分类汇总当月支出
  const spendingByCategory: Record<string, number> = {};
  for (const tx of transactions) {
    spendingByCategory[tx.category] = (spendingByCategory[tx.category] || 0) + Number(tx.amount);
  }

  type SuggestionRow = { category_key: string | null; suggested_amount: unknown; confidence_level: string; reason: string; historical_avg: unknown; historical_months: number | null; trend_direction: string | null; calculated_at: Date | null };
  return data.map((row: SuggestionRow) => {
    const categoryKey = row.category_key || '';
    // 使用实时计算的当月支出
    const currentMonthSpending = spendingByCategory[categoryKey] || 0;
    // 重新计算日均和预测
    const currentDailyRate = daysIntoMonth > 0 ? currentMonthSpending / daysIntoMonth : 0;
    const predictedMonthTotal = currentDailyRate * daysInMonth;

    return {
      categoryKey,
      suggestedAmount: Number(row.suggested_amount),
      confidenceLevel: row.confidence_level,
      reason: row.reason,
      historicalAvg: Number(row.historical_avg || 0),
      historicalMonths: row.historical_months || 0,
      currentMonthSpending,
      currentDailyRate,
      predictedMonthTotal,
      trendDirection: row.trend_direction || 'unknown',
      daysIntoMonth,
      calculatedAt: row.calculated_at?.toISOString() || new Date().toISOString(),
    };
  });
}

/**
 * 手动刷新预算建议
 * 基于历史数据计算每个分类的建议预算
 * 优化：原来 N*7 次查询 → 2次批量查询
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

  if (categories.length === 0) return 0;

  // 计算日期范围：过去6个月 + 当月
  const historicalStartDate = new Date(year, month - 7, 1);
  const currentMonthEnd = new Date(year, month, 1);

  // 批量查询：一次获取所有分类过去7个月的支出（排除固定支出）
  const transactions = await prisma.transactions.findMany({
    where: {
      deleted_at: null,
      type: 'expense',
      date: {
        gte: historicalStartDate,
        lt: currentMonthEnd,
      },
      // 排除固定支出：预算建议基于可控消费的历史数据
      recurring_expense_id: null,
      OR: [
        { is_auto_generated: false },
        { is_auto_generated: null },
      ],
    },
    select: {
      category: true,
      amount: true,
      date: true,
    },
  });

  // 按分类和月份汇总
  const spendingMap = new Map<string, Map<string, number>>();
  for (const tx of transactions) {
    const txDate = new Date(tx.date);
    const monthKey = `${txDate.getFullYear()}-${txDate.getMonth() + 1}`;

    if (!spendingMap.has(tx.category)) {
      spendingMap.set(tx.category, new Map());
    }
    const categoryMap = spendingMap.get(tx.category)!;
    categoryMap.set(monthKey, (categoryMap.get(monthKey) || 0) + Number(tx.amount));
  }

  // 获取现有建议（用于 upsert）
  const existingSuggestions = await prisma.budget_suggestions.findMany({
    where: { year, month },
    select: { id: true, category_key: true },
  });
  const existingMap = new Map(existingSuggestions.map((s: { id: string; category_key: string | null }) => [s.category_key, s.id]));

  let count = 0;
  const currentMonthKey = `${year}-${month}`;

  for (const category of categories) {
    const categorySpending = spendingMap.get(category.key);

    // 构建历史数据（过去6个月）
    const historicalData: { month: number; total: number }[] = [];
    for (let i = 1; i <= 6; i++) {
      const targetDate = new Date(year, month - 1 - i, 1);
      const monthKey = `${targetDate.getFullYear()}-${targetDate.getMonth() + 1}`;
      const total = categorySpending?.get(monthKey) || 0;
      if (total > 0) {
        historicalData.push({ month: targetDate.getMonth() + 1, total });
      }
    }

    if (historicalData.length === 0) continue;

    // 计算历史平均
    const historicalAvg =
      historicalData.reduce((sum: number, d: { total: number }) => sum + d.total, 0) /
      historicalData.length;

    // 当月支出
    const currentMonthSpending = categorySpending?.get(currentMonthKey) || 0;
    const currentDailyRate = daysIntoMonth > 0 ? currentMonthSpending / daysIntoMonth : 0;
    const predictedMonthTotal = currentDailyRate * daysInMonth;

    // 计算趋势
    let trendDirection = 'stable';
    if (historicalData.length >= 2) {
      const recentAvg =
        historicalData
          .slice(0, 3)
          .reduce((sum: number, d: { total: number }) => sum + d.total, 0) /
        Math.min(3, historicalData.length);
      const olderAvg =
        historicalData
          .slice(3)
          .reduce((sum: number, d: { total: number }) => sum + d.total, 0) /
        Math.max(1, historicalData.length - 3);
      if (recentAvg > olderAvg * 1.1) trendDirection = 'increasing';
      else if (recentAvg < olderAvg * 0.9) trendDirection = 'decreasing';
    }

    // 计算建议金额和置信度
    const suggestedAmount = Math.max(predictedMonthTotal, historicalAvg) * 1.1;
    const confidenceLevel = historicalData.length >= 4 ? 'high' : historicalData.length >= 2 ? 'medium' : 'low';
    const reason = `基于过去${historicalData.length}个月平均支出¥${historicalAvg.toFixed(0)}，本月预计¥${predictedMonthTotal.toFixed(0)}`;

    // Upsert 建议
    const existingId = existingMap.get(category.key);
    if (existingId) {
      await prisma.budget_suggestions.update({
        where: { id: existingId },
        data: {
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
    } else {
      await prisma.budget_suggestions.create({
        data: {
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
    }

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

    // 计算当月已有支出（排除固定支出）
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
      // 排除固定支出
      recurring_expense_id: null,
      OR: [
        { is_auto_generated: false },
        { is_auto_generated: null },
      ],
    };

    // 如果不是总预算，添加分类筛选
    if (categoryKey !== 'total' && categoryKey !== '') {
      whereCondition.category = categoryKey;
    }

    const transactions = await prisma.transactions.findMany({
      where: whereCondition,
      select: { amount: true },
    });

    const currentSpending = transactions.reduce(
      (sum: number, tx: { amount: unknown }) => sum + Number(tx.amount),
      0
    );
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
