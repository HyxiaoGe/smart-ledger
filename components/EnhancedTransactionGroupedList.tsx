"use client";
// 增强版交易分组列表组件（客户端支持编辑和删除）
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { TransactionGroupedList, TransactionGroup } from '@/components/TransactionGroupedList';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type Transaction = {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  currency?: string;
  note?: string;
  date: string;
};

interface EnhancedTransactionGroupedListProps {
  initialTransactions: Transaction[];
  className?: string;
}

export function EnhancedTransactionGroupedList({
  initialTransactions,
  className
}: EnhancedTransactionGroupedListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [recentlyDeleted, setRecentlyDeleted] = useState<Transaction | null>(null);

  async function handleEdit(transaction: Transaction) {
    // 这里可以实现编辑功能，暂时先console
    console.log('编辑交易:', transaction);
    // TODO: 实现编辑功能，可能需要打开一个对话框或跳转到编辑页面
  }

  async function handleDelete(transaction: Transaction) {
    setLoading(true);
    setError('');

    try {
      // 先尝试软删除；若列不存在或 RLS 拒绝，再回退物理删除
      const soft = await supabase
        .from('transactions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', transaction.id)
        .select();

      if (soft.error) {
        // 回退为物理删除
        const hard = await supabase.from('transactions').delete().eq('id', transaction.id);
        if (hard.error) {
          setError(soft.error.message || hard.error.message);
          setLoading(false);
          return;
        }
        setRecentlyDeleted(null); // 物理删除无法撤销
      } else if (!soft.data || soft.data.length === 0) {
        // 未命中记录，直接刷新列表
        setLoading(false);
        return;
      } else {
        setRecentlyDeleted(transaction);
      }

      setTransactions((ts) => ts.filter((t) => t.id !== transaction.id));
    } catch (err) {
      setError('删除失败，请重试');
    }

    setLoading(false);
  }

  async function handleUndo() {
    if (!recentlyDeleted) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('transactions')
        .update({ deleted_at: null })
        .eq('id', recentlyDeleted.id);

      if (!error) {
        setTransactions((ts) => [recentlyDeleted, ...ts].sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ));
      }
    } catch (err) {
      setError('撤销失败，请重试');
    }

    setRecentlyDeleted(null);
    setLoading(false);
  }

  return (
    <div className={className}>
      {error && (
        <div className="mb-4">
          <Alert variant="destructive">
            <AlertTitle>操作失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {recentlyDeleted && (
        <div className="mb-4">
          <Alert>
            <AlertTitle>删除成功</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>已删除一条记录。</span>
              <button
                onClick={handleUndo}
                disabled={loading}
                className="text-sm underline hover:no-underline disabled:opacity-50"
              >
                撤销
              </button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <TransactionGroupedList
        transactions={transactions}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}