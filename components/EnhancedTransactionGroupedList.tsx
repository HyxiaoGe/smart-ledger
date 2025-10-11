"use client";
// 增强版交易分组列表组件（客户端支持编辑和删除）
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { TransactionGroupedList, TransactionGroup } from '@/components/TransactionGroupedList';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CategoryChip } from '@/components/CategoryChip';
import { DateInput } from '@/components/DateInput';
import { PRESET_CATEGORIES } from '@/lib/config';
import { formatCurrency } from '@/lib/format';

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

  // 当 initialTransactions 发生变化时更新本地状态
  useEffect(() => {
    setTransactions(initialTransactions);
  }, [initialTransactions]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [recentlyDeleted, setRecentlyDeleted] = useState<Transaction | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Transaction>>({});
  const [confirmRow, setConfirmRow] = useState<Transaction | null>(null);

  async function handleEdit(transaction: Transaction) {
    setEditingId(transaction.id);
    setForm({ ...transaction });
  }

  async function saveEdit() {
    if (!editingId) return;
    setLoading(true);
    setError('');
    const patch = { ...form };
    delete (patch as any).id;
    if (patch.amount !== undefined && !(Number(patch.amount) > 0)) {
      setError('金额必须大于 0');
      setLoading(false);
      return;
    }
    const { error } = await supabase.from('transactions').update(patch).eq('id', editingId);
    if (error) setError(error.message);
    else {
      setTransactions((ts) => ts.map((t) => (t.id === editingId ? { ...t, ...(form as Transaction) } : t)));
      setEditingId(null);
      setForm({});
    }
    setLoading(false);
  }

  async function handleDelete(transaction: Transaction) {
    setConfirmRow(transaction);
  }

  async function confirmDelete(transaction: Transaction) {
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

  // 渲染编辑表单
  function renderEditForm(transaction: Transaction) {
    return (
      <div className="grid gap-3 mt-3 p-3 bg-muted/30 rounded-lg">
        <DateInput
          selected={new Date((form.date as string) || transaction.date)}
          onSelect={(date) => setForm((f) => ({ ...f, date: date?.toISOString().slice(0, 10) }))}
          placeholder="选择日期"
        />
        <select
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={(form.type as string) || transaction.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Transaction['type'] }))}
        >
          <option value="expense">支出</option>
          <option value="income">收入</option>
        </select>
        <select
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={(form.category as string) || transaction.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
        >
          {PRESET_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.icon ? `${c.icon} ` : ''}{c.label}
            </option>
          ))}
        </select>
        <Input
          type="number"
          inputMode="decimal"
          value={String(form.amount ?? transaction.amount ?? '')}
          onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
        />
        <select
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={form.currency as string || transaction.currency || 'CNY'}
          onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
        >
          <option value="CNY">CNY</option>
          <option value="USD">USD</option>
        </select>
        <Input
          value={(form.note as string) || transaction.note || ''}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          placeholder="备注"
        />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setEditingId(null); setForm({}); }}>
            取消
          </Button>
          <Button onClick={saveEdit} disabled={loading}>
            保存
          </Button>
        </div>
      </div>
    );
  }

  // 自定义交易项渲染器
  function renderTransactionItem(transaction: Transaction) {
    const isEditing = editingId === transaction.id;

    return (
      <div key={transaction.id} className="border-l-2 border-l-blue-200">
        {!isEditing ? (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {transaction.currency || 'CNY'}
                </span>
                <CategoryChip category={transaction.category} />
                {transaction.note && (
                  <span className="text-sm text-muted-foreground truncate max-w-[200px]" title={transaction.note}>
                    {transaction.note}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {formatCurrency(Number(transaction.amount || 0), transaction.currency || 'CNY')}
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(transaction)} disabled={loading}>
                    编辑
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(transaction)} disabled={loading}>
                    删除
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          renderEditForm(transaction)
        )}
      </div>
    );
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

      {confirmRow && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmRow(null); }}>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm w-full max-w-sm z-50" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="p-4 border-b font-semibold">确认删除</div>
            <div className="p-4 text-sm text-muted-foreground">确定要删除这条记录吗？删除后可在短时间内"撤销"。</div>
            <div className="p-4 flex justify-end gap-2 border-t">
              <Button variant="secondary" onClick={() => setConfirmRow(null)}>取消</Button>
              <Button variant="destructive" onClick={async () => { const row = confirmRow; setConfirmRow(null); if (row) await confirmDelete(row); }}>确认删除</Button>
            </div>
          </div>
        </div>
      )}

      <TransactionGroupedList
        transactions={transactions}
        onEdit={handleEdit}
        onDelete={handleDelete}
        renderTransactionItem={renderTransactionItem}
      />
    </div>
  );
}