// 交易类型定义
export type Transaction = {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  currency?: string;
  note?: string;
  date: string;
  merchant?: string;
  subcategory?: string;
  product?: string;
  payment_method?: string;
};

export interface TransactionGroupedListProps {
  initialTransactions: Transaction[];
  className?: string;
  defaultExpandedDates?: Set<string>;
}

// 分层数据结构类型
export interface MerchantGroup {
  merchant: string;
  total: number;
  items: Transaction[];
}

export interface CategoryGroup {
  category: string;
  total: number;
  merchants: Record<string, MerchantGroup>;
}

export interface DateGroup {
  date: string;
  total: number;
  categories: Record<string, CategoryGroup>;
}

export type HierarchicalData = Record<string, DateGroup>;

// 构建分层数据结构
export function buildHierarchicalData(transactions: Transaction[]): HierarchicalData {
  const dateGroups: HierarchicalData = {};

  for (const transaction of transactions) {
    const date = transaction.date;
    const category = transaction.category || 'other';
    // 优先使用merchant，其次使用note，最后使用"无备注"
    const merchant = transaction.merchant || transaction.note || '无备注';
    const amount = Number(transaction.amount || 0);

    // 初始化日期分组
    if (!dateGroups[date]) {
      dateGroups[date] = { date, total: 0, categories: {} };
    }
    dateGroups[date].total += amount;

    // 初始化分类分组
    if (!dateGroups[date].categories[category]) {
      dateGroups[date].categories[category] = { category, total: 0, merchants: {} };
    }
    dateGroups[date].categories[category].total += amount;

    // 初始化商家分组
    if (!dateGroups[date].categories[category].merchants[merchant]) {
      dateGroups[date].categories[category].merchants[merchant] = { merchant, total: 0, items: [] };
    }
    dateGroups[date].categories[category].merchants[merchant].total += amount;
    dateGroups[date].categories[category].merchants[merchant].items.push(transaction);
  }

  return dateGroups;
}
