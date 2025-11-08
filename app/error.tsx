'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 记录错误到控制台（生产环境可以发送到错误监控服务）
    console.error('Page Error:', error);
  }, [error]);

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            出现了一些问题
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
            很抱歉，页面遇到了一个意外错误。请尝试刷新页面或返回首页。
          </p>

          {/* 开发环境显示错误详情 */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
                错误详情（仅开发环境可见）
              </summary>
              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                <p className="text-xs font-mono text-red-600 dark:text-red-400 break-all">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    错误 ID: {error.digest}
                  </p>
                )}
              </div>
            </details>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              onClick={reset}
              className="flex-1"
              variant="default"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              重试
            </Button>
            <Button
              onClick={() => window.location.href = '/'}
              className="flex-1"
              variant="outline"
            >
              <Home className="h-4 w-4 mr-2" />
              返回首页
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
