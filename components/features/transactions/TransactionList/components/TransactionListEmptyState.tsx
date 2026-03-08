'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';

export function TransactionListEmptyState() {
  return (
    <EmptyState
      icon={FileText}
      title="暂无账单记录"
      description="点击下方按钮开始记录您的第一笔支出"
      action={
        <Link
          href="/add"
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          添加账单
        </Link>
      }
    />
  );
}
