'use client';

import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, List } from 'lucide-react';
import type { CategoryWithStats } from '@/types/dto/category.dto';

interface CollapsibleListControlsProps {
  isExpanded: boolean;
  displayCount: number;
  totalCount: number;
  currentRange: string;
  quickRanges: ReadonlyArray<{ key: string; label: string }>;
  commonCategories: CategoryWithStats[];
  activeCategory: string | null;
  onToggleExpanded: () => void;
  onSelectRange: (_rangeKey: string) => void;
  onSelectCategory: (_categoryKey: string | null) => void;
}

export function CollapsibleListControls({
  isExpanded,
  displayCount,
  totalCount,
  currentRange,
  quickRanges,
  commonCategories,
  activeCategory,
  onToggleExpanded,
  onSelectRange,
  onSelectCategory,
}: CollapsibleListControlsProps) {
  return (
    <>
      <div className="mb-5 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <List className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">明细筛选</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                共 {displayCount} 笔
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              先用快捷范围确认时间窗口，再用分类缩小范围，最后决定是否展开全部明细。
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onToggleExpanded}
            className="flex min-h-10 w-full items-center gap-2 rounded-2xl px-4 transition-colors duration-200 hover:bg-gray-50 sm:w-auto sm:rounded-full dark:hover:bg-gray-800"
          >
            <span className="text-sm">{isExpanded ? '收起明细' : '展开明细'}</span>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {totalCount > 0 && (
          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-2 text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                快捷范围
              </div>
              <div className="flex flex-wrap gap-2">
                {quickRanges.map((item) => (
                  <Button
                    key={item.key}
                    size="sm"
                    variant={currentRange === item.key ? 'default' : 'outline'}
                    className="min-h-9 rounded-xl sm:rounded-full"
                    onClick={() => onSelectRange(item.key)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
            {commonCategories.length > 0 && (
              <div>
                <div className="mb-2 text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  分类过滤
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={!activeCategory ? 'default' : 'outline'}
                    className="min-h-9 rounded-xl sm:rounded-full"
                    onClick={() => onSelectCategory(null)}
                  >
                    全部
                  </Button>
                  {commonCategories.map((item) => (
                    <Button
                      key={item.key}
                      size="sm"
                      variant={activeCategory === item.key ? 'default' : 'outline'}
                      className="min-h-9 rounded-xl sm:rounded-full"
                      onClick={() => onSelectCategory(item.key)}
                    >
                      {item.icon ? `${item.icon} ` : ''}
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
