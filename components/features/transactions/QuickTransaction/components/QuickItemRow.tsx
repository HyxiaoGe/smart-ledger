'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, Edit2 } from 'lucide-react';
import { FaCheck } from 'react-icons/fa';
import { motion } from 'framer-motion';
import type { QuickTransactionItem } from '../types';
import { CATEGORY_DISPLAY } from '../constants';

interface QuickItemRowProps {
  item: QuickTransactionItem;
  isRecordedToday: boolean;
  isEditing: boolean;
  isSubmitting: boolean;
  currentAmount: string;
  onAmountChange: (value: string) => void;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onSubmit: () => void;
}

export function QuickItemRow({
  item,
  isRecordedToday,
  isEditing,
  isSubmitting,
  currentAmount,
  onAmountChange,
  onStartEdit,
  onStopEdit,
  onSubmit,
}: QuickItemRowProps) {
  const categoryDisplay = CATEGORY_DISPLAY[item.category] || { color: 'text-gray-600', label: item.category };

  return (
    <motion.div
      className={`flex items-center justify-between p-4 border-2 rounded-xl transition-all duration-300 ${
        item.isFixed
          ? 'border-gradient-to-r from-green-200 to-emerald-200 dark:from-green-800 dark:to-emerald-800 bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-950/50 dark:to-emerald-950/50 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/80 dark:hover:to-emerald-900/80 hover:shadow-green-200/50 dark:hover:shadow-green-900/50'
          : 'border-gradient-to-r from-blue-200 to-purple-200 dark:from-blue-800 dark:to-purple-800 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/50 dark:to-purple-950/50 hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/80 dark:hover:to-purple-900/80 hover:shadow-blue-200/50 dark:hover:shadow-blue-900/50'
      } hover:shadow-lg cursor-pointer group`}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* 左侧内容 */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <motion.div
          className="text-3xl flex-shrink-0"
          whileHover={{ scale: 1.2, rotate: 5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {item.icon}
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 dark:text-gray-100 text-base group-hover:text-transparent bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text transition-all duration-300">
            {item.title}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
            <span className={categoryDisplay.color}>
              {categoryDisplay.label}
            </span>
            {isRecordedToday ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs rounded-full font-medium">
                <FaCheck className="w-2.5 h-2.5" />
                今日已记录
              </span>
            ) : item.isFixed && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded-full font-medium">
                <div className="w-1.5 h-1.5 bg-green-500 dark:bg-green-400 rounded-full"></div>
                固定价格
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 右侧金额和按钮 */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {item.isFixed ? (
          <motion.div
            className="text-right"
            whileHover={{ scale: 1.05 }}
          >
            <div className="text-xl font-bold text-green-600 dark:text-green-400">
              ¥{item.fixedAmount?.toFixed(2)}
            </div>
            <div className="text-xs text-green-500 dark:text-green-400">一键记录</div>
          </motion.div>
        ) : (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <Input
                  value={currentAmount}
                  onChange={(e) => onAmountChange(e.target.value)}
                  placeholder="金额"
                  className="w-24 h-9 text-sm font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-blue-200 dark:border-blue-700 focus:border-blue-400 dark:focus:border-blue-500 focus:ring-blue-200 dark:focus:ring-blue-800"
                  autoFocus
                  onBlur={onStopEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onStopEdit();
                      onSubmit();
                    }
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                className="text-right cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onStartEdit}
              >
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 justify-end">
                  ¥{currentAmount || '0.00'}
                  <Edit2 className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400 opacity-70" />
                </div>
                <div className="text-xs text-blue-500 dark:text-blue-400">点击修改</div>
              </motion.div>
            )}
          </div>
        )}

        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={isSubmitting}
            className={`min-w-[70px] h-10 font-medium shadow-md hover:shadow-lg transition-all duration-200 ${
              item.isFixed
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 border-green-200'
                : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-blue-200'
            } text-white`}
          >
            {isSubmitting ? (
              <motion.div
                className="flex items-center gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div
                  className="w-3 h-3 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span>记录中</span>
              </motion.div>
            ) : (
              <motion.div
                className="flex items-center gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                <span>记录</span>
              </motion.div>
            )}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
