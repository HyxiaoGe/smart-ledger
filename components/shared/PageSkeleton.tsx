import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface PageSkeletonProps {
  showBackButton?: boolean;
  title?: { width?: string };
  subtitle?: { width?: string };
  stats?: number;
  listItems?: number;
  listColumns?: 1 | 2 | 3;
}

export function PageSkeleton({
  showBackButton = true,
  title = { width: 'w-40' },
  subtitle = { width: 'w-96' },
  stats = 3,
  listItems = 4,
  listColumns = 2,
}: PageSkeletonProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 lg:grid-cols-3',
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回按钮骨架 */}
        {showBackButton && (
          <div className="mb-6">
            <Skeleton className="h-10 w-32" />
          </div>
        )}

        {/* 标题骨架 */}
        <div className="mb-8">
          <Skeleton className={`h-8 ${title.width} mb-2`} />
          <Skeleton className={`h-4 ${subtitle.width}`} />
        </div>

        {/* 统计卡片骨架 */}
        {stats > 0 && (
          <div className={`grid ${
            stats === 1 ? 'grid-cols-1' :
            stats === 2 ? 'grid-cols-1 md:grid-cols-2' :
            stats === 3 ? 'grid-cols-1 md:grid-cols-3' :
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
          } gap-4 mb-8`}>
            {Array.from({ length: stats }).map((_, i) => (
              <Card key={i} className="border-0 shadow-md">
                <CardContent className="pt-6">
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 列表骨架 */}
        {listItems > 0 && (
          <Card className="border-0 shadow-md">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className={`grid ${gridCols[listColumns]} gap-4`}>
                {Array.from({ length: listItems }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
