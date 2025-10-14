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

  // 首次加载：若 initialRows 为空，则从客户端拉取
  // 当 start 或 end 参数变化时也需要重新获取数据
  useEffect(() => {
    if (initialRows.length === 0 && start) {
      (async () => {
        setLoading(true);
        // 判断是否为单日查询
        const isSingleDay = start === end || (end && new Date(end).getTime() - new Date(start).getTime() === 86400000);
        let query = supabase.from('transactions').select('*').order('date', { ascending: false });
        
        if (start && end) {
          if (isSingleDay) {
            // 单日查询使用等值比较
            query = query.eq('date', start);
          } else {
            // 多日查询使用范围比较
            query = query.gte('date', start).lt('date', end);
          }
        }
        
        query = query.eq('type', 'expense').is('deleted_at', null);
        const { data, error } = await query.limit(50);
        if (!error && data) setRows(data as Row[]);
        if (!error && (data?.length || 0) < 50) setHasMore(false);
        setLoading(false);
      })();
    }
  }, [initialRows, start, end]);

  // 当 start 或 end 参数变化且 initialRows 不为空时，需要重新获取数据
  useEffect(() => {
    if (initialRows.length > 0 && start) {
      (async () => {
        setLoading(true);
        // 判断是否为单日查询
        const isSingleDay = start === end || (end && new Date(end).getTime() - new Date(start).getTime() === 86400000);
        
        let query = supabase.from('transactions').select('*');
        
        if (start && end) {
          if (isSingleDay) {
            // 单日查询使用等值比较
            query = query.eq('date', start);
          } else {
            // 多日查询使用范围比较
            query = query.gte('date', start).lt('date', end);
          }
        }
        
        const { data, error } = await query
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
      setRows((rs) => rs.map((r) => (r.id === editingId ? { ...r, ...(form as Row), type: 'expense' } : r)));
      setEditingId(null);
      setForm({});
    }
    setLoading(false);
  }

  async function removeRow(r: Row) {
    setLoading(true);
    setError('');
    // 先尝试软删除；若列不存在或 RLS 拒绝，再回退物理删除（保证用户体验）
    const soft = await supabase
      .from('transactions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', r.id)
      .select();
    if (soft.error) {
      // 回退为物理删除
      const hard = await supabase.from('transactions').delete().eq('id', r.id);
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
      setRecentlyDeleted(r);
    }
    setRows((rs) => rs.filter((x) => x.id !== r.id));
    setLoading(false);
  }

  async function undoDelete() {
    if (!recentlyDeleted) return;
    setLoading(true);
    const { id } = recentlyDeleted;
    const { error } = await supabase.from('transactions').update({ deleted_at: null }).eq('id', id);
    if (!error) setRows((rs) => [recentlyDeleted as Row, ...rs]);
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
    // Supabase range 是包含端点，使用 offset..offset+limit-1
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
        <div className="p-4 border-b">
          <Alert variant="destructive">
            <AlertTitle>操作失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}
      {recentlyDeleted && (
        <div className="flex items-center gap-3 p-4 border-b">
          <span className="text-sm">已删除一条记录。</span>
          <Button variant="secondary" onClick={undoDelete} disabled={busy}>撤销</Button>
        </div>
      )}
      <div className="overflow-x-auto relative">
        {confirmRow && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmRow(null); }}>
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm w-full max-w-sm z-50" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
              <div className="p-4 border-b font-semibold">确认删除</div>
              <div className="p-4 text-sm text-muted-foreground">确定要删除这条记录吗？删除后可在短时间内“撤销”。</div>
              <div className="p-4 flex justify-end gap-2 border-t">
                <Button variant="secondary" onClick={() => setConfirmRow(null)}>取消</Button>
                <Button variant="destructive" onClick={async () => { const row = confirmRow; setConfirmRow(null); if (row) await removeRow(row); }}>确认删除</Button>
              </div>
            </div>
          </div>
        )}
        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState description="暂无任何账单记录，点击上方“添加账单”开始记录吧。" />
          </div>
        ) : view === 'table' ? (
        <table className="w-full border-collapse">
          <thead className="bg-muted/50 sticky top-0 z-10">
            <tr className="text-left text-sm">
              <th className="px-4 py-2 font-medium text-muted-foreground">日期</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">类型</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">分类</th>
              <th className="px-4 py-2 font-medium text-right text-muted-foreground">金额</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">币种</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">备注</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t hover:bg-muted/50">
                <td className="px-4 py-2">
                  {editingId === r.id ? (
                    <Input type="date" value={(form.date as string) || ''}
                      onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                  ) : r.date}
                </td>
                <td className="px-4 py-2">
                  <span className="text-red-600">支出</span>
                </td>
                <td className="px-4 py-2">
                  {editingId === r.id ? (
                    <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={(form.category as string) || ''}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                      {PRESET_CATEGORIES.map((c) => (
                        <option key={c.key} value={c.key}>{c.icon ? `${c.icon} ` : ''}{c.label}</option>
                      ))}
                    </select>
                  ) : (
                    <CategoryChip category={r.category} />
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  {editingId === r.id ? (
                    <Input type="number" inputMode="decimal" value={String(form.amount ?? '')}
                      onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
                  ) : formatCurrency(Number(r.amount || 0), r.currency || 'CNY')}
                </td>
                <td className="px-4 py-2">
                  {editingId === r.id ? (
                    <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={form.currency as string}
                      onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>
                      <option value="CNY">CNY</option>
                      <option value="USD">USD</option>
                    </select>
                  ) : (r.currency || 'CNY')}
                </td>
                <td className="px-4 py-2 max-w-[280px]">
                  {editingId === r.id ? (
                    <Input value={(form.note as string) || ''}
                      onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
                  ) : (
                    <span className="block truncate" title={r.note || ''}>{r.note || '-'}</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {editingId === r.id ? (
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => { setEditingId(null); setForm({}); }}>取消</Button>
                      <Button onClick={saveEdit} disabled={busy}>保存</Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => startEdit(r)} disabled={busy}>编辑</Button>
                      <Button variant="destructive" onClick={() => setConfirmRow(r)} disabled={busy}>删除</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        ) : (
          <div className="p-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => (
              <div key={r.id} className="rounded-lg border p-4 hover:shadow transition bg-background">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">{r.date}</div>
                  <div className="text-red-600 text-xs font-medium">
                    支出
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <CategoryChip category={r.category} />
                  <div className="text-right font-semibold">{formatCurrency(Number(r.amount || 0), r.currency || 'CNY')}</div>
                </div>
                <div className="mt-2 text-sm text-muted-foreground min-h-[20px]">
                  <span className="block truncate" title={r.note || ''}>{r.note || '—'}</span>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  {editingId === r.id ? (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => { setEditingId(null); setForm({}); }}>取消</Button>
                      <Button size="sm" onClick={saveEdit} disabled={busy}>保存</Button>
                    </>
                  ) : (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => startEdit(r)} disabled={busy}>编辑</Button>
                      <Button variant="destructive" size="sm" onClick={() => setConfirmRow(r)} disabled={busy}>删除</Button>
                    </>
                  )}
                </div>
                {editingId === r.id && (
                  <div className="mt-3 grid gap-2">
                    <Input type="date" value={(form.date as string) || r.date}
                      onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                    <input type="hidden" value="expense" />
                    <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={(form.category as string) || r.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                      {PRESET_CATEGORIES.map((c) => (
                        <option key={c.key} value={c.key}>{c.icon ? `${c.icon} ` : ''}{c.label}</option>
                      ))}
                    </select>
                    <Input type="number" inputMode="decimal" value={String(form.amount ?? r.amount ?? '')}
                      onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
                    <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={(form.currency as string) || r.currency || 'CNY'}
                      onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>
                      <option value="CNY">CNY</option>
                      <option value="USD">USD</option>
                    </select>
                    <Input value={(form.note as string) || r.note || ''}
                      onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {hasMore && (
          <div className="p-4 text-center">
            <Button variant="secondary" onClick={loadMore} disabled={loading}>加载更多</Button>
          </div>
        )}
      </div>
    </div>
  );
}
