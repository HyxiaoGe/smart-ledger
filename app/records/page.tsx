import dynamic from 'next/dynamic';
import { partitionExpenseTransactions } from '@/lib/records';
import {
  getCurrentMonthSummary,
  listTransactionsByRange,
  listYesterdayTransactions
} from '@/lib/services/transactions';
export const revalidate = 60;
import { RangePicker } from '@/components/RangePicker';
import { CollapsibleTransactionList } from '@/components/CollapsibleTransactionList';
import { SkeletonBlock, SkeletonGrid } from '@/components/Skeletons';

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
  () => import('@/components/CategoryStatistics').then((mod) => mod.CategoryStatistics),
  {
    loading: () => <SkeletonBlock className="h-96 rounded-xl" />
  }
);

export default async function RecordsPage({ searchParams }: { searchParams?: { month?: string; range?: string; start?: string; end?: string } }) {
  const month = searchParams?.month;
  const range = (searchParams?.range as string) || 'today';
  const start = searchParams?.start;
  const end = searchParams?.end;

  const [mainResult, yesterdayData, monthSummary] = await Promise.all([
    listTransactionsByRange(month, range, start, end).catch(() => ({ rows: [], monthLabel: '全部' })),
    listYesterdayTransactions(range).catch(() => []),
    getCurrentMonthSummary().catch(() => ({
      monthItems: [],
      monthTotalAmount: 0,
      monthTotalCount: 0
    }))
  ]);

  const rows = mainResult.rows;
  const monthLabel = mainResult.monthLabel;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">账单列表（{monthLabel}）</h1>
        <div className="flex items-center">
          <RangePicker />
        </div>
      </div>

      {/* 统计面板 - 所有范围都显示 */}
      {(() => {
        const { dailyItems: items, expenseTransactions } = partitionExpenseTransactions(rows as any[]);

        return (
          <>
            <SummaryModule
              items={items}
              transactions={expenseTransactions}
              yesterdayTransactions={yesterdayData}
              monthTotalAmount={monthSummary.monthTotalAmount}
              monthTotalCount={monthSummary.monthTotalCount}
              currency={'CNY'}
              dateRange={monthLabel}
              rangeType={range}
            />

            {/* 分类统计组件 */}
            <CategoryModule
              transactions={expenseTransactions}
              currency={'CNY'}
            />
          </>
        );
      })()}

      {/* 交易明细列表 - 带收纳功能 */}
      <CollapsibleTransactionList
        initialTransactions={rows as any}
        totalCount={rows.length}
      />
    </div>
  );
}
