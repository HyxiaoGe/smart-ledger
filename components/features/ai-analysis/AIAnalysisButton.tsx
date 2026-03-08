'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Brain, Sparkles, X } from 'lucide-react';
import type { AIAnalysisButtonProps } from '@/lib/types/transactionViews';
import type { AIAnalysisData } from '@/lib/services/transaction/TransactionAnalyticsService';

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
        className="rounded-xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 px-5 py-2.5 text-white shadow-lg shadow-fuchsia-500/20 transition-all duration-200 hover:scale-[1.02] hover:from-fuchsia-600 hover:via-violet-600 hover:to-indigo-600"
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
  aiData?: AIAnalysisData;
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-md"
      onClick={onClose} // 点击背景关闭弹窗
    >
      <div
        className="w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/60 bg-white/95 shadow-2xl shadow-slate-950/20 dark:border-slate-700 dark:bg-slate-950/95"
        onClick={(e) => e.stopPropagation()} // 阻止点击内容区域时关闭弹窗
      >
        {/* 弹窗头部 */}
        <div className="border-b border-slate-200/80 bg-gradient-to-r from-fuchsia-50 via-white to-indigo-50 p-6 dark:border-slate-800 dark:from-fuchsia-950/60 dark:via-slate-950 dark:to-indigo-950/60">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 shadow-lg shadow-fuchsia-500/20">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-200 bg-white/80 px-3 py-1 text-xs font-medium text-fuchsia-700 dark:border-fuchsia-800 dark:bg-slate-900/70 dark:text-fuchsia-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  智能复盘模式
                </div>
                <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  智能财务分析
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  用一屏看清趋势、可优化空间和下一个最值得调整的支出动作。
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-right shadow-sm dark:border-slate-800 dark:bg-slate-900/70 md:block">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  分析范围
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {currentMonth || '当前周期'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-11 w-11 rounded-2xl border border-slate-200 bg-white/80 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* 弹窗内容区域 */}
        <div
          className="overflow-y-auto bg-slate-50/90 p-6 dark:bg-slate-950"
          style={{ maxHeight: 'calc(90vh - 124px)' }}
        >
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
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Brain className="h-6 w-6 animate-pulse" />
          <span>AI分析加载中...</span>
        </div>
      </div>
    ),
    ssr: false
  }
);
