import { TabsRangePicker } from '@/components/shared/TabsRangePicker';
import { AIAnalysisButton } from '@/components/features/ai-analysis/AIAnalysisButton';
import type { TransactionRecordsPageViewSlices } from '@/lib/types/transactionViews';

interface RecordsPageHeaderProps {
  headerView: TransactionRecordsPageViewSlices['headerView'];
}

export function RecordsPageHeader({ headerView }: RecordsPageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-xl font-semibold">{headerView.title}</h1>
      <div className="flex items-center gap-4">
        <TabsRangePicker />
        <AIAnalysisButton {...headerView.aiAnalysisButton} />
      </div>
    </div>
  );
}
