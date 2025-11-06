import dynamic from 'next/dynamic';
import { partitionExpenseTransactions } from '@/lib/domain/records';
import {
  getCurrentMonthSummary,
  listTransactionsByRange,
  listYesterdayTransactions,
  getAIAnalysisData
} from '@/lib/services/transactions';
import { getTotalBudgetSummary, getCurrentYearMonth } from '@/lib/services/budgetService';
import { RangePicker } from '@/components/shared/RangePicker';
import { CollapsibleTransactionList } from '@/components/features/transactions/TransactionList/CollapsibleList';
import { SkeletonBlock, SkeletonGrid } from '@/components/shared/Skeletons';
import { AIAnalysisPanel } from '@/components/features/ai-analysis/AIAnalysisPanel';
import { AIAnalysisButton } from '@/components/features/ai-analysis/AIAnalysisButton';

const SummaryModule = dynamic(
  () => import('@/components/MonthlyExpenseSummary').then((mod) => mod.MonthlyExpenseSummary),
  {
    loading: () => (
      <SkeletonGrid
        count={2}
        className="grid gap-4 md:grid-cols-2"
        itemClassName="h-60 rounded-xl"
      />
    )
  }
);

const CategoryModule = dynamic(
  () => import('@/components/features/statistics/CategoryStatistics').then((mod) => mod.CategoryStatistics),
  {
    loading: () => <SkeletonBlock className="h-96 rounded-xl" />
  }
);

export default async function RecordsPage({
  searchParams
}: {
  searchParams?: { month?: string; range?: string; start?: string; end?: string };
}) {
  const month = searchParams?.month;
  const range = (searchParams?.range as string) || 'today';
  const start = searchParams?.start;
  const end = searchParams?.end;

  // 获取当前年月用于预算查询
  const { year, month: currentMonth } = getCurrentYearMonth();

  const [mainResult, yesterdayData, monthSummary, aiAnalysisData, budgetSummary] = await Promise.all([
    listTransactionsByRange(month, range, start, end).catch(() => ({
      rows: [],
      monthLabel: '全部'
    })),
    listYesterdayTransactions(range).catch(() => []),
    getCurrentMonthSummary().catch(() => ({
      monthItems: [],
      monthTotalAmount: 0,
      monthTotalCount: 0
    })),
    getAIAnalysisData(month).catch(() => ({
      currentMonthFull: [],
      lastMonth: [],
      currentMonthTop20: [],
      currentMonthStr: '',
      lastMonthStr: ''
    })),
    getTotalBudgetSummary(year, currentMonth).catch(() => null)
  ]);

  const rows = mainResult.rows;
  const monthLabel = mainResult.monthLabel;

  return (
    <>
      <div className="container space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">账单列表（{monthLabel}）</h1>
          <div className="flex items-center gap-4">
            <RangePicker />
            <AIAnalysisButton
              dateRange={range}
              currentMonth={month}
              aiData={aiAnalysisData}
            />
          </div>
        </div>

        {/* 统计面板 - 所有范围都显示 */}
        {(() => {
          const { dailyItems: items, expenseTransactions } = partitionExpenseTransactions(
            rows as any[]
          );

          // 从预算设置中获取总预算，如果没有设置则使用默认值 5000
          const monthlyBudget = budgetSummary?.total_budget || 5000;

          return (
            <>
              <SummaryModule
                items={items}
                transactions={expenseTransactions}
                yesterdayTransactions={yesterdayData}
                monthTotalAmount={monthSummary.monthTotalAmount}
                monthTotalCount={monthSummary.monthTotalCount}
                monthlyBudget={monthlyBudget}
                currency={'CNY'}
                dateRange={monthLabel}
                rangeType={range}
              />

              {/* 分类统计组件 */}
              <CategoryModule transactions={expenseTransactions} currency={'CNY'} />
            </>
          );
        })()}

        {/* 交易明细列表 - 带收纳功能 */}
        <CollapsibleTransactionList initialTransactions={rows as any} totalCount={rows.length} />
      </div>
    </>
  );
}
