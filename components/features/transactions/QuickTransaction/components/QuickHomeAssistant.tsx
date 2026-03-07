'use client';

import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import { BsEmojiSmileFill } from 'react-icons/bs';
import { FaRobot, FaStar } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';

interface QuickHomeAssistantButtonProps {
  isHovered: boolean;
  showTip: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

interface QuickHomeAssistantBubbleProps {
  currentTip: string;
  isHovered: boolean;
  showTip: boolean;
}

export function QuickHomeAssistantButton({
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
  showTip,
}: QuickHomeAssistantButtonProps) {
  return (
    <Button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="relative bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white font-medium shadow-2xl hover:shadow-3xl transition-all duration-300 rounded-full w-20 h-20 flex items-center justify-center group overflow-hidden border-3 border-white/30"
      size="lg"
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"
        animate={{
          background: showTip
            ? [
                'linear-gradient(45deg, #f43f5e, #ec4899, #a855f7)',
                'linear-gradient(90deg, #ec4899, #a855f7, #f43f5e)',
                'linear-gradient(135deg, #a855f7, #f43f5e, #ec4899)',
                'linear-gradient(180deg, #f43f5e, #ec4899, #a855f7)',
                'linear-gradient(225deg, #ec4899, #a855f7, #f43f5e)',
                'linear-gradient(270deg, #a855f7, #f43f5e, #ec4899)',
                'linear-gradient(315deg, #f43f5e, #ec4899, #a855f7)',
                'linear-gradient(360deg, #ec4899, #a855f7, #f43f5e)',
              ]
            : [
                'linear-gradient(45deg, #ec4899, #a855f7, #6366f1)',
                'linear-gradient(90deg, #f97316, #ec4899, #a855f7)',
                'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)',
                'linear-gradient(180deg, #a855f7, #ec4899, #f97316)',
                'linear-gradient(225deg, #f97316, #f43f5e, #a855f7)',
                'linear-gradient(270deg, #a855f7, #6366f1, #ec4899)',
                'linear-gradient(315deg, #6366f1, #ec4899, #a855f7)',
                'linear-gradient(360deg, #ec4899, #a855f7, #6366f1)',
              ],
        }}
        transition={{
          duration: showTip ? 3 : 8,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <motion.div
        className="relative z-10 flex items-center justify-center"
        animate={{
          rotate: isHovered ? [0, -5, 5, 0] : [0, -2, 2, 0],
          scale: isHovered ? 1 : [1, 1.05, 1],
        }}
        transition={{
          duration: isHovered ? 0.5 : 3,
          repeat: Infinity,
          repeatDelay: isHovered ? 1 : 2,
          ease: 'easeInOut',
        }}
      >
        <div className="relative">
          <FaRobot className="h-10 w-10 text-white drop-shadow-lg" />
          <div className="absolute top-3 left-3 w-2 h-2 bg-white rounded-full animate-pulse" />
          <div className="absolute top-3 right-3 w-2 h-2 bg-white rounded-full animate-pulse" />
          <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 w-4 h-1 bg-white rounded-full opacity-90" />
        </div>
      </motion.div>

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

      <AnimatePresence>
        {showTip && (
          <motion.div
            initial={{ opacity: 0, scale: 1 }}
            animate={{ opacity: [0, 0.6, 0.3], scale: [1, 1.3, 1.2] }}
            exit={{ opacity: 0, scale: 1 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-400/60 to-purple-400/60 blur-xl"
          />
        )}
      </AnimatePresence>

      <motion.div
        className="absolute inset-0 rounded-full bg-white/25"
        animate={{
          scale: [1, 1.15, 1],
          opacity: showTip ? [0.4, 0.2, 0.4] : [0.3, 0.1, 0.3],
        }}
        transition={{
          duration: showTip ? 1.5 : 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-400/40 to-purple-400/40 blur-md"
        animate={{
          opacity: showTip ? [0.6, 0.8, 0.6] : [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: showTip ? 2 : 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        className="absolute inset-0 rounded-full border-2 border-white/50"
        animate={{
          scale: [1, 1.05, 1],
          opacity: showTip ? [0.7, 1, 0.7] : [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: showTip ? 2 : 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </Button>
  );
}

export function QuickHomeAssistantBubble({
  currentTip,
  isHovered,
  showTip,
}: QuickHomeAssistantBubbleProps) {
  return (
    <>
      <AnimatePresence>
        {isHovered && !showTip && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full right-0 mb-3 bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-700 text-white text-sm px-4 py-3 rounded-2xl whitespace-nowrap shadow-xl border border-gray-700 dark:border-gray-600"
          >
            <div className="flex items-center gap-3">
              <BsEmojiSmileFill className="h-5 w-5 text-pink-400" />
              <div>
                <div className="font-semibold">小助手来啦~</div>
                <div className="text-xs text-gray-300 dark:text-gray-400">点击快速记账 💕</div>
              </div>
            </div>
            <div className="absolute top-full right-6 -mt-1">
              <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTip && !isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-full right-0 mb-3 bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-700 dark:to-pink-700 text-white text-sm px-4 py-3 rounded-2xl whitespace-nowrap shadow-xl border border-purple-300 dark:border-purple-500"
          >
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <HiSparkles className="h-4 w-4 text-yellow-300 dark:text-yellow-200" />
              </motion.div>
              <div>
                <div className="font-medium">{currentTip}</div>
              </div>
            </div>
            <div className="absolute top-full right-6 -mt-1">
              <div className="border-4 border-transparent border-t-purple-600 dark:border-t-purple-700"></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
