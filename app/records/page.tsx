import nextDynamic from 'next/dynamic';
import { getTransactionRecordsPageViewData } from '@/lib/services/transactions.server';
import { TabsRangePicker } from '@/components/shared/TabsRangePicker';
import { CollapsibleTransactionList } from '@/components/features/transactions/TransactionList/CollapsibleList';
import { SkeletonBlock, SkeletonGrid } from '@/components/shared/Skeletons';
import { AIAnalysisButton } from '@/components/features/ai-analysis/AIAnalysisButton';

export const dynamic = 'force-dynamic';

const SummaryModule = nextDynamic(
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

const CategoryModule = nextDynamic(
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

  const { mainResult, yesterdayData, monthSummary, aiAnalysisData, monthlyBudget } =
    await getTransactionRecordsPageViewData(month, range, start, end);
  const { rows, monthLabel, dailyItems, expenseTransactions, totalCount } = mainResult;

  return (
    <>
      <div className="container space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">账单列表（{monthLabel}）</h1>
          <div className="flex items-center gap-4">
            <TabsRangePicker />
            <AIAnalysisButton
              dateRange={range}
              currentMonth={month}
              aiData={aiAnalysisData}
            />
          </div>
        </div>

        {/* 统计面板 - 所有范围都显示 */}
        <>
          <SummaryModule
            items={dailyItems}
            transactions={expenseTransactions}
            yesterdayTransactions={yesterdayData}
            monthTotalAmount={monthSummary.monthTotalAmount}
            monthTotalCount={monthSummary.monthTotalCount}
            monthlyBudget={monthlyBudget}
            currency={'CNY'}
            dateRange={monthLabel}
            rangeType={range}
          />

          <CategoryModule transactions={expenseTransactions} currency={'CNY'} />
        </>

        {/* 交易明细列表 - 带收纳功能 */}
        <CollapsibleTransactionList initialTransactions={rows} totalCount={totalCount} />
      </div>
    </>
  );
}
