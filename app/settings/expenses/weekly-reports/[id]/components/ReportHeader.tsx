import { getWeekDescription, formatWeekRange } from '../utils';

interface ReportHeaderProps {
  weekStartDate: string;
  weekEndDate: string;
  generationType: 'auto' | 'manual';
}

export function ReportHeader({ weekStartDate, weekEndDate, generationType }: ReportHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {getWeekDescription(weekStartDate)}
        </h2>
        <span className="text-lg text-gray-500 dark:text-gray-400">
          {formatWeekRange(weekStartDate, weekEndDate)}
        </span>
        {generationType === 'manual' && (
          <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
            手动生成
          </span>
        )}
      </div>
      <p className="text-gray-600 dark:text-gray-300">
        本周消费数据分析与洞察
      </p>
    </div>
  );
}
