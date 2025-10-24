'use client';

import { useState, useEffect } from 'react';

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
      className="fixed top-4 right-4 bg-gray-800 text-white px-6 py-4 rounded-lg shadow-lg min-w-[300px] max-w-md transform transition-all duration-300 ease-in-out z-50"
      style={{
        animation: 'slideIn 0.3s ease-out'
      }}
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6 text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-medium">{message}</p>
          <div className="mt-2 w-full bg-gray-700 rounded-full h-1">
            <div
              className="bg-green-400 h-1 rounded-full transition-all duration-100 ease-linear"
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
          className="flex-shrink-0 ml-2 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
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
