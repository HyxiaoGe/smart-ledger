'use client';

import { Button } from '@/components/ui/button';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';
import { FaRobot, FaHeart } from 'react-icons/fa';
import { motion } from 'framer-motion';

interface QuickCardHeaderProps {
  onClose: () => void;
}

export function QuickCardHeader({ onClose }: QuickCardHeaderProps) {
  return (
    <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-pink-50 via-purple-50 to-indigo-50 dark:from-pink-950 dark:via-purple-950 dark:to-indigo-950 -mx-6 px-6 -mt-6 pt-6 rounded-t-2xl">
      <CardTitle className="flex items-center gap-3">
        <motion.div
          animate={{
            rotate: [0, -3, 3, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            repeatDelay: 3,
          }}
        >
          <div className="relative">
            <FaRobot className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            {/* 可爱的眼睛效果 */}
            <div className="absolute top-2 left-2 w-1.5 h-1.5 bg-white dark:bg-gray-200 rounded-full animate-pulse" />
            <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-white dark:bg-gray-200 rounded-full animate-pulse" />
            {/* 微笑效果 */}
            <div className="absolute bottom-2.5 left-1/2 transform -translate-x-1/2 w-3 h-1 bg-white dark:bg-gray-200 rounded-full opacity-90" />
          </div>
        </motion.div>
        <div className="flex flex-col">
          <span className="bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent font-bold text-lg">
            小助手记账
          </span>
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
            <FaHeart className="h-3 w-3 text-pink-500 animate-pulse" />
            <span>让记账变得简单有趣</span>
          </div>
        </div>
      </CardTitle>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="h-8 w-8 p-0 hover:bg-white/20 transition-colors"
      >
        <X className="h-4 w-4" />
      </Button>
    </CardHeader>
  );
}
