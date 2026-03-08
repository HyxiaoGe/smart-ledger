import type { Transaction } from '@/types/domain/transaction';
import type { AIAnalysisData } from '@/lib/services/transaction/TransactionAnalyticsService';

export interface MonthlyExpenseSummaryProps {
  items: { date: string; total: number; count: number }[];
  transactions?: { amount: number; date: string; note?: string }[];
  yesterdayTransactions?: { amount: number; date: string; note?: string }[];
  monthTotalAmount?: number;
  monthTotalCount?: number;
  monthlyBudget?: number;
  currency: string;
  dateRange?: string;
  rangeType?: string;
}

export type CategoryStatisticTransaction = {
  type?: string | null;
  category?: string | null;
  amount: number;
  merchant?: string | null;
  subcategory?: string | null;
};

export interface CategoryStatisticsProps {
  transactions: CategoryStatisticTransaction[];
  currency: string;
}

export interface AIAnalysisButtonProps {
  dateRange?: string;
  currentMonth?: string;
  aiData?: AIAnalysisData;
}

export interface TransactionRecordsPageViewSlices {
  summaryView: MonthlyExpenseSummaryProps;
  categoryStatisticsView: CategoryStatisticsProps;
  aiAnalysisView: AIAnalysisButtonProps;
}

export interface TransactionRecordsViewContext {
  expenseTransactions: Transaction[];
  dailyItems: Array<{ date: string; total: number; count: number }>;
  yesterdayTransactions: Transaction[];
  monthTotalAmount: number;
  monthTotalCount: number;
  monthlyBudget: number;
  monthLabel: string;
  rangeType: string;
  currentMonth?: string;
  aiData: AIAnalysisData;
}
