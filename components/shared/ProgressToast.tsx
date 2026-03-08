'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils/helpers';

interface ProgressToastProps {
  message: string;
  duration?: number;
  onClose?: () => void;
}

export function ProgressToast({ message, duration = 3000, onClose }: ProgressToastProps) {
  const [progress, setProgress] = useState(100);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = duration / 50; // 更新频率：每50ms
    const decrement = 100 / (duration / interval);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= decrement) {
          setIsVisible(false);
          setTimeout(() => {
            onClose?.();
          }, 300); // 等待淡出动画
          return 0;
        }
        return prev - decrement;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed right-4 top-4 z-50 min-w-[320px] max-w-md overflow-hidden rounded-2xl border border-emerald-200 bg-white/95 px-5 py-4 text-slate-900 shadow-2xl backdrop-blur transition-all duration-300 ease-in-out dark:border-emerald-900 dark:bg-slate-950/95 dark:text-slate-100'
      )}
      style={{
        animation: 'slideIn 0.3s ease-out'
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium leading-6">{message}</p>
          <div className="mt-3 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-1.5 rounded-full bg-emerald-500 transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => {
              onClose?.();
            }, 300);
          }}
          className="flex-shrink-0 text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
