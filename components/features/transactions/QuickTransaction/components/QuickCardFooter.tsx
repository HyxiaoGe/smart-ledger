'use client';

import { QuickModalActionBar } from './QuickModalActionBar';

interface QuickCardFooterProps {
  onClose: () => void;
  onDetailedEntry: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function QuickCardFooter({
  onClose,
  onDetailedEntry,
  onRefresh,
  isLoading,
}: QuickCardFooterProps) {
  return (
    <>
      <QuickModalActionBar
        onClose={onClose}
        onDetailedEntry={onDetailedEntry}
        onRefresh={onRefresh}
        isLoading={isLoading}
      />

      {/* 底部操作区域 */}
      <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full"></div>
              <span>固定价格</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
              <span>可修改金额</span>
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">支持快速记录和金额微调</div>
        </div>
      </div>
    </>
  );
}
