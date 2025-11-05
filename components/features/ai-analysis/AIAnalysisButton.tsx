'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Brain } from 'lucide-react';

interface AIAnalysisButtonProps {
  dateRange?: string;
  currentMonth?: string;
  aiData?: {
    currentMonthFull: any[];
    lastMonth: any[];
    currentMonthTop20: any[];
    currentMonthStr: string;
    lastMonthStr: string;
  };
}

export function AIAnalysisButton({
  dateRange,
  currentMonth,
  aiData
}: AIAnalysisButtonProps) {
  const [showAIPanel, setShowAIPanel] = useState(false);

  return (
    <>
      <Button
        onClick={() => setShowAIPanel(true)}
        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg transition-all duration-200 hover:scale-105"
      >
        <Brain className="h-4 w-4 mr-2" />
        AI财务分析
      </Button>

      {/* AI分析弹窗 */}
      {showAIPanel && (
        <AIAnalysisModal
          isOpen={showAIPanel}
          onClose={() => setShowAIPanel(false)}
          dateRange={dateRange}
          currentMonth={currentMonth}
          aiData={aiData}
        />
      )}
    </>
  );
}

interface AIAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateRange?: string;
  currentMonth?: string;
  aiData?: {
    currentMonthFull: any[];
    lastMonth: any[];
    currentMonthTop20: any[];
    currentMonthStr: string;
    lastMonthStr: string;
  };
}

function AIAnalysisModal({
  isOpen,
  onClose,
  dateRange,
  currentMonth,
  aiData
}: AIAnalysisModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose} // 点击背景关闭弹窗
    >
      <div
        className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()} // 阻止点击内容区域时关闭弹窗
      >
        {/* 弹窗头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">智能财务分析</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 dark:text-gray-300">基于AI的个性化消费分析和建议</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </Button>
        </div>

        {/* 弹窗内容区域 */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
          <AIAnalysisPanel
            dateRange={dateRange}
            currentMonth={currentMonth}
            aiData={aiData}
            className="w-full"
            isModal={true}
          />
        </div>
      </div>
    </div>
  );
}

// 动态导入AIAnalysisPanel以避免服务端渲染问题
import dynamic from 'next/dynamic';

const AIAnalysisPanel = dynamic(
  () => import('@/components/features/ai-analysis/AIAnalysisPanel').then((mod) => mod.AIAnalysisPanel),
  {
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
          <Brain className="h-6 w-6 animate-pulse" />
          <span>AI分析加载中...</span>
        </div>
      </div>
    ),
    ssr: false
  }
);