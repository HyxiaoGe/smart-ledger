import nextDynamic from 'next/dynamic';
import { CollapsibleTransactionList } from '@/components/features/transactions/TransactionList/CollapsibleList';
import { SkeletonBlock, SkeletonGrid } from '@/components/shared/Skeletons';
import type { TransactionRecordsPageViewData } from '@/lib/services/transaction/index.server';
import { RecordsPageHeader } from './RecordsPageHeader';
import { SectionIntro } from '@/components/shared/SectionIntro';
import { RecordsPageSyncBridge } from './RecordsPageSyncBridge';

const SummaryModule = nextDynamic(
  () => import('@/components/MonthlyExpenseSummary').then((mod) => mod.MonthlyExpenseSummary),
  {
    loading: () => (
      <SkeletonGrid
        count={2}
        className="grid gap-4 md:grid-cols-2"
        itemClassName="h-60 rounded-xl"
      />
    ),
  }
);

const CategoryModule = nextDynamic(
  () =>
    import('@/components/features/statistics/CategoryStatistics').then(
      (mod) => mod.CategoryStatistics
    ),
  {
    loading: () => <SkeletonBlock className="h-96 rounded-xl" />,
  }
);

interface RecordsPageContentProps {
  viewData: TransactionRecordsPageViewData;
}

export function RecordsPageContent({
  viewData: { headerView, summaryView, categoryStatisticsView, listView },
}: RecordsPageContentProps) {
  return (
    <div className="container space-y-8">
      <RecordsPageSyncBridge />
      <RecordsPageHeader headerView={headerView} />

      <section className="space-y-3">
        <SectionIntro
          eyebrow="概览"
          title="本期概览"
          description="先确认总额、笔数和预算关系，再决定是否需要下钻。"
        />
        <SummaryModule {...summaryView} />
      </section>

      <section className="space-y-3">
        <SectionIntro
          eyebrow="结构"
          title="结构分析"
          description="用分类和商户分布判断变化是结构性问题，还是个别大额支出造成。"
        />
        <CategoryModule {...categoryStatisticsView} />
      </section>

      <section className="space-y-3">
        <SectionIntro
          eyebrow="明细"
          title="账单明细"
          description="这里更适合做纠错和定位。先用快捷范围和分类过滤，再展开看具体记录。"
        />
        <CollapsibleTransactionList {...listView} />
      </section>
    </div>
  );
}
