"use client";
// 交易分组列表组件（客户端支持编辑和删除）
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CategoryChip } from '@/components/CategoryChip';
import { DateInput } from '@/components/DateInput';
import { PRESET_CATEGORIES } from '@/lib/config';
import { formatCurrency } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';
import { dataSync } from '@/lib/dataSync';
import { ProgressToast } from '@/components/ProgressToast';

type Transaction = {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  currency?: string;
  note?: string;
  date: string;
};

interface TransactionGroupedListProps {
  initialTransactions: Transaction[];
  className?: string;
}

export function TransactionGroupedList({
  initialTransactions,
  className
}: TransactionGroupedListProps) {
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
  const [showEditToast, setShowEditToast] = useState(false);
  const [showDeleteToast, setShowDeleteToast] = useState(false);
  const [showUndoToast, setShowUndoToast] = useState(false);

  async function handleEdit(transaction: Transaction) {
    setEditingId(transaction.id);
    setForm({ ...transaction });
  }

  async function saveEdit() {
    if (!editingId) return;
    setLoading(true);
    setError('');
    const patch = { ...form, type: 'expense' }; // 强制设置为支出类型
    delete (patch as any).id;
    if (patch.amount !== undefined && !(Number(patch.amount) > 0)) {
      setError('金额必须大于 0');
      setLoading(false);
      return;
    }
    const { error } = await supabase.from('transactions').update(patch).eq('id', editingId);
    if (error) setError(error.message);
    else {
      const updatedTransaction = { ...form, type: 'expense' } as Transaction;
      setTransactions((ts) => ts.map((t) => (t.id === editingId ? { ...t, ...updatedTransaction } : t)));
      setEditingId(null);
      setForm({});
      setShowEditToast(true);

      // 验证更新是否真正成功
      const verifyUpdate = async () => {
        try {
          const { data: verifyData, error: verifyError } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', editingId)
            .single();

          if (verifyError || !verifyData) {
            return null;
          }

          return verifyData;
        } catch {
          return null;
        }
      };

      // 异步验证更新结果
      verifyUpdate().then((verifiedData) => {
        if (verifiedData) {
          // 只有验证成功后才触发同步事件
          dataSync.notifyTransactionUpdated(verifiedData, true);
        }
      });
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
      setShowDeleteToast(true);

      // 验证删除是否真正成功
      const verifyDelete = async () => {
        try {
          const { data: verifyData, error: verifyError } = await supabase
            .from('transactions')
            .select('id, deleted_at')
            .eq('id', transaction.id)
            .single();

          if (verifyError) {
            // 如果查询失败，可能是记录已被物理删除
            return { deleted: true, transaction };
          }

          if (verifyData && verifyData.deleted_at) {
            return { deleted: true, transaction, deletedAt: verifyData.deleted_at };
          }

          return { deleted: false, transaction };
        } catch {
          return { deleted: false, transaction };
        }
      };

      // 异步验证删除结果
      verifyDelete().then((result) => {
        if (result.deleted) {
          // 只有验证成功后才触发同步事件
          dataSync.notifyTransactionDeleted(result.transaction, true);

          // 清除缓存以确保实时更新
          void fetch('/api/revalidate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tag: 'transactions' }),
            cache: 'no-store'
          }).catch(() => {});
        }
      });

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
        setShowUndoToast(true);
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
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">日期</label>
            <DateInput
              selected={new Date((form.date as string) || transaction.date)}
              onSelect={(date) => setForm((f) => ({ ...f, date: date?.toISOString().slice(0, 10) }))}
              placeholder="选择日期"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">类型</label>
            <div className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 text-sm flex items-center text-red-600">
              支出
            </div>
            <input type="hidden" name="type" value="expense" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">分类</label>
            <select
              className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-blue-500 focus:ring-blue-500"
              value={(form.category as string) || transaction.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {PRESET_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.icon ? `${c.icon} ` : ''}{c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">金额</label>
            <Input
              type="number"
              inputMode="decimal"
              value={String(form.amount ?? transaction.amount ?? '')}
              onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
              className="h-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">币种</label>
            <select
              className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-blue-500 focus:ring-blue-500"
              value={form.currency as string || transaction.currency || 'CNY'}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
            >
              <option value="CNY">CNY</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">备注</label>
            <Input
              value={(form.note as string) || transaction.note || ''}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="请输入备注信息"
              className="h-10"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t">
          <Button
            variant="outline"
            onClick={() => { setEditingId(null); setForm({}); }}
            className="min-w-[80px]"
          >
            取消
          </Button>
          <Button
            onClick={saveEdit}
            disabled={loading}
            className="min-w-[80px] bg-blue-600 hover:bg-blue-700"
          >
            {loading ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    );
  }

  // 自定义交易项渲染器
  function renderTransactionItem(transaction: Transaction) {
    const isEditing = editingId === transaction.id;

    return (
      <div key={transaction.id} className="group">
        {!isEditing ? (
          <div
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:border-blue-300 relative overflow-hidden cursor-pointer"
            onClick={() => handleEdit(transaction)}
          >
            {/* 左侧装饰条 */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-blue-600"></div>

            <div className="flex items-center justify-between pl-4">
              {/* 左侧信息 */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* 分类图标和名称 */}
                <div className="flex items-center gap-2">
                  <CategoryChip category={transaction.category} />
                </div>

                {/* 备注信息 */}
                <div className="flex-1 min-w-0">
                  {transaction.note ? (
                    <p className="text-gray-700 font-medium truncate" title={transaction.note}>
                      {transaction.note}
                    </p>
                  ) : (
                    <p className="text-gray-400 italic">无备注</p>
                  )}
                </div>

                {/* 币种标识 */}
                <Badge variant="outline" className="text-xs">
                  {transaction.currency || 'CNY'}
                </Badge>
              </div>

              {/* 右侧金额和操作 */}
              <div className="flex items-center gap-4">
                {/* 金额显示 */}
                <div className="text-right">
                  <div className="text-xl font-bold text-red-600">
                    -{formatCurrency(Number(transaction.amount || 0), transaction.currency || 'CNY')}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(transaction);
                    }}
                    disabled={loading}
                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(transaction);
                    }}
                    disabled={loading}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 shadow-sm">
            {renderEditForm(transaction)}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {showEditToast && (
        <ProgressToast
          message="账单修改成功！"
          duration={3000}
          onClose={() => setShowEditToast(false)}
        />
      )}
      {showDeleteToast && (
        <ProgressToast
          message="账单删除成功！"
          duration={3000}
          onClose={() => setShowDeleteToast(false)}
        />
      )}
      {showUndoToast && (
        <ProgressToast
          message="账单已恢复！"
          duration={3000}
          onClose={() => setShowUndoToast(false)}
        />
      )}

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

      <div className="space-y-6">
        {(() => {
          // 按日期分组交易
          const groupedTransactions = transactions.reduce((groups, transaction) => {
            const date = transaction.date;
            if (!groups[date]) {
              groups[date] = [];
            }
            groups[date].push(transaction);
            return groups;
          }, {} as Record<string, Transaction[]>);

          // 对日期进行排序（最新的在前）
          const sortedDates = Object.keys(groupedTransactions).sort((a, b) =>
            new Date(b).getTime() - new Date(a).getTime()
          );

          return sortedDates.map(date => (
            <div key={date} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-800">
                  {new Date(date + 'T00:00:00').toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h3>
                <div className="text-sm text-gray-500">
                  共 {groupedTransactions[date].length} 笔，总计：
                  <span className="font-semibold text-red-600 ml-1">
                    -{formatCurrency(
                      groupedTransactions[date].reduce((sum, t) => sum + Number(t.amount || 0), 0),
                      groupedTransactions[date][0]?.currency || 'CNY'
                    )}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                {groupedTransactions[date].map(renderTransactionItem)}
              </div>
            </div>
          ));
        })()}
        {transactions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-lg">暂无账单记录</div>
            <div className="text-sm mt-2">点击"添加账单"开始记录您的支出</div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
