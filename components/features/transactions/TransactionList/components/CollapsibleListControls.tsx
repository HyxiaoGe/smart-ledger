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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <List className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">账单明细</h3>
          <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
            共 {displayCount} 笔
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onToggleExpanded}
          className="flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
        >
          <span className="text-sm">{isExpanded ? '收起明细' : '展开明细'}</span>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {totalCount > 0 && (
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {quickRanges.map((item) => (
              <Button
                key={item.key}
                size="sm"
                variant={currentRange === item.key ? 'default' : 'outline'}
                onClick={() => onSelectRange(item.key)}
              >
                {item.label}
              </Button>
            ))}
          </div>
          {commonCategories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={!activeCategory ? 'default' : 'outline'}
                onClick={() => onSelectCategory(null)}
              >
                全部
              </Button>
              {commonCategories.map((item) => (
                <Button
                  key={item.key}
                  size="sm"
                  variant={activeCategory === item.key ? 'default' : 'outline'}
                  onClick={() => onSelectCategory(item.key)}
                >
                  {item.icon ? `${item.icon} ` : ''}
                  {item.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
