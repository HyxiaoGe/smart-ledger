'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Zap, Plus, X } from 'lucide-react';

interface FloatingQuickTransactionProps {
  className?: string;
}

export function FloatingQuickTransaction({ className = '' }: FloatingQuickTransactionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleQuickTransaction = () => {
    // 打开快速记账页面
    window.open('/quick', '_blank');
    setIsExpanded(false);
  };

  const handleAddTransaction = () => {
    // 打开详细记账页面
    window.open('/add', '_blank');
    setIsExpanded(false);
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      {/* 展开的按钮组 */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 flex flex-col gap-3 animate-fade-in">
          <Button
            onClick={handleAddTransaction}
            className="bg-blue-500 hover:bg-blue-600 text-white shadow-lg rounded-full w-12 h-12 flex items-center justify-center"
            size="sm"
          >
            <Plus className="h-5 w-5" />
          </Button>

          <Button
            onClick={handleQuickTransaction}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg rounded-full w-12 h-12 flex items-center justify-center"
            size="sm"
          >
            <Zap className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* 主按钮 */}
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg rounded-full w-14 h-14 flex items-center justify-center transition-all duration-200 hover:shadow-xl ${
          isExpanded ? 'rotate-45' : ''
        }`}
        size="lg"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* 提示文字 */}
      {isExpanded && (
        <div className="absolute bottom-16 right-16 bg-gray-800 text-white text-sm py-2 px-3 rounded-lg shadow-lg whitespace-nowrap animate-fade-in">
          <div className="font-medium mb-1">快速记账</div>
          <div className="text-xs text-gray-300">AI智能预测消费</div>
          {/* 小箭头 */}
          <div className="absolute top-2 right-0 w-2 h-2 bg-gray-800 transform rotate-45 translate-x-1"></div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}