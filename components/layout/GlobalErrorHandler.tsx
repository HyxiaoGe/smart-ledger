'use client';

import { useEffect } from 'react';

/**
 * 全局错误处理组件
 * 捕获 Error Boundary 无法捕获的错误：
 * - 异步代码中的错误（Promise rejection）
 * - 事件处理器中的错误
 * - setTimeout/setInterval 中的错误
 */
export function GlobalErrorHandler() {
  useEffect(() => {
    // 捕获未处理的 Promise rejection
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled Promise Rejection:', {
        reason: event.reason,
        promise: event.promise,
      });

      // 阻止默认行为（显示控制台错误）
      event.preventDefault();

      // 在开发环境显示友好提示
      if (process.env.NODE_ENV === 'development') {
        console.warn('💡 提示: 这是一个未捕获的 Promise 错误，已被全局错误处理器捕获');
      }

      // 生产环境可以在这里上报到错误监控服务
      // 例如：Sentry.captureException(event.reason);
    };

    // 捕获未处理的运行时错误
    const handleError = (event: ErrorEvent) => {
      console.error('Unhandled Runtime Error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });

      // 阻止默认行为
      event.preventDefault();

      // 在开发环境显示友好提示
      if (process.env.NODE_ENV === 'development') {
        console.warn('💡 提示: 这是一个未捕获的运行时错误，已被全局错误处理器捕获');
      }

      // 生产环境可以在这里上报到错误监控服务
      // 例如：Sentry.captureException(event.error);
    };

    // 注册错误监听器
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    // 组件卸载时清理监听器
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  // 这个组件不渲染任何内容
  return null;
}
