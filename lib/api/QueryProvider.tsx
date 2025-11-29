'use client';

/**
 * React Query Provider
 * 为应用提供 QueryClient 上下文
 */

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { defaultQueryOptions } from './queryClient';

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // 使用 useState 确保每个客户端只创建一个 QueryClient 实例
  // 这在 Next.js App Router 中很重要，避免服务端和客户端共享状态
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: defaultQueryOptions,
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
