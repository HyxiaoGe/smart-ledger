/**
 * 交易分析服务
 * 负责为AI分析和预测提供数据支持
 */

import type { ITransactionRepository } from '@/lib/domain/repositories/ITransactionRepository';
import { CacheDecorator } from '@/lib/infrastructure/cache';
import type { ICache } from '@/lib/infrastructure/cache';

/**
 * AI分析数据
 */
export interface AIAnalysisData {
  currentMonthFull: any[];
  lastMonth: any[];
  currentMonthTop20: any[];
  currentMonthStr: string;
  lastMonthStr: string;
}

/**
 * 预测数据
 */
export interface PredictionData {
  monthlyData: MonthlyData[];
  categoryAnalysis: CategoryAnalysis[];
  overallStats: OverallStats;
  advancedAnalysis: AdvancedAnalysis;
}

interface MonthlyData {
  month: string;
  transactions: any[];
  totalAmount: number;
  transactionCount: number;
}

interface CategoryAnalysis {
  category: string;
  totalTransactions: number;
  avgAmount: number;
  maxAmount: number;
  minAmount: number;
  monthlyAmounts: Record<string, number>;
  trend: number;
}

interface OverallStats {
  totalMonths: number;
  totalTransactions: number;
  avgMonthlySpending: number;
  dataQuality: {
    sufficientData: boolean;
    consistentData: boolean;
    recentDataAvailable: boolean;
    dataRichness: boolean;
  };
}

interface AdvancedAnalysis {
  spendingPatterns: any;
  seasonalPatterns: any;
  timeDistribution: any;
}

/**
 * 交易分析服务
 */
export class TransactionAnalyticsService {
  private cacheDecorator: CacheDecorator;

  constructor(
    private readonly repository: ITransactionRepository,
    cache: ICache
  ) {
    this.cacheDecorator = new CacheDecorator(cache, {
      ttl: 300 * 1000, // 5分钟
      tags: ['transactions', 'analytics'],
      debug: false
    });
  }

  /**
   * 获取AI分析所需数据
   */
  async getAIAnalysisData(targetMonth?: string): Promise<AIAnalysisData> {
    const today = new Date();
    const currentMonth = targetMonth || today.toISOString().slice(0, 7);

    const cacheKey = `analytics:ai-analysis:${currentMonth}`;

    return this.cacheDecorator.wrap(
      cacheKey,
      async () => {
        // 计算日期范围
        const currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
        if (targetMonth) {
          const [year, month] = targetMonth.split('-').map(Number);
          currentDate.setFullYear(year, month - 1, 1);
        }

        const currentYear = currentDate.getFullYear();
        const currentMonthNum = currentDate.getMonth() + 1;

        // 计算上个月
        const lastMonthNum = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
        const lastYear = currentMonthNum === 1 ? currentYear - 1 : currentYear;

        const currentMonthStr = this.formatMonth(currentYear, currentMonthNum);
        const lastMonthStr = this.formatMonth(lastYear, lastMonthNum);

        // 并行查询所需数据
        const [currentMonthFull, lastMonth, currentMonthTop20] = await Promise.all([
          // 当前月完整数据
          this.repository.findMany(
            {
              type: 'expense',
              startDate: `${currentMonthStr}-01`,
              endDate: this.getMonthEnd(currentYear, currentMonthNum)
            },
            { field: 'date', order: 'desc' }
          ),

          // 上个月数据
          this.repository.findMany(
            {
              type: 'expense',
              startDate: `${lastMonthStr}-01`,
              endDate: `${currentMonthStr}-01`
            },
            { field: 'date', order: 'desc' }
          ),

          // 当前月高金额数据
          this.repository.findMany(
            {
              type: 'expense',
              startDate: `${currentMonthStr}-01`,
              endDate: this.getMonthEnd(currentYear, currentMonthNum)
            },
            { field: 'amount', order: 'desc' },
            { page: 1, pageSize: 20 }
          )
        ]);

        return {
          currentMonthFull: currentMonthFull.data,
          lastMonth: lastMonth.data,
          currentMonthTop20: currentMonthTop20.data,
          currentMonthStr,
          lastMonthStr
        };
      },
      { ttl: 300 * 1000 }
    );
  }

  /**
   * 获取预测数据
   */
  async getPredictionData(monthsToAnalyze: number = 6): Promise<PredictionData> {
    const currentDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const currentMonth = currentDate.toISOString().slice(0, 7);

    const cacheKey = `analytics:prediction:${monthsToAnalyze}:${currentMonth}`;

    return this.cacheDecorator.wrap(
      cacheKey,
      async () => {
        // 生成要分析的月份数组
        const monthsData: MonthlyData[] = [];

        for (let i = 0; i < monthsToAnalyze; i++) {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
          const year = date.getFullYear();
          const month = date.getMonth() + 1;
          const monthStr = this.formatMonth(year, month);

          const start = `${monthStr}-01`;
          const end = this.getMonthEnd(year, month);

          const transactions = await this.repository.findByDateRange(start, end, 'expense');

          monthsData.push({
            month: monthStr,
            transactions,
            totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
            transactionCount: transactions.length
          });
        }

        // 分析整体趋势和模式
        const allTransactions = monthsData.flatMap((m) => m.transactions);

        // 按类别聚合数据
        const categoryAnalysis = this.analyzeCategoryData(allTransactions, monthsData);

        // 高级分析
        const spendingPatterns = this.analyzeSpendingPatterns(allTransactions);
        const seasonalPatterns = this.analyzeSeasonalPatterns(monthsData);
        const timeDistribution = this.analyzeTimeDistribution(allTransactions);

        return {
          monthlyData: monthsData,
          categoryAnalysis,
          overallStats: {
            totalMonths: monthsData.length,
            totalTransactions: allTransactions.length,
            avgMonthlySpending:
              Math.round(
                (monthsData.reduce((sum, m) => sum + m.totalAmount, 0) / monthsData.length) * 100
              ) / 100,
            dataQuality: {
              sufficientData: monthsData.length >= 3,
              consistentData: monthsData.every((m) => m.transactionCount > 0),
              recentDataAvailable: monthsData[0]?.transactionCount > 0,
              dataRichness: allTransactions.length >= 50
            }
          },
          advancedAnalysis: {
            spendingPatterns,
            seasonalPatterns,
            timeDistribution
          }
        };
      },
      { ttl: 1800 * 1000 } // 30分钟缓存
    );
  }

  /**
   * 分析类别数据
   */
  private analyzeCategoryData(allTransactions: any[], monthsData: MonthlyData[]): CategoryAnalysis[] {
    const categoryData: Record<string, any[]> = {};

    allTransactions.forEach((t) => {
      if (!categoryData[t.category]) {
        categoryData[t.category] = [];
      }
      categoryData[t.category].push({
        amount: t.amount,
        date: t.date,
        month: t.date.slice(0, 7)
      });
    });

    return Object.entries(categoryData).map(([category, transactions]) => {
      const monthlyAmounts: Record<string, number> = {};
      transactions.forEach((t) => {
        if (!monthlyAmounts[t.month]) {
          monthlyAmounts[t.month] = 0;
        }
        monthlyAmounts[t.month] += t.amount;
      });

      const amounts = Object.values(monthlyAmounts);
      const avgAmount = amounts.length > 0 ? amounts.reduce((sum, a) => sum + a, 0) / amounts.length : 0;

      return {
        category,
        totalTransactions: transactions.length,
        avgAmount: Math.round(avgAmount * 100) / 100,
        maxAmount: amounts.length > 0 ? Math.max(...amounts) : 0,
        minAmount: amounts.length > 0 ? Math.min(...amounts) : 0,
        monthlyAmounts,
        trend:
          amounts.length >= 2 ? ((amounts[amounts.length - 1] - amounts[0]) / amounts[0]) * 100 : 0
      };
    });
  }

  /**
   * 分析支出模式
   */
  private analyzeSpendingPatterns(transactions: any[]) {
    if (!transactions || transactions.length === 0) {
      return { frequency: 0, avgAmount: 0, regularityScore: 0 };
    }

    const dailySpending: Record<string, { count: number; amount: number }> = {};
    transactions.forEach((t) => {
      const date = t.date.split('T')[0];
      if (!dailySpending[date]) {
        dailySpending[date] = { count: 0, amount: 0 };
      }
      dailySpending[date].count++;
      dailySpending[date].amount += t.amount;
    });

    const daysWithSpending = Object.keys(dailySpending).length;
    const avgAmount = transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length;

    return {
      frequency: Math.round((daysWithSpending / 30) * 100) / 100,
      avgAmount: Math.round(avgAmount * 100) / 100,
      spendingDays: daysWithSpending
    };
  }

  /**
   * 分析季节性模式
   */
  private analyzeSeasonalPatterns(monthlyData: MonthlyData[]) {
    if (!monthlyData || monthlyData.length < 3) {
      return { seasonality: 'low', quarterlyTrends: [], monthlyVariation: 0 };
    }

    const amounts = monthlyData.map((m) => m.totalAmount);
    const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const stdDev = Math.sqrt(
      amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length
    );
    const monthlyVariation = stdDev / mean;

    let seasonality = 'low';
    if (monthlyVariation > 0.3) {
      seasonality = 'high';
    } else if (monthlyVariation > 0.15) {
      seasonality = 'medium';
    }

    return {
      seasonality,
      monthlyVariation: Math.round(monthlyVariation * 100) / 100
    };
  }

  /**
   * 分析时间分布
   */
  private analyzeTimeDistribution(transactions: any[]) {
    if (!transactions || transactions.length === 0) {
      return { peakHours: [], peakDays: [], timePreference: 'none' };
    }

    const dayOfWeekDistribution: Record<number, number> = {};

    transactions.forEach((t) => {
      try {
        const date = new Date(t.date);
        const dayOfWeek = date.getDay();
        dayOfWeekDistribution[dayOfWeek] = (dayOfWeekDistribution[dayOfWeek] || 0) + 1;
      } catch (error) {
        // 忽略无效日期
      }
    });

    const weekdayTotal = [1, 2, 3, 4, 5].reduce(
      (sum, day) => sum + (dayOfWeekDistribution[day] || 0),
      0
    );
    const weekendTotal = [0, 6].reduce((sum, day) => sum + (dayOfWeekDistribution[day] || 0), 0);

    let timePreference = 'balanced';
    if (weekdayTotal > weekendTotal * 1.5) {
      timePreference = 'weekday';
    } else if (weekendTotal > weekdayTotal * 1.5) {
      timePreference = 'weekend';
    }

    return {
      timePreference,
      dayOfWeekDistribution
    };
  }

  /**
   * 格式化月份
   */
  private formatMonth(year: number, month: number): string {
    return `${year}-${month.toString().padStart(2, '0')}`;
  }

  /**
   * 获取月末日期
   */
  private getMonthEnd(year: number, month: number): string {
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    return `${endYear}-${endMonth.toString().padStart(2, '0')}-01`;
  }

  /**
   * 清空分析缓存
   */
  clearCache(): void {
    this.cacheDecorator.invalidateByTag('analytics');
  }
}
