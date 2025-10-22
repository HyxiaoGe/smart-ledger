"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CategoryChip } from '@/components/CategoryChip';
import { PRESET_CATEGORIES } from '@/lib/config';
import { formatCurrency } from '@/lib/format';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EmptyState } from '@/components/EmptyState';
import { dataSync, markTransactionsDirty } from '@/lib/dataSync';

type Row = {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  currency?: string;
  note?: string;
  date: string;
};

export function TransactionList({ initialRows = [] as Row[], start, end }: { initialRows?: Row[]; start?: string; end?: string }) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Row>>({});
  const [recentlyDeleted, setRecentlyDeleted] = useState<Row | null>(null);
  const [error, setError] = useState<string>('');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'card' | 'table'>('card');
  const [hasMore, setHasMore] = useState(true);
  const [confirmRow, setConfirmRow] = useState<Row | null>(null);

  const triggerRevalidate = () => {
    fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag: 'transactions' }),
      cache: 'no-store'
    })
      .then(() => console.log('[sync] transaction_list revalidate done'))
      .catch((err) => console.error('failed to revalidate transactions', err));
  };

  useEffect(() => {
    if (initialRows.length === 0 && start) {
      (async () => {
        setLoading(true);
        const isSingleDay = start === end || (end && new Date(end).getTime() - new Date(start).getTime() === 86400000);
        let queryBuilder = supabase.from('transactions').select('*').order('date', { ascending: false });

        if (start && end) {
          if (isSingleDay) {
            queryBuilder = queryBuilder.eq('date', start);
          } else {
            queryBuilder = queryBuilder.gte('date', start).lt('date', end);
          }
        }

        queryBuilder = queryBuilder.eq('type', 'expense').is('deleted_at', null);
        const { data, error } = await queryBuilder.limit(50);
        if (!error && data) setRows(data as Row[]);
        if (!error && (data?.length || 0) < 50) setHasMore(false);
        setLoading(false);
      })();
    }
  }, [initialRows, start, end]);

  useEffect(() => {
    if (initialRows.length > 0 && start) {
      (async () => {
        setLoading(true);
        const isSingleDay = start === end || (end && new Date(end).getTime() - new Date(start).getTime() === 86400000);

        let queryBuilder = supabase.from('transactions').select('*');

        if (start && end) {
          if (isSingleDay) {
            queryBuilder = queryBuilder.eq('date', start);
          } else {
            queryBuilder = queryBuilder.gte('date', start).lt('date', end);
          }
        }

        const { data, error } = await queryBuilder
          .eq('type', 'expense')
          .is('deleted_at', null)
          .order('date', { ascending: false })
          .limit(50);
        if (!error && data) setRows(data as Row[]);
        if (!error && (data?.length || 0) < 50) setHasMore(false);
        setLoading(false);
      })();
    }
  }, [start, end]);

  function startEdit(r: Row) {
    setEditingId(r.id);
    setForm({ ...r });
  }

  async function saveEdit() {
    if (!editingId) return;
    setLoading(true);
    setError('');
    const patch = { ...form, type: 'expense' };
    delete (patch as any).id;
    if (patch.amount !== undefined && !(Number(patch.amount) > 0)) {
      setError('金额必须大于 0');
      setLoading(false);
      return;
    }
    const { error } = await supabase.from('transactions').update(patch).eq('id', editingId);
    if (error) setError(error.message);
    else {
      setRows((rs) => rs.map((r) => (r.id === editingId ? { ...r, ...(form as Row), type: 'expense' } : r)));
      setEditingId(null);
      setForm({});
      markTransactionsDirty();
      console.log('[sync] transaction_list save -> mark dirty');
      triggerRevalidate();
      dataSync.notifyTransactionUpdated({ ...(form as Row), id: editingId });
    }
    setLoading(false);
  }

  async function removeRow(r: Row) {
    setLoading(true);
    setError('');
    const soft = await supabase
      .from('transactions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', r.id)
      .select();
    if (soft.error) {
      const hard = await supabase.from('transactions').delete().eq('id', r.id);
      if (hard.error) {
        setError(soft.error.message || hard.error.message);
        setLoading(false);
        return;
      }
      setRecentlyDeleted(null);
    } else if (!soft.data || soft.data.length === 0) {
      setLoading(false);
      return;
    } else {
      setRecentlyDeleted(r);
    }
    setRows((rs) => rs.filter((x) => x.id !== r.id));
    markTransactionsDirty();
    console.log('[sync] transaction_list delete -> mark dirty');
    triggerRevalidate();
    dataSync.notifyTransactionDeleted({ id: r.id });
    setLoading(false);
  }

  async function undoDelete() {
    if (!recentlyDeleted) return;
    setLoading(true);
    const { id } = recentlyDeleted;
    const { error } = await supabase.from('transactions').update({ deleted_at: null }).eq('id', id);
    if (!error) {
      setRows((rs) => [recentlyDeleted as Row, ...rs]);
      markTransactionsDirty();
      console.log('[sync] transaction_list undo -> mark dirty');
      triggerRevalidate();
      dataSync.notifyTransactionUpdated(recentlyDeleted as Row);
    }
    setRecentlyDeleted(null);
    setLoading(false);
  }

  const busy = loading;
  const filtered = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const catLabel = PRESET_CATEGORIES.find((c) => c.key === r.category)?.label || r.category;
    const typeLabel = r.type === 'income' ? '收入' : '支出';
    return (
      r.category.toLowerCase().includes(q) ||
      catLabel.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q) ||
      typeLabel.toLowerCase().includes(q)
    );
  });

  async function loadMore() {
    setLoading(true);
    let q = supabase.from('transactions').select('*').order('date', { ascending: false });
    if (start && end) q = q.gte('date', start).lt('date', end);
    q = q.eq('type', 'expense').is('deleted_at', null);
    const offset = rows.length;
    const { data, error } = await q.range(offset, offset + 49);
    if (!error) {
      const more = (data as Row[]) || [];
      setRows((rs) => rs.concat(more));
      if (more.length < 50) setHasMore(false);
    }
    setLoading(false);
  }

  function exportCsv() {
    const header = ['日期','类型','分类','金额','币种','备注'];
    const lines = [header.join(',')].concat(
      filtered.map((r) => [r.date, r.type, r.category, r.amount, r.currency || 'CNY', (r.note || '').replace(/\n/g,' ')].join(','))
    );
    const blob = new Blob(["\uFEFF" + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-md">
      <div className="flex flex-col gap-3 p-4 border-b md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Input placeholder="搜索 分类/类型" value={query} onChange={(e) => setQuery(e.target.value)} className="w-[260px]" />
          {query && (
            <Button variant="secondary" onClick={() => setQuery('')}>清空</Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1 mr-2">
            <Button variant={view === 'card' ? 'default' : 'secondary'} onClick={() => setView('card')}>卡片视图</Button>
            <Button variant={view === 'table' ? 'default' : 'secondary'} onClick={() => setView('table')}>表格视图</Button>
          </div>
          <Button variant="secondary" onClick={exportCsv}>导出 CSV</Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-none">
          <AlertTitle>操作失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {rows.length === 0 && !loading ? (
        <EmptyState description="当前没有支出记录" />
      ) : (
        <div className="overflow-x-auto">
          {view === 'table' ? (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2">日期</th>
                  <th className="px-4 py-2">类型</th>
                  <th className="px-4 py-2">分类</th>
                  <th className="px-4 py-2">金额</th>
                  <th className="px-4 py-2">币种</th>
                  <th className="px-4 py-2">备注</th>
                  <th className="px-4 py-2 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40 transition">
                    <td className="px-4 py-2">{r.date}</td>
                    <td className="px-4 py-2">支出</td>
                    <td className="px-4 py-2">
                      <CategoryChip category={r.category} />
                    </td>
                    <td className="px-4 py-2 font-semibold">
                      {formatCurrency(Number(r.amount || 0), r.currency || 'CNY')}
                    </td>
                    <td className="px-4 py-2">{r.currency || 'CNY'}</td>
                    <td className="px-4 py-2 max-w-[280px]">
                      {(r.note || '').slice(0, 40)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button variant="secondary" className="mr-2" onClick={() => startEdit(r)} disabled={busy}>编辑</Button>
                      <Button variant="destructive" onClick={() => setConfirmRow(r)} disabled={busy}>删除</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {rows.map((r) => (
                <div key={r.id} className="rounded-lg border p-4 hover:shadow transition bg-background">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">{r.date}</div>
                    <div className="text-red-600 text-xs font-medium">支出</div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <CategoryChip category={r.category} />
                    <div className="text-right font-semibold">{formatCurrency(Number(r.amount || 0), r.currency || 'CNY')}</div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground min-h-[20px]">
                    {(r.note || '').slice(0, 60) || '—'}
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => startEdit(r)} disabled={busy}>编辑</Button>
                    <Button variant="destructive" size="sm" onClick={() => setConfirmRow(r)} disabled={busy}>删除</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {hasMore && (
        <div className="p-4 text-center">
          <Button variant="secondary" onClick={loadMore} disabled={loading}>加载更多</Button>
        </div>
      )}
    </div>
  );
}




