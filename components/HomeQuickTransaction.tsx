'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { QuickTransactionCard } from '@/components/QuickTransactionCard';
import { FaRobot, FaStar } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';
import { BsEmojiSmileFill } from 'react-icons/bs';
import { motion, AnimatePresence } from 'framer-motion';

interface HomeQuickTransactionProps {
  onSuccess?: () => void;
}

export function HomeQuickTransaction({ onSuccess }: HomeQuickTransactionProps) {
  const [showCard, setShowCard] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleSuccess = () => {
    onSuccess?.();
    // 快速记账成功后可以刷新页面数据
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <>
      {/* 悬浮按钮 - 只在首页显示 */}
      <motion.div
        className="fixed bottom-6 right-6 z-40"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          onClick={() => setShowCard(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white font-medium shadow-2xl hover:shadow-3xl transition-all duration-300 rounded-full w-20 h-20 flex items-center justify-center group overflow-hidden border-3 border-white/30"
          size="lg"
        >
          {/* 背景动画效果 */}
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* AI助手头像 */}
          <motion.div
            className="relative z-10 flex items-center justify-center"
            animate={{
              rotate: isHovered ? [0, -5, 5, 0] : 0,
            }}
            transition={{
              duration: 0.5,
              repeat: isHovered ? Infinity : 0,
              repeatDelay: 1,
            }}
          >
            <div className="relative">
              <FaRobot className="h-10 w-10 text-white drop-shadow-lg" />
              {/* 可爱的眼睛效果 */}
              <div className="absolute top-3 left-3 w-2 h-2 bg-white rounded-full animate-pulse" />
              <div className="absolute top-3 right-3 w-2 h-2 bg-white rounded-full animate-pulse" />
              {/* 微笑效果 */}
              <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 w-4 h-1 bg-white rounded-full opacity-90" />
            </div>
          </motion.div>

          {/* 悬停时的闪烁效果 */}
          <AnimatePresence>
            {isHovered && (
              <>
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute -top-2 -right-2"
                >
                  <HiSparkles className="h-6 w-6 text-yellow-300" />
                </motion.div>
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute -top-1 -left-1"
                  transition={{ delay: 0.1 }}
                >
                  <FaStar className="h-4 w-4 text-pink-300" />
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* 脉冲动画效果 */}
          <motion.div
            className="absolute inset-0 rounded-full bg-white/25"
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.3, 0.1, 0.3],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* 边框光晕效果 */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-400/40 to-purple-400/40 blur-md group-hover:from-pink-400/60 group-hover:to-purple-400/60 transition-all duration-300" />

          {/* 呼吸效果 */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-white/50"
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </Button>

        {/* 悬浮提示 */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-full right-0 mb-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white text-sm px-4 py-3 rounded-2xl whitespace-nowrap shadow-xl border border-gray-700"
            >
              <div className="flex items-center gap-3">
                <BsEmojiSmileFill className="h-5 w-5 text-pink-400" />
                <div>
                  <div className="font-semibold">小助手来啦~</div>
                  <div className="text-xs text-gray-300">点击快速记账 💕</div>
                </div>
              </div>
              {/* 小三角 */}
              <div className="absolute top-full right-6 -mt-1">
                <div className="border-4 border-transparent border-t-gray-900"></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 快速记账卡片弹窗 */}
      <QuickTransactionCard
        open={showCard}
        onOpenChange={setShowCard}
        onSuccess={handleSuccess}
      />
    </>
  );
}