'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const ASSISTANT_TIPS = [
  '点我快速记账~',
  '今天记账了吗？',
  '我是你的记账小助手！',
  '记录消费，养成好习惯~',
  '点击我，轻松记账！',
  '记得记账哦~',
  '我在这里等你！',
  '记账让生活更美好~',
  '点击开始记账吧！',
  '记录每一笔支出~',
];

export function useHomeQuickAssistant() {
  const [showCard, setShowCard] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [currentTip, setCurrentTip] = useState('');
  const [showTip, setShowTip] = useState(false);
  const hideTipTimeoutRef = useRef<number | null>(null);
  const initialDelayTimeoutRef = useRef<number | null>(null);
  const tipIntervalRef = useRef<number | null>(null);

  const getRandomTip = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * ASSISTANT_TIPS.length);
    return ASSISTANT_TIPS[randomIndex];
  }, []);

  const showAssistantTip = useCallback(() => {
    setCurrentTip(getRandomTip());
    setShowTip(true);

    if (hideTipTimeoutRef.current) {
      window.clearTimeout(hideTipTimeoutRef.current);
    }

    hideTipTimeoutRef.current = window.setTimeout(() => {
      setShowTip(false);
    }, 3000);
  }, [getRandomTip]);

  useEffect(() => {
    initialDelayTimeoutRef.current = window.setTimeout(() => {
      if (!showCard && !isHovered) {
        showAssistantTip();
      }
    }, 2000);

    tipIntervalRef.current = window.setInterval(() => {
      if (!showCard && !isHovered && Math.random() > 0.3) {
        showAssistantTip();
      }
    }, Math.floor(Math.random() * 4000) + 8000);

    return () => {
      if (initialDelayTimeoutRef.current) {
        window.clearTimeout(initialDelayTimeoutRef.current);
      }
      if (tipIntervalRef.current) {
        window.clearInterval(tipIntervalRef.current);
      }
      if (hideTipTimeoutRef.current) {
        window.clearTimeout(hideTipTimeoutRef.current);
      }
    };
  }, [isHovered, showAssistantTip, showCard]);

  return {
    currentTip,
    isHovered,
    openCard: () => setShowCard(true),
    setIsHovered,
    showCard,
    showTip,
    closeCard: () => setShowCard(false),
  };
}
