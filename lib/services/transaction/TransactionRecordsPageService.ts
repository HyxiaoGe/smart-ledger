import { partitionExpenseTransactions } from '@/lib/domain/records';
import { getCurrentMonthlyBudgetAmount } from '@/lib/services/budgetService.server';
import type { Transaction } from '@/types/domain/transaction';
import type {
  TransactionRecordsPageViewSlices,
} from '@/lib/types/transactionViews';
import { TransactionAnalyticsService, type AIAnalysisData } from './TransactionAnalyticsService';
import {
  TransactionQueryService,
  type TransactionQueryResult,
} from './TransactionQueryService';
import {
  TransactionSummaryService,
  type MonthSummaryResult,
} from './TransactionSummaryService';

export interface TransactionRecordsPageData {
  mainResult: TransactionRecordsMainResult;
  yesterdayData: any[];
  monthSummary: MonthSummaryResult;
  aiAnalysisData: AIAnalysisData;
}

export interface TransactionRecordsPageViewData extends TransactionRecordsPageData {
  monthlyBudget: number;
  headerView: TransactionRecordsPageViewSlices['headerView'];
  summaryView: TransactionRecordsPageViewSlices['summaryView'];
  categoryStatisticsView: TransactionRecordsPageViewSlices['categoryStatisticsView'];
  listView: TransactionRecordsPageViewSlices['listView'];
}

export interface TransactionRecordsMainResult extends TransactionQueryResult {
  expenseTransactions: Transaction[];
  dailyItems: Array<{ date: string; total: number; count: number }>;
  totalCount: number;
}

const DEFAULT_RECORDS_CURRENCY = 'CNY';
const DEFAULT_MONTHLY_BUDGET = 5000;
const DEFAULT_RANGE = 'today';

export class TransactionRecordsPageService {
  constructor(
    private readonly queryService: TransactionQueryService,
    private readonly summaryService: TransactionSummaryService,
    private readonly analyticsService: TransactionAnalyticsService
  ) {}

  async getPageData(params: {
    month?: string;
    range?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<TransactionRecordsPageData> {
    const range = params.range || DEFAULT_RANGE;

    const [queryResult, yesterdayData, monthSummary, aiAnalysisData] = await Promise.all([
      this.queryService.listByRange(params.month, range, params.startDate, params.endDate),
      this.queryService.listYesterdayTransactions(range),
      this.summaryService.getCurrentMonthSummary(),
      this.analyticsService.getAIAnalysisData(params.month),
    ]);

    const { expenseTransactions, dailyItems } = partitionExpenseTransactions(
      queryResult.rows
    );

    const mainResult: TransactionRecordsMainResult = {
      ...queryResult,
      expenseTransactions,
      dailyItems,
      totalCount: queryResult.rows.length,
    };

    return {
      mainResult,
      yesterdayData,
      monthSummary,
      aiAnalysisData,
    };
  }

  async getPageViewData(params: {
    month?: string;
    range?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<TransactionRecordsPageViewData> {
    try {
      const [pageData, monthlyBudget] = await Promise.all([
        this.getPageData(params),
        getCurrentMonthlyBudgetAmount(),
      ]);

      return this.buildPageViewData(pageData, params, monthlyBudget);
    } catch {
      const emptyPageData = this.buildEmptyPageData();
      return this.buildPageViewData(emptyPageData, params, DEFAULT_MONTHLY_BUDGET);
    }
  }

  private buildPageViewData(
    pageData: TransactionRecordsPageData,
    params: {
      month?: string;
      range?: string;
      startDate?: string;
      endDate?: string;
    },
    monthlyBudget: number
  ): TransactionRecordsPageViewData {
    const rangeType = params.range || DEFAULT_RANGE;

    return {
      ...pageData,
      monthlyBudget,
      headerView: {
        title: `账单列表（${pageData.mainResult.monthLabel}）`,
        aiAnalysisButton: {
          dateRange: rangeType,
          currentMonth: params.month,
          aiData: pageData.aiAnalysisData,
        },
      },
      summaryView: {
        items: pageData.mainResult.dailyItems,
        transactions: pageData.mainResult.expenseTransactions,
        yesterdayTransactions: pageData.yesterdayData,
        monthTotalAmount: pageData.monthSummary.monthTotalAmount,
        monthTotalCount: pageData.monthSummary.monthTotalCount,
        monthlyBudget,
        currency: DEFAULT_RECORDS_CURRENCY,
        dateRange: pageData.mainResult.monthLabel,
        rangeType,
      },
      categoryStatisticsView: {
        transactions: pageData.mainResult.expenseTransactions,
        currency: DEFAULT_RECORDS_CURRENCY,
      },
      listView: {
        initialTransactions: pageData.mainResult.rows,
        totalCount: pageData.mainResult.totalCount,
      },
    };
  }

  private buildEmptyPageData(): TransactionRecordsPageData {
    return {
      mainResult: {
        rows: [],
        monthLabel: '全部',
        expenseTransactions: [],
        dailyItems: [],
        totalCount: 0,
      },
      yesterdayData: [],
      monthSummary: {
        monthItems: [],
        monthTotalAmount: 0,
        monthTotalCount: 0,
      },
      aiAnalysisData: {
        currentMonthFull: [],
        lastMonth: [],
        currentMonthTop20: [],
        currentMonthStr: '',
        lastMonthStr: '',
      },
    };
  }
}
