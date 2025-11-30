'use client';

import { motion } from 'framer-motion';

interface StatsCardsProps {
  recordedCount: number;
  totalCount: number;
}

export function StatsCards({ recordedCount, totalCount }: StatsCardsProps) {
  const pendingCount = totalCount - recordedCount;
  const progressPercent = Math.round((recordedCount / totalCount) * 100);

  return (
    <div className="grid grid-cols-3 gap-3">
      <motion.div
        className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-xl p-3 text-center border border-blue-200 dark:border-blue-800"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          {recordedCount}
        </div>
        <div className="text-xs text-blue-600 dark:text-blue-400">已记录项目</div>
      </motion.div>
      <motion.div
        className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-xl p-3 text-center border border-green-200 dark:border-green-800"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
          {pendingCount}
        </div>
        <div className="text-xs text-green-600 dark:text-green-400">待记录项目</div>
      </motion.div>
      <motion.div
        className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-xl p-3 text-center border border-purple-200 dark:border-purple-800"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
          {progressPercent}%
        </div>
        <div className="text-xs text-purple-600 dark:text-purple-400">完成进度</div>
      </motion.div>
    </div>
  );
}
