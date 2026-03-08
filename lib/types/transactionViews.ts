import type { Transaction } from '@/types/domain/transaction';
import type { AIAnalysisData } from '@/lib/services/transaction/TransactionAnalyticsService';
import type { Currency } from '@/types/domain/transaction';

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
  headerView: {
    title: string;
    aiAnalysisButton: AIAnalysisButtonProps;
  };
  summaryView: MonthlyExpenseSummaryProps;
  categoryStatisticsView: CategoryStatisticsProps;
  listView: {
    initialTransactions: Transaction[];
    totalCount: number;
  };
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

export interface HomeStatsProps {
  rangeExpense: number;
  rangeCount: number;
  rangeDailyAvg: number;
  rangeLabel: string;
  prevRangeExpense: number;
  prevRangeLabel: string;
  currency: string;
  isSingleDay?: boolean;
  isToday?: boolean;
}

export interface ChartSummaryProps {
  trend: { name: string; expense: number }[];
  pie: { name: string; value: number }[];
  rangeLabel: string;
  currency: string;
}

export interface TopExpenseItem {
  id: string;
  category: string;
  amount: number;
  date?: string;
  note?: string;
  currency?: string;
  merchant?: string;
  subcategory?: string;
  product?: string;
}

export interface TopExpensesProps {
  items: TopExpenseItem[];
  currency: string;
}

export interface CalendarDayData {
  date: string;
  amount: number;
  count: number;
}

export interface CalendarHeatmapProps {
  data: CalendarDayData[];
  year: number;
  month: number;
  currency: string;
  onDayClick?: (date: string) => void;
}

export interface HomeDashboardViewSlices {
  toolbarView: {
    currencyLabel: string;
    rangeLabel: string;
    refreshingLabel: string;
  };
  sectionView: {
    chartsTitle: string;
    topExpensesTitle: string;
    aiHintText: string;
    aiHintLinkLabel: string;
    aiHintHref: string;
  };
  statsView: HomeStatsProps;
  chartSummaryView: ChartSummaryProps;
  topExpensesView: TopExpensesProps;
  calendarHeatmapView: Omit<CalendarHeatmapProps, 'onDayClick'>;
  currency: Currency | string;
}
