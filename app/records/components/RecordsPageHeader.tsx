import { TabsRangePicker } from '@/components/shared/TabsRangePicker';
import { AIAnalysisButton } from '@/components/features/ai-analysis/AIAnalysisButton';
import type { TransactionRecordsPageViewSlices } from '@/lib/types/transactionViews';
import Link from 'next/link';
import { ArrowRight, FileSearch, ReceiptText } from 'lucide-react';

interface RecordsPageHeaderProps {
  headerView: TransactionRecordsPageViewSlices['headerView'];
}

export function RecordsPageHeader({ headerView }: RecordsPageHeaderProps) {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.14),_transparent_30%),linear-gradient(135deg,_#ffffff_0%,_#f8fafc_100%)] p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.12),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#0f172a_100%)]">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.85fr)]">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-medium text-sky-700 backdrop-blur dark:border-sky-900 dark:bg-slate-950/60 dark:text-sky-300">
            <FileSearch className="h-3.5 w-3.5" />
            复盘工作台
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
              {headerView.title}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              先看汇总，再看分类，最后下钻到明细。范围切换和 AI 分析入口都放在顶部，方便连续复盘。
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="inline-flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm sm:w-auto sm:justify-start sm:rounded-full dark:border-slate-700 dark:bg-slate-950">
              <span className="text-slate-500 dark:text-slate-400">时间范围</span>
              <TabsRangePicker />
            </div>
            <Link
              href="/add"
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-sky-400 hover:text-sky-700 sm:w-auto sm:justify-start sm:rounded-full dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-300"
            >
              <ReceiptText className="h-4 w-4" />
              继续记账
            </Link>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-5 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white dark:bg-slate-100 dark:text-slate-900">
            复盘动作
          </div>
          <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
            先看异常，再决定是否深挖
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            如果汇总与分类没有明显变化，就不用直接钻明细；如果出现异常波动，再配合 AI 分析判断原因。
          </p>
          <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                智能分析
              </div>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                用 AI 快速理解本期结构与变化。
              </p>
            </div>
            <div className="shrink-0">
              <AIAnalysisButton {...headerView.aiAnalysisButton} />
            </div>
          </div>
          <div className="mt-4 inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            明细筛选和分类过滤在下方明细区统一处理
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </section>
  );
}
