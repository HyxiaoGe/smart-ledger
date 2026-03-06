'use client';
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import type { TransactionType, Currency, Transaction } from '@/types/domain/transaction';
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } from '@/lib/config/config';
import { useCategories } from '@/contexts/CategoryContext';
import { CategoryChip } from '@/components/CategoryChip';
import { ClearableInput } from '@/components/ui/clearable-input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateInput } from '@/components/features/input/DateInput';
import { SmartNoteInput } from '@/components/features/input/SmartNoteInput';
import { MerchantInput, SubcategorySelect } from '@/components/features/input/MerchantInput';
import { ProgressToast } from '@/components/shared/ProgressToast';
import { Clock } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { formatDateToLocal } from '@/lib/utils/date';
import { logger } from '@/lib/services/logging';
import { getErrorMessage } from '@/types/common';
import { useCreateTransaction, usePaymentMethods, useTransactionRowsQuery } from '@/lib/api/hooks';
import { queryKeys } from '@/lib/api/queryClient';

import { SmartSuggestionPanel } from './components';

export default function AddPage() {
  const type: TransactionType = 'expense'; // 固定为支出类型
  const { categories, isLoading: categoriesLoading, getMerchantsForCategory } = useCategories();
  const [category, setCategory] = useState<string>('food');
  const [amountText, setAmountText] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY as Currency);
  const [isSubmitScheduled, setIsSubmitScheduled] = useState(false);
  const [error, setError] = useState<string>('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('账单保存成功！');
  const [showAIPrediction, setShowAIPrediction] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [keepForm, setKeepForm] = useState(true);
  const searchParams = useSearchParams();
  const prefillAppliedRef = useRef(false);

  // 新增：三层数据结构字段
  const [merchant, setMerchant] = useState<string>('');
  const [subcategory, setSubcategory] = useState<string>('');
  const [product, setProduct] = useState<string>('');

  // 新增：支付方式
  const [paymentMethod, setPaymentMethod] = useState<string>('');

  // 防抖相关
  const submitTimeoutRef = useRef<number | null>(null);
  const amountInputRef = useRef<HTMLInputElement | null>(null);
  const parsedAmount = useMemo(() => parseAmount(amountText), [amountText]);
  const invalidAmount = parsedAmount <= 0;
  const createTransaction = useCreateTransaction({
    effectOptions: {
      revalidateServer: true,
    },
  });
  const isSubmitting = isSubmitScheduled || createTransaction.isPending;
  const prefillData = useMemo(() => {
    const categoryParam = searchParams.get('category');
    const amountParam = searchParams.get('amount');
    const noteParam = searchParams.get('note');
    const currencyParam = searchParams.get('currency');
    const merchantParam = searchParams.get('merchant');
    const paymentParam = searchParams.get('payment_method');

    if (
      !categoryParam &&
      !amountParam &&
      !noteParam &&
      !currencyParam &&
      !merchantParam &&
      !paymentParam
    ) {
      return null;
    }

    return {
      category: categoryParam,
      amount: amountParam,
      note: noteParam,
      currency: currencyParam,
      merchant: merchantParam,
      paymentMethod: paymentParam,
    };
  }, [searchParams]);

  function formatThousand(n: number) {
    return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function parseAmount(s: string) {
    const v = s.replace(/,/g, '');
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  const commonCategories = useMemo(() => {
    return [...categories]
      .filter((item) => item.is_active && (item.type === 'expense' || item.type === 'both'))
      .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
      .slice(0, 6);
  }, [categories]);

  const commonMerchants = useMemo(() => {
    return getMerchantsForCategory(category).slice(0, 6);
  }, [getMerchantsForCategory, category]);

  const applyRecentTransaction = useCallback((tx: Transaction) => {
    setCategory(tx.category || 'other');
    setAmountText(formatThousand(Number(tx.amount || 0)));
    setNote(tx.note || '');
    setCurrency((tx.currency || DEFAULT_CURRENCY) as Currency);
    setMerchant(tx.merchant || '');
    setSubcategory(tx.subcategory || '');
    setProduct(tx.product || '');
    setPaymentMethod(tx.payment_method || '');
    setDate(new Date());
    setShowAdvanced(true);
  }, []);

  const fallbackAmounts = useMemo(() => {
    if (currency === 'USD') return [5, 10, 20, 50];
    return [10, 15, 20, 30, 50];
  }, [currency]);

  // 防抖提交函数（依赖数组为空是故意的，避免函数重建）
  const submitTransaction = useCallback(
    async (formData: {
      amt: number;
      category: string;
      categoryLabel: string;
      note: string;
      date: Date;
      currency: Currency;
      keepForm: boolean;
      paymentMethod?: string;
      merchant?: string;
      subcategory?: string;
      product?: string;
    }) => {
      setError('');

      try {
        // 使用本地时区格式化日期，避免时区问题
        const dateStr = formatDateToLocal(formData.date);

        // 使用 API 服务创建交易
        const result = await createTransaction.mutateAsync({
          type,
          category: formData.category,
          amount: formData.amt,
          note: formData.note,
          date: dateStr,
          currency: formData.currency,
          payment_method: formData.paymentMethod || null,
          merchant: formData.merchant || null,
          subcategory: formData.subcategory || null,
          product: formData.product || null
        });

        const transactionId = result.id;

        // ✅ 记录用户操作日志（异步，不阻塞响应）
        void logger.logUserAction({
          action: 'transaction_created',
          metadata: {
            transaction_id: transactionId,
            category: formData.category,
            amount: formData.amt,
            currency: formData.currency,
            payment_method: formData.paymentMethod,
            merchant: formData.merchant,
            subcategory: formData.subcategory,
            note: formData.note ? formData.note.substring(0, 50) : undefined // 只记录前50字符
          }
        });

        // 显示Toast成功提示（带进度条），包含金额和分类信息
        const formattedDate = formData.date.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });

        // 使用传入的分类显示名称
        const categoryLabel = formData.categoryLabel;

        // 格式化金额显示
        const amountDisplay = formData.amt.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        });
        const currencySymbol = formData.currency === 'USD' ? '$' : '¥';

        // 检查是否添加的是历史日期
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const addedDate = new Date(formData.date);
        addedDate.setHours(0, 0, 0, 0);

        if (addedDate.getTime() < today.getTime()) {
          // 历史日期 - 提示用户需要切换月份查看
          setToastMessage(
            `${categoryLabel} ${currencySymbol}${amountDisplay} 已保存到 ${formattedDate}`
          );
        } else {
          setToastMessage(`${categoryLabel} ${currencySymbol}${amountDisplay} 保存成功`);
        }

        setShowToast(true);

        // 延迟重置表单，让用户看到成功提示
        setTimeout(() => {
          resetForm({ keep: formData.keepForm });
          amountInputRef.current?.focus();
        }, 500);
      } catch (err: unknown) {
        setError(getErrorMessage(err) || '提交失败');
      }
    },
    [createTransaction, type]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation(); // 阻止事件冒泡

    if (isSubmitting) {
      return;
    }

    setError('');
    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current);
      submitTimeoutRef.current = null;
    }

    const amt = parsedAmount;
    if (!category || !date) {
      setError('请完整填写必填项');
      return;
    }
    if (!(amt > 0)) {
      setError('金额必须大于 0');
      amountInputRef.current?.focus();
      return;
    }

    // 获取分类显示名称
    const categoryLabel = categories.find((c) => c.key === category)?.label || category;

    // 使用防抖提交
    setIsSubmitScheduled(true);
    submitTimeoutRef.current = window.setTimeout(async () => {
      submitTimeoutRef.current = null;
      try {
        await submitTransaction({
          amt,
          category,
          categoryLabel,
          note,
          date,
          currency,
          keepForm,
          paymentMethod,
          merchant,
          subcategory,
          product
        });
      } finally {
        setIsSubmitScheduled(false);
      }
    }, 200);
  }

  const { data: paymentMethodsData } = usePaymentMethods();
  const paymentMethods = paymentMethodsData || [];
  const defaultPaymentMethodId = useMemo(
    () => paymentMethods.find((method) => method.is_default)?.id || '',
    [paymentMethods]
  );

  // 重置表单
  const resetForm = useCallback(
    ({ keep }: { keep: boolean }) => {
      // 清理防抖状态
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
        submitTimeoutRef.current = null;
      }
      setIsSubmitScheduled(false);

      setAmountText('');
      setNote('');
      if (!keep) {
        setCategory('food');
        setDate(new Date());
        setCurrency(DEFAULT_CURRENCY as Currency);
      }
      setError('');

      if (!keep) {
        setPaymentMethod(defaultPaymentMethodId);
      }

      // 清空三层结构字段
      setMerchant('');
      setSubcategory('');
      setProduct('');
    },
    [defaultPaymentMethodId]
  );

  const { data: recentTransactionsData, isLoading: recentLoading } = useTransactionRowsQuery(
    {
      type: 'expense',
      page_size: 5,
      sort_by: 'created_at',
      sort_order: 'desc'
    },
    {
      queryKey: queryKeys.transactions.recent(5, 'expense')
    }
  );

  const recentTransactions = useMemo(() => {
    return (recentTransactionsData || []) as Transaction[];
  }, [recentTransactionsData]);

  // 去重后的最近记录（基于 category + amount + note/merchant 组合）
  const recentQuickList = useMemo(() => {
    const seen = new Set<string>();
    const deduplicated: Transaction[] = [];
    for (const tx of recentTransactions) {
      // 生成去重键：分类 + 金额（保留两位小数）+ 备注或商户
      const key = `${tx.category}|${Number(tx.amount || 0).toFixed(2)}|${tx.note || tx.merchant || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(tx);
        if (deduplicated.length >= 3) break;
      }
    }
    return deduplicated;
  }, [recentTransactions]);

  const { data: frequentAmountData } = useTransactionRowsQuery(
    useMemo(() => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return {
        type: 'expense' as const,
        currency,
        start_date: formatDateToLocal(start),
        end_date: formatDateToLocal(end),
        page_size: 100,
        sort_by: 'date' as const,
        sort_order: 'desc' as const
      };
    }, [currency]),
    {
      queryKey: queryKeys.transactions.frequentAmounts(currency)
    }
  );

  const quickAmounts = useMemo(() => {
    const rows = (frequentAmountData || []) as Transaction[];
    if (!rows.length) return fallbackAmounts;

    const counts = new Map<number, number>();
    for (const tx of rows) {
      const amount = Number(tx.amount || 0);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      const rounded = Math.round(amount * 100) / 100;
      counts.set(rounded, (counts.get(rounded) || 0) + 1);
    }

    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || b[0] - a[0])
      .slice(0, 5)
      .map(([amount]) => amount);

    return sorted.length ? sorted : fallbackAmounts;
  }, [frequentAmountData, fallbackAmounts]);

  useEffect(() => {
    if (!defaultPaymentMethodId || paymentMethod) {
      return;
    }

    setPaymentMethod(defaultPaymentMethodId);
  }, [defaultPaymentMethodId, paymentMethod]);

  useEffect(() => {
    if (prefillAppliedRef.current) return;
    if (!prefillData) {
      return;
    }

    if (prefillData.category) setCategory(prefillData.category);
    if (prefillData.amount && !Number.isNaN(Number(prefillData.amount))) {
      setAmountText(formatThousand(Number(prefillData.amount)));
    }
    if (prefillData.note) setNote(prefillData.note);
    if (prefillData.currency) setCurrency(prefillData.currency as Currency);
    if (prefillData.merchant) setMerchant(prefillData.merchant);
    if (prefillData.paymentMethod) setPaymentMethod(prefillData.paymentMethod);
    if (prefillData.merchant || prefillData.paymentMethod) setShowAdvanced(true);

    prefillAppliedRef.current = true;
  }, [prefillData]);

  // 组件卸载时清理
  React.useEffect(() => {
    return () => {
      // 组件卸载时清理所有定时器和状态
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {showToast && (
        <div className="lg:col-span-3">
          <ProgressToast
            message={toastMessage}
            duration={5000}
            onClose={() => setShowToast(false)}
          />
        </div>
      )}

      {/* 左侧：添加账单表单 */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>添加账单</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              {recentTransactions.length > 0 && (
                <div>
                  <div className="flex items-center justify-between">
                    <Label>最近记录</Label>
                    <span className="text-xs text-muted-foreground">点击一键填充</span>
                  </div>
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {recentTransactions.map((tx) => (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() => applyRecentTransaction(tx)}
                        className="min-w-[180px] rounded-md border border-border bg-background px-3 py-2 text-left text-sm shadow-sm transition hover:border-blue-400 hover:shadow"
                      >
                        <div className="flex items-center justify-between">
                          <CategoryChip category={tx.category || 'other'} />
                          <span className="font-semibold">
                            {formatThousand(Number(tx.amount || 0))}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span className="truncate">{tx.note || tx.merchant || '未填写备注'}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {recentLoading && (
                <div className="text-xs text-muted-foreground">加载最近记录中...</div>
              )}
              <div>
                <Label>
                  分类 <span className="text-destructive">*</span>
                </Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm disabled:opacity-50 dark:bg-gray-800 transition-all duration-200 ease-in-out hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm cursor-pointer"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isSubmitting || categoriesLoading}
                >
                  {categories.map((c) => (
                    <option
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                      key={c.key}
                      value={c.key}
                    >
                      {c.icon ? `${c.icon} ` : ''}
                      {c.label}
                    </option>
                  ))}
                </select>
                <div className="mt-2">
                  <CategoryChip category={category} />
                </div>
              </div>
              <div>
                <Label>
                  金额 <span className="text-destructive">*</span>
                </Label>
                <ClearableInput
                  ref={amountInputRef}
                  placeholder="请输入金额"
                  value={amountText}
                  onChange={(e) => {
                    const raw = e.target.value;
                    // 允许输入数字、小数点与逗号
                    if (/^[0-9.,]*$/.test(raw)) setAmountText(raw);
                  }}
                  onClear={() => setAmountText('')}
                  onBlur={() => {
                    // 只在有有效金额时格式化，空白保持空白
                    if (amountText.trim() && parsedAmount > 0) {
                      setAmountText(formatThousand(parsedAmount));
                    }
                  }}
                  className={amountText.trim() && invalidAmount ? 'border-destructive' : undefined}
                  disabled={isSubmitting}
                />
                {amountText.trim() && invalidAmount && (
                  <p className="mt-1 text-sm text-destructive">金额必须大于 0</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>
                    币种 <span className="text-destructive">*</span>
                  </Label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm disabled:opacity-50 dark:bg-gray-800 transition-all duration-200 ease-in-out hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm cursor-pointer"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as Currency)}
                    disabled={isSubmitting}
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option
                        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                        key={c.code}
                        value={c.code as string}
                      >
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>
                    日期 <span className="text-destructive">*</span>
                  </Label>
                  <DateInput
                    selected={date}
                    onSelect={setDate}
                    placeholder="选择日期"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((prev) => !prev)}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                >
                  <span className="font-medium">高级信息</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    （支付方式 / 商家 / 子分类）
                  </span>
                </button>

                {showAdvanced && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <Label>支付方式</Label>
                      <select
                        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm disabled:opacity-50 dark:bg-gray-800 transition-all duration-200 ease-in-out hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm cursor-pointer"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        disabled={isSubmitting}
                      >
                        <option
                          className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                          value=""
                        >
                          未设置
                        </option>
                        {paymentMethods.map((pm) => (
                          <option
                            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                            key={pm.id}
                            value={pm.id}
                          >
                            {pm.name}
                            {pm.is_default ? ' (默认)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>商家/品牌</Label>
                        <MerchantInput
                          value={merchant}
                          onChange={setMerchant}
                          placeholder="如：瑞幸咖啡、地铁"
                          disabled={isSubmitting}
                          category={category}
                        />
                      </div>
                      <div>
                        <Label>子分类</Label>
                        <SubcategorySelect
                          category={category}
                          value={subcategory}
                          onChange={setSubcategory}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>具体产品/服务</Label>
                      <ClearableInput
                        value={product}
                        onChange={(e) => setProduct(e.target.value)}
                        onClear={() => setProduct('')}
                        placeholder="如：生椰拿铁、地铁票"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label>备注</Label>
                <SmartNoteInput
                  value={note}
                  onChange={setNote}
                  placeholder="选择分类和金额后，智能提示将自动显示"
                  disabled={isSubmitting}
                  category={category}
                  amount={parsedAmount}
                  currency={currency}
                  onSuggestionSelected={() => {
                    // 这里可以添加额外的逻辑，比如统计用户使用建议的偏好
                  }}
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}

              <div>
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? '保存中...' : '保存账单'}
                </Button>
                <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={keepForm}
                    onChange={(e) => setKeepForm(e.target.checked)}
                  />
                  保存后保留分类/日期/支付方式
                </label>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* 右侧：智能建议面板 */}
      <SmartSuggestionPanel
        showPanel={showAIPrediction}
        onTogglePanel={() => setShowAIPrediction(!showAIPrediction)}
        commonCategories={commonCategories}
        selectedCategory={category}
        onSelectCategory={setCategory}
        commonMerchants={commonMerchants}
        selectedMerchant={merchant}
        onSelectMerchant={(m) => {
          setMerchant(m);
          setShowAdvanced(true);
        }}
        quickAmounts={quickAmounts}
        currentAmount={parsedAmount}
        onSelectAmount={(amount) => setAmountText(formatThousand(amount))}
        recentTransactions={recentQuickList}
        onApplyTransaction={applyRecentTransaction}
      />
    </div>
  );
}
