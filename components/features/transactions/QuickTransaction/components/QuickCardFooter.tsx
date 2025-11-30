'use client';

import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface QuickCardFooterProps {
  onClose: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function QuickCardFooter({ onClose, onRefresh, isLoading }: QuickCardFooterProps) {
  return (
    <>
      <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              setTimeout(() => {
                window.location.href = '/add';
              }, 300);
            }}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            详细记账
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            关闭
          </Button>
        </div>
      </div>

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
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 h-7 px-2 text-xs"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>
    </>
  );
}
