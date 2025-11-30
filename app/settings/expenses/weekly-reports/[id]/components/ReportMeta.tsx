import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

interface ReportMetaProps {
  generatedAt: string | null | undefined;
  generationType: 'auto' | 'manual' | null | undefined;
}

export function ReportMeta({ generatedAt, generationType }: ReportMetaProps) {
  const formatDate = (date: string | null | undefined): string => {
    if (!date) return '未知';
    try {
      return new Date(date).toLocaleString('zh-CN');
    } catch {
      return '未知';
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>生成时间: {formatDate(generatedAt)}</span>
          </div>
          <div>
            生成方式: {generationType === 'auto' ? '自动生成' : '手动生成'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
