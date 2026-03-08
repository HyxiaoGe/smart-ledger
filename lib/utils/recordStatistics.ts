type SummaryItem = { date: string; total: number; count: number };
type SummaryTransaction = { amount: number; date: string; note?: string };
type YesterdayTransaction = { amount: number; date: string; note?: string };

export type ExpenseTrend = {
  amountChange: number;
  amountChangePercent: number;
  countChange: number;
  yesterdayAmount: number;
  yesterdayCount: number;
} | null;

export interface MonthlyExpenseSummaryStats {
  totalAmount: number;
  totalCount: number;
  dailyAverage: number;
  maxTransactionAmount: number;
  minTransactionAmount: number;
  avgTransactionAmount: number;
  maxTransactionDate: string;
  maxTransactionNote: string;
  monthTotalAmount: number;
  monthTotalCount: number;
  monthProgress: number;
  trend: ExpenseTrend;
  intensityPerDay: number;
}

export function calculateMonthlyExpenseSummaryStats(params: {
  items?: SummaryItem[];
  transactions?: SummaryTransaction[];
  yesterdayTransactions?: YesterdayTransaction[];
  monthTotalAmount?: number;
  monthTotalCount?: number;
  monthlyBudget?: number;
  rangeType?: string;
}): MonthlyExpenseSummaryStats {
  const items = params.items || [];
  const transactions = params.transactions || [];
  const yesterdayTransactions = params.yesterdayTransactions || [];
  const monthTotalAmount = params.monthTotalAmount || 0;
  const monthTotalCount = params.monthTotalCount || 0;
  const monthlyBudget = params.monthlyBudget || 5000;

  if (items.length === 0) {
    return {
      totalAmount: 0,
      totalCount: 0,
      dailyAverage: 0,
      maxTransactionAmount: 0,
      minTransactionAmount: 0,
      avgTransactionAmount: 0,
      maxTransactionDate: '',
      maxTransactionNote: '',
      monthTotalAmount,
      monthTotalCount,
      monthProgress: Math.min((monthTotalAmount / monthlyBudget) * 100, 100),
      trend: null,
      intensityPerDay: 0,
    };
  }

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);
  const totalCount = items.reduce((sum, item) => sum + item.count, 0);

  let actualDays = items.length;
  if (items.length > 1) {
    const dates = items
      .map((item) => new Date(item.date))
      .sort((a, b) => a.getTime() - b.getTime());
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];
    actualDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  const dailyAverage = totalAmount / actualDays;
  const avgTransactionAmount = totalCount > 0 ? totalAmount / totalCount : 0;

  let maxTransactionAmount = 0;
  let minTransactionAmount = 0;
  let maxTransactionDate = '';
  let maxTransactionNote = '';

  if (transactions.length > 0) {
    const normalizedTransactions = transactions.map((tx) => ({
      ...tx,
      amount: Number(tx.amount || 0),
    }));
    const amounts = normalizedTransactions.map((tx) => tx.amount);
    maxTransactionAmount = Math.max(...amounts);
    minTransactionAmount = Math.min(...amounts);

    const maxTransaction = normalizedTransactions.reduce((max, tx) =>
      tx.amount > max.amount ? tx : max
    );

    maxTransactionDate = maxTransaction.date || '';
    maxTransactionNote = maxTransaction.note || '';
  }

  let trend: ExpenseTrend = null;
  if (params.rangeType === 'today' || params.rangeType === 'yesterday') {
    const yesterdayAmount = yesterdayTransactions.reduce(
      (sum, tx) => sum + Number(tx.amount || 0),
      0
    );
    const yesterdayCount = yesterdayTransactions.length;

    if (yesterdayAmount > 0 || totalAmount > 0) {
      const amountChange = totalAmount - yesterdayAmount;
      const amountChangePercent =
        yesterdayAmount > 0
          ? (amountChange / yesterdayAmount) * 100
          : totalAmount > 0
            ? 100
            : 0;

      trend = {
        amountChange,
        amountChangePercent,
        countChange: totalCount - yesterdayCount,
        yesterdayAmount,
        yesterdayCount,
      };
    }
  }

  return {
    totalAmount,
    totalCount,
    dailyAverage,
    maxTransactionAmount,
    minTransactionAmount,
    avgTransactionAmount,
    maxTransactionDate,
    maxTransactionNote,
    monthTotalAmount,
    monthTotalCount,
    monthProgress: Math.min((monthTotalAmount / monthlyBudget) * 100, 100),
    trend,
    intensityPerDay: items.length > 0 ? totalCount / items.length : 0,
  };
}

type CategoryStatisticTransaction = {
  type?: string | null;
  category?: string | null;
  amount: number;
  merchant?: string | null;
  subcategory?: string | null;
};

export type CategoryStatItem = {
  category: string;
  total: number;
  count: number;
  percentage: number;
};

export type MerchantSubcategoryStat = {
  name: string;
  total: number;
  count: number;
};

export type MerchantStatItem = {
  merchant: string;
  total: number;
  count: number;
  subcategories: MerchantSubcategoryStat[];
};

export function calculateCategoryStats(transactions: CategoryStatisticTransaction[]) {
  const stats = new Map<string, { total: number; count: number }>();
  let totalAmount = 0;

  for (const transaction of transactions) {
    if (transaction.type !== 'expense') continue;

    const category = transaction.category || 'other';
    const amount = Number(transaction.amount || 0);
    totalAmount += amount;

    const current = stats.get(category) || { total: 0, count: 0 };
    stats.set(category, {
      total: current.total + amount,
      count: current.count + 1,
    });
  }

  const sortedStats: CategoryStatItem[] = Array.from(stats.entries())
    .map(([category, data]) => ({
      category,
      total: data.total,
      count: data.count,
      percentage: totalAmount > 0 ? (data.total / totalAmount) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return { sortedStats, totalAmount };
}

export function calculateMerchantStatsByCategory(
  transactions: CategoryStatisticTransaction[]
) {
  const statsByCategory = new Map<
    string,
    Map<string, { total: number; count: number; subcategories: Map<string, { total: number; count: number }> }>
  >();

  for (const transaction of transactions) {
    if (transaction.type !== 'expense') continue;

    const category = transaction.category || 'other';
    const merchant = transaction.merchant || '未分类商家';
    const subcategory = transaction.subcategory;
    const amount = Number(transaction.amount || 0);

    if (!statsByCategory.has(category)) {
      statsByCategory.set(category, new Map());
    }
    const categoryMap = statsByCategory.get(category)!;

    if (!categoryMap.has(merchant)) {
      categoryMap.set(merchant, { total: 0, count: 0, subcategories: new Map() });
    }
    const merchantData = categoryMap.get(merchant)!;
    merchantData.total += amount;
    merchantData.count += 1;

    if (subcategory) {
      if (!merchantData.subcategories.has(subcategory)) {
        merchantData.subcategories.set(subcategory, { total: 0, count: 0 });
      }
      const subData = merchantData.subcategories.get(subcategory)!;
      subData.total += amount;
      subData.count += 1;
    }
  }

  const sortedStats = new Map<string, MerchantStatItem[]>();

  for (const [category, merchantMap] of statsByCategory.entries()) {
    const merchantArray = Array.from(merchantMap.entries())
      .map(([merchant, data]) => ({
        merchant,
        total: data.total,
        count: data.count,
        subcategories: Array.from(data.subcategories.entries())
          .map(([name, subData]) => ({
            name,
            total: subData.total,
            count: subData.count,
          }))
          .sort((a, b) => b.total - a.total),
      }))
      .sort((a, b) => b.total - a.total);

    sortedStats.set(category, merchantArray);
  }

  return sortedStats;
}
