"use client";
// 交易分组列表组件（客户端支持编辑和删除）
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/clients/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CategoryChip } from '@/components/CategoryChip';
import { DateInput } from '@/components/features/input/DateInput';
import { PRESET_CATEGORIES } from '@/lib/config/config';
import { formatCurrency } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Store, ChevronDown, ChevronUp } from 'lucide-react';
import { MerchantInput, SubcategorySelect } from '@/components/features/input/MerchantInput';
import { dataSync } from '@/lib/core/dataSync';
import { ProgressToast } from '@/components/shared/ProgressToast';
import { formatDateToLocal } from '@/lib/utils/date';

type Transaction = {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  currency?: string;
  note?: string;
  date: string;
  merchant?: string;
  subcategory?: string;
  product?: string;
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
              onSelect={(date) => setForm((f) => ({ ...f, date: date ? formatDateToLocal(date) : undefined }))}
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

        {/* 商家信息编辑区域 */}
        <div className="border-t border-gray-200 pt-4 space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Store className="h-4 w-4" />
            <span className="font-medium">商家信息</span>
            <span className="text-xs text-gray-400">（可选）</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">商家/品牌</label>
              <MerchantInput
                value={(form.merchant as string) ?? transaction.merchant ?? ''}
                onChange={(value) => setForm((f) => ({ ...f, merchant: value }))}
                placeholder="如：瑞幸咖啡、地铁"
                category={(form.category as string) || transaction.category}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">子分类</label>
              <SubcategorySelect
                category={(form.category as string) || transaction.category}
                value={(form.subcategory as string) ?? transaction.subcategory ?? ''}
                onChange={(value) => setForm((f) => ({ ...f, subcategory: value }))}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">具体产品/服务</label>
            <Input
              value={(form.product as string) ?? transaction.product ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, product: e.target.value }))}
              placeholder="如：生椰拿铁、地铁票"
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

  // 构建分层数据结构
  const buildHierarchicalData = (transactions: Transaction[]) => {
    const dateGroups: Record<string, {
      date: string;
      total: number;
      categories: Record<string, {
        category: string;
        total: number;
        merchants: Record<string, {
          merchant: string;
          total: number;
          items: Transaction[];
        }>;
      }>;
    }> = {};

    for (const transaction of transactions) {
      const date = transaction.date;
      const category = transaction.category || 'other';
      // 优先使用merchant，其次使用note，最后使用"无备注"
      const merchant = transaction.merchant || transaction.note || '无备注';
      const amount = Number(transaction.amount || 0);

      // 初始化日期分组
      if (!dateGroups[date]) {
        dateGroups[date] = { date, total: 0, categories: {} };
      }
      dateGroups[date].total += amount;

      // 初始化分类分组
      if (!dateGroups[date].categories[category]) {
        dateGroups[date].categories[category] = { category, total: 0, merchants: {} };
      }
      dateGroups[date].categories[category].total += amount;

      // 初始化商家分组
      if (!dateGroups[date].categories[category].merchants[merchant]) {
        dateGroups[date].categories[category].merchants[merchant] = { merchant, total: 0, items: [] };
      }
      dateGroups[date].categories[category].merchants[merchant].total += amount;
      dateGroups[date].categories[category].merchants[merchant].items.push(transaction);
    }

    return dateGroups;
  };

  const hierarchicalData = buildHierarchicalData(transactions);
  const sortedDates = Object.keys(hierarchicalData).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  // 折叠状态管理
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedMerchants, setExpandedMerchants] = useState<Set<string>>(new Set());

  const toggleDate = (date: string) => {
    const newSet = new Set(expandedDates);
    if (newSet.has(date)) {
      newSet.delete(date);
    } else {
      newSet.add(date);
    }
    setExpandedDates(newSet);
  };

  const toggleCategory = (key: string) => {
    const newSet = new Set(expandedCategories);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setExpandedCategories(newSet);
  };

  const toggleMerchant = (key: string) => {
    const newSet = new Set(expandedMerchants);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setExpandedMerchants(newSet);
  };

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

      {/* 分层树形展示 */}
      <div className="space-y-6">
        {sortedDates.map(date => {
          const dateData = hierarchicalData[date];
          const isDateExpanded = expandedDates.has(date);

          return (
            <div key={date} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* 日期层 */}
              <button
                onClick={() => toggleDate(date)}
                className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {isDateExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronUp className="h-4 w-4 text-gray-500" />
                  )}
                  <h3 className="text-lg font-semibold text-gray-800">
                    {new Date(date + 'T00:00:00').toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </h3>
                  <span className="text-sm text-gray-500">
                    共 {Object.values(dateData.categories).reduce((sum, cat) =>
                      sum + Object.values(cat.merchants).reduce((s, m) => s + m.items.length, 0), 0)} 笔
                  </span>
                </div>
                <div className="font-semibold text-red-600">
                  -{formatCurrency(dateData.total, 'CNY')}
                </div>
              </button>

              {/* 分类层 */}
              {isDateExpanded && (
                <div className="bg-white">
                  {Object.values(dateData.categories)
                    .sort((a, b) => b.total - a.total)
                    .map(categoryData => {
                      const categoryKey = `${date}-${categoryData.category}`;
                      const isCategoryExpanded = expandedCategories.has(categoryKey);
                      const categoryInfo = PRESET_CATEGORIES.find(c => c.key === categoryData.category);

                      return (
                        <div key={categoryKey} className="border-t border-gray-100">
                          <button
                            onClick={() => toggleCategory(categoryKey)}
                            className="w-full p-3 pl-8 hover:bg-gray-50 transition-colors flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              {isCategoryExpanded ? (
                                <ChevronDown className="h-3 w-3 text-gray-400" />
                              ) : (
                                <ChevronUp className="h-3 w-3 text-gray-400" />
                              )}
                              <CategoryChip category={categoryData.category} />
                              <span className="text-xs text-gray-500">
                                {Object.keys(categoryData.merchants).length}个商家
                              </span>
                            </div>
                            <div className="font-medium text-sm">
                              {formatCurrency(categoryData.total, 'CNY')}
                            </div>
                          </button>

                          {/* 商家层 */}
                          {isCategoryExpanded && (
                            <div>
                              {Object.values(categoryData.merchants)
                                .sort((a, b) => b.total - a.total)
                                .map(merchantData => {
                                  const merchantKey = `${categoryKey}-${merchantData.merchant}`;
                                  const isMerchantExpanded = expandedMerchants.has(merchantKey);

                                  return (
                                    <div key={merchantKey}>
                                      {editingId === merchantData.items[0].id && merchantData.items.length === 1 ? (
                                        // 单笔交易编辑状态
                                        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-200">
                                          {renderEditForm(merchantData.items[0])}
                                        </div>
                                      ) : (
                                        // 商家行（统一样式）
                                        <div className="w-full p-2 pl-16 hover:bg-gray-50 transition-colors flex items-center justify-between group border-t border-gray-100">
                                          <div
                                            className="flex items-center gap-2 flex-1 cursor-pointer"
                                            onClick={() => merchantData.items.length > 1 && toggleMerchant(merchantKey)}
                                          >
                                            {merchantData.items.length > 1 && (
                                              isMerchantExpanded ? (
                                                <ChevronDown className="h-3 w-3 text-gray-400" />
                                              ) : (
                                                <ChevronUp className="h-3 w-3 text-gray-400" />
                                              )
                                            )}
                                            {merchantData.items.length === 1 && (
                                              <div className="w-3" />
                                            )}
                                            <Store className="h-3 w-3 text-blue-600" />
                                            <span className="text-sm text-gray-900">{merchantData.merchant}</span>
                                            {merchantData.items.length > 1 && (
                                              <span className="text-xs text-gray-400">
                                                {merchantData.items.length}笔
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <div className="text-sm font-medium">
                                              {formatCurrency(merchantData.total, 'CNY')}
                                            </div>
                                            {/* 单笔交易：右侧显示编辑/删除图标 */}
                                            {merchantData.items.length === 1 && (
                                              <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEdit(merchantData.items[0]);
                                                  }}
                                                  disabled={loading}
                                                  className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                >
                                                  <Edit className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(merchantData.items[0]);
                                                  }}
                                                  disabled={loading}
                                                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* 产品/交易明细层 */}
                                      {isMerchantExpanded && merchantData.items.length > 1 && (
                                        <div className="bg-gray-50">
                                          {merchantData.items.map(item => (
                                            <div key={item.id}>
                                              {editingId === item.id ? (
                                                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-200">
                                                  {renderEditForm(item)}
                                                </div>
                                              ) : (
                                                <div className="p-2 pl-24 hover:bg-gray-100 transition-colors flex items-center justify-between group border-t border-gray-100">
                                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                                    <div className="w-1 h-1 rounded-full bg-gray-400" />
                                                    <span>{item.product || item.note || '无备注'}</span>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <div className="text-xs font-medium">
                                                      {formatCurrency(Number(item.amount || 0), 'CNY')}
                                                    </div>
                                                    <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          handleEdit(item);
                                                        }}
                                                        disabled={loading}
                                                        className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                      >
                                                        <Edit className="h-3 w-3" />
                                                      </Button>
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          handleDelete(item);
                                                        }}
                                                        disabled={loading}
                                                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                      >
                                                        <Trash2 className="h-3 w-3" />
                                                      </Button>
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}

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
