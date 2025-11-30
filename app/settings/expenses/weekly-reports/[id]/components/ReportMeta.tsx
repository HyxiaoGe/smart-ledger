import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

interface ReportMetaProps {
  generatedAt: string;
  generationType: 'auto' | 'manual';
}

export function ReportMeta({ generatedAt, generationType }: ReportMetaProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>生成时间: {new Date(generatedAt).toLocaleString('zh-CN')}</span>
          </div>
          <div>
            生成方式: {generationType === 'auto' ? '自动生成' : '手动生成'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
