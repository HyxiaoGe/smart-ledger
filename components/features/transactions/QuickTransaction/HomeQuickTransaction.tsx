'use client';

import React, { useCallback } from 'react';
import { QuickTransactionCard } from '@/components/features/transactions/QuickTransaction/QuickTransactionCard';
import { motion } from 'framer-motion';
import { useHomeQuickAssistant } from './useHomeQuickAssistant';
import {
  QuickHomeAssistantBubble,
  QuickHomeAssistantButton,
} from './components';

interface HomeQuickTransactionProps {
  onSuccess?: () => void;
}

export function HomeQuickTransaction({ onSuccess }: HomeQuickTransactionProps) {
  const {
    closeCard,
    currentTip,
    isHovered,
    openCard,
    setIsHovered,
    showCard,
    showTip,
  } = useHomeQuickAssistant();

  const handleSuccess = () => {
    onSuccess?.();
    closeCard();
  };

  const handleCardOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        openCard();
        return;
      }

      closeCard();
    },
    [closeCard, openCard]
  );

  return (
    <>
      {/* 悬浮按钮 - 只在首页显示 */}
      <motion.div
        className="fixed bottom-6 right-6 z-40"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <QuickHomeAssistantButton
          onClick={openCard}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          isHovered={isHovered}
          showTip={showTip}
        />

        <QuickHomeAssistantBubble
          currentTip={currentTip}
          isHovered={isHovered}
          showTip={showTip}
        />
      </motion.div>

      {/* 快速记账卡片弹窗 */}
      <QuickTransactionCard
        open={showCard}
        onOpenChange={handleCardOpenChange}
        onSuccess={handleSuccess}
      />
    </>
  );
}
