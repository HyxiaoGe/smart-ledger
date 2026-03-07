'use client';

import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface QuickModalActionBarProps {
  closeLabel?: string;
  detailLabel?: string;
  onClose: () => void;
  onDetailedEntry: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  refreshLabel?: string;
}

export function QuickModalActionBar({
  closeLabel = '关闭',
  detailLabel = '详细记账',
  onClose,
  onDetailedEntry,
  onRefresh,
  isLoading,
  refreshLabel = '刷新',
}: QuickModalActionBarProps) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isLoading}
        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
        {refreshLabel}
      </Button>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={onDetailedEntry}
          className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          {detailLabel}
        </Button>
        <Button
          variant="outline"
          onClick={onClose}
          className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          {closeLabel}
        </Button>
      </div>
    </div>
  );
}
