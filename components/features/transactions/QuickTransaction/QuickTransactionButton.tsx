'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Zap, Plus, TrendingUp } from 'lucide-react';

interface QuickTransactionButtonProps {
  onSuccess?: () => void;
  className?: string;
}

export function QuickTransactionButton({ onSuccess, className = '' }: QuickTransactionButtonProps) {
  const handleQuickTransaction = () => {
    // 直接打开快速记账页面
    window.open('/quick', '_blank');
    onSuccess?.();
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleQuickTransaction}
        className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
        size="sm"
      >
        <Zap className="h-4 w-4 mr-2" />
        快速记账
      </Button>

      {/* 智能提示标签 */}
      <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
        <TrendingUp className="h-3 w-3" />
        <span>AI智能预测</span>
      </div>
    </div>
  );
}