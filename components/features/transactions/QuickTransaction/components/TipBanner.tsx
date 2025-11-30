'use client';

import { motion } from 'framer-motion';
import { HiSparkles } from 'react-icons/hi';

interface TipBannerProps {
  hasRecords: boolean;
}

export function TipBanner({ hasRecords }: TipBannerProps) {
  return (
    <motion.div
      className="flex items-center gap-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 rounded-lg border border-indigo-100 dark:border-indigo-800"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <HiSparkles className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
      </motion.div>
      <div className="flex-1">
        <div className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
          {hasRecords ? '今日记录很棒！' : '开始记账吧！'}
        </div>
        <div className="text-xs text-indigo-500 dark:text-indigo-400">
          {hasRecords
            ? '还有其他快捷记账选项可以继续使用'
            : '常用消费，一键记录 ✨'
          }
        </div>
      </div>
    </motion.div>
  );
}
