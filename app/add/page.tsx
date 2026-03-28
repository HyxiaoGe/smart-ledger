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
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  CalendarDays,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { formatDateToLocal } from '@/lib/utils/date';
import { logger } from '@/lib/services/logging';
import { getErrorMessage } from '@/types/common';
import {
  transactionsApi,
  type TransactionEnrichmentPreviewField,
} from '@/lib/api/services/transactions';
import {
  useCreateTransaction,
  useFrequentExpenseAmounts,
  usePaymentMethodsWithDefault,
  useRecentExpenseTransactions,
} from '@/lib/api/hooks';

import type { RecentQuickTransaction } from './components/SmartSuggestionPanel';

export default function AddPage() {
  const type: TransactionType = 'expense'; // 固定为支出类型
  const { categories, isLoading: categoriesLoading } = useCategories();
  const [category, setCategory] = useState<string>('food');
  const [amountText, setAmountText] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY as Currency);
  const [isSubmitScheduled, setIsSubmitScheduled] = useState(false);
  const [error, setError] = useState<string>('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('账单保存成功！');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [keepForm, setKeepForm] = useState(true);
  const [enrichmentFields, setEnrichmentFields] = useState<TransactionEnrichmentPreviewField[]>([]);
  const [isEnrichmentLoading, setIsEnrichmentLoading] = useState(false);
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

  const { paymentMethods, defaultPaymentMethodId } = usePaymentMethodsWithDefault();

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

  const { data: recentTransactionsData, isLoading: recentLoading } =
    useRecentExpenseTransactions(5);

  const recentTransactions = useMemo(() => {
    return (recentTransactionsData || []) as Transaction[];
  }, [recentTransactionsData]);

  // 合并后的最近记录（按 category + amount + currency 聚合，保留最近一条）
  const recentQuickList = useMemo(() => {
    const grouped = new Map<string, RecentQuickTransaction>();
    for (const tx of recentTransactions) {
      const key = `${tx.category}|${Number(tx.amount || 0).toFixed(2)}|${tx.currency || DEFAULT_CURRENCY}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.duplicateCount += 1;
        continue;
      }
      grouped.set(key, {
        ...tx,
        duplicateCount: 1,
      });
    }

    return Array.from(grouped.values()).slice(0, 3);
  }, [recentTransactions]);

  const { amounts: frequentAmounts } = useFrequentExpenseAmounts(currency, {
    days: 30,
    limit: 5,
  });

  const quickAmounts = useMemo(() => {
    return frequentAmounts.length ? frequentAmounts : fallbackAmounts;
  }, [fallbackAmounts, frequentAmounts]);

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
    prefillAppliedRef.current = true;
  }, [prefillData]);

  useEffect(() => {
    if (!category || !(parsedAmount > 0) || !date) {
      setEnrichmentFields([]);
      setIsEnrichmentLoading(false);
      return;
    }

    let active = true;
    setIsEnrichmentLoading(true);

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await transactionsApi.previewEnrichment({
          type,
          category,
          amount: parsedAmount,
          note,
          date: formatDateToLocal(date),
          currency,
          payment_method: paymentMethod || null,
          merchant: merchant || null,
          subcategory: subcategory || null,
          product: product || null,
        });

        if (!active) {
          return;
        }

        setEnrichmentFields(response.fields || []);
      } catch (previewError) {
        if (!active) {
          return;
        }

        console.error('获取 enrich 预览失败:', previewError);
        setEnrichmentFields([]);
      } finally {
        if (active) {
          setIsEnrichmentLoading(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [type, category, parsedAmount, note, date, currency, paymentMethod, merchant, subcategory, product]);

  const isSameDay = useCallback((left: Date, right: Date) => {
    return (
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
    );
  }, []);

  const today = useMemo(() => {
    const next = new Date();
    next.setHours(0, 0, 0, 0);
    return next;
  }, []);

  const yesterday = useMemo(() => {
    const next = new Date(today);
    next.setDate(next.getDate() - 1);
    return next;
  }, [today]);

  const isToday = useMemo(() => isSameDay(date, today), [date, isSameDay, today]);
  const isYesterday = useMemo(() => isSameDay(date, yesterday), [date, isSameDay, yesterday]);

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
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      {showToast && (
        <div>
          <ProgressToast
            message={toastMessage}
            duration={5000}
            onClose={() => setShowToast(false)}
          />
        </div>
      )}

      <Card className="overflow-visible border-slate-200 shadow-sm dark:border-slate-800">
        <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-4 pb-4 pt-5 sm:px-6 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl">添加账单</CardTitle>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                先定日期，再填金额和分类。其他信息按需补充。
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white dark:bg-slate-100 dark:text-slate-900">
              <Sparkles className="h-3.5 w-3.5" />
              默认自动同步首页与记录页
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <form
            onSubmit={onSubmit}
            className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]"
          >
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      日期
                      <span className="ml-1 text-destructive">*</span>
                    </Label>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      先确认这笔账记在哪一天，补录时更顺手。
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm dark:bg-slate-950 dark:text-slate-300">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {isToday ? '今天' : isYesterday ? '昨天' : '其他日期'}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDate(new Date(today))}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      isToday
                        ? 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                        : 'border-slate-200 text-slate-700 hover:border-sky-400 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    今天
                  </button>
                  <button
                    type="button"
                    onClick={() => setDate(new Date(yesterday))}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      isYesterday
                        ? 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                        : 'border-slate-200 text-slate-700 hover:border-sky-400 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    昨天
                  </button>
                </div>

                <div className="mt-3 max-w-md">
                  <DateInput
                    selected={date}
                    onSelect={setDate}
                    placeholder="选择其他日期"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      金额
                      <span className="ml-1 text-destructive">*</span>
                    </Label>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      先把金额输进去，后面的建议才有意义。
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
                      币种
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {currency}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <ClearableInput
                    ref={amountInputRef}
                    placeholder="例如 23.5"
                    value={amountText}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (/^[0-9.,]*$/.test(raw)) setAmountText(raw);
                    }}
                    onClear={() => setAmountText('')}
                    onBlur={() => {
                      if (amountText.trim() && parsedAmount > 0) {
                        setAmountText(formatThousand(parsedAmount));
                      }
                    }}
                    className={`h-14 text-[1.75rem] font-semibold tracking-tight sm:h-16 sm:text-3xl ${
                      amountText.trim() && invalidAmount ? 'border-destructive' : ''
                    }`}
                    disabled={isSubmitting}
                  />
                  {amountText.trim() && invalidAmount && (
                    <p className="mt-2 text-sm text-destructive">金额必须大于 0</p>
                  )}
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                      常用金额
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">点一下直接带入</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {quickAmounts.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setAmountText(formatThousand(item))}
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                          Math.abs(parsedAmount - item) < 0.001
                            ? 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                            : 'border-slate-200 text-slate-700 hover:border-sky-400 hover:text-sky-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-300'
                        }`}
                      >
                        {formatThousand(item)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      分类
                      <span className="ml-1 text-destructive">*</span>
                    </Label>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      先用常用分类，找不到再展开完整列表。
                    </p>
                  </div>
                  <CategoryChip category={category} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {commonCategories.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setCategory(item.key)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                        category === item.key
                          ? 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                          : 'border-slate-200 text-slate-700 hover:border-sky-400 dark:border-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {item.icon ? `${item.icon} ` : ''}
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="mt-4">
                  <select
                    className="h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm disabled:opacity-50 dark:bg-gray-800 transition-all duration-200 ease-in-out hover:border-blue-400 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:ring-offset-2 dark:hover:border-blue-500 cursor-pointer"
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
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      备注
                      <span className="ml-1 text-xs font-normal text-slate-400">可选</span>
                    </Label>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      写一句方便回忆就够了，建议只在你准备填写备注时出现。
                    </p>
                  </div>
                  <Sparkles className="h-4 w-4 text-sky-500" />
                </div>
                <div className="mt-4">
                  <SmartNoteInput
                    value={note}
                    onChange={setNote}
                    placeholder="例如：午饭、咖啡、打车回家"
                    disabled={isSubmitting}
                    category={category}
                    amount={parsedAmount}
                    currency={currency}
                    onSuggestionSelected={() => {}}
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      当前准备保存
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {isToday ? '今天' : isYesterday ? '昨天' : date.toLocaleDateString('zh-CN')} ·{' '}
                      {categories.find((c) => c.key === category)?.label || category} ·{' '}
                      {parsedAmount > 0
                        ? `${currency === 'USD' ? '$' : '¥'}${formatThousand(parsedAmount)}`
                        : '未填写金额'}
                    </p>
                  </div>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-h-11 w-full rounded-xl sm:w-auto sm:min-w-[180px]"
                  >
                    {isSubmitting ? '保存中...' : '保存账单'}
                  </Button>
                </div>

                <label className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={keepForm}
                    onChange={(e) => setKeepForm(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>保存后保留日期、分类和支付方式，方便继续记下一笔。</span>
                </label>
              </div>
            </div>

            <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
              {(recentQuickList.length > 0 || recentLoading) && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        快速带入
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        重复消费直接带入金额、分类和备注，减少重复输入。
                      </p>
                    </div>
                    <Clock className="h-4 w-4 text-slate-400" />
                  </div>

                  {recentQuickList.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {recentQuickList.map((tx) => (
                        <button
                          key={tx.id}
                          type="button"
                          onClick={() => applyRecentTransaction(tx)}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-sky-400 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-950"
                        >
                          <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                            {tx.note || tx.merchant || '未填写备注'}
                          </div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {tx.merchant || '无商家'} · {tx.category || 'other'}
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                            <span>
                              最近一次
                              {tx.duplicateCount > 1 ? ` · 共 ${tx.duplicateCount} 次` : ''}
                            </span>
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                              {formatThousand(Number(tx.amount || 0))}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {recentLoading && (
                    <div className="mt-4 text-xs text-muted-foreground">加载最近记录中...</div>
                  )}
                </div>
              )}

              {(isEnrichmentLoading || enrichmentFields.length > 0) && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm sm:p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                        系统自动补全
                      </div>
                      <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                        这些字段会在保存时自动 enrich，通常不用再手动展开填写。
                      </p>
                    </div>
                    <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>

                  {isEnrichmentLoading ? (
                    <div className="mt-4 text-xs text-emerald-700 dark:text-emerald-300">
                      正在根据历史记录分析可自动补全的字段...
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {enrichmentFields.map((field) => (
                        <div
                          key={field.key}
                          className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                        >
                          {field.label}：{field.displayValue || field.value}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-950">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((prev) => !prev)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      手动覆盖与补充
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      只有在你想覆盖系统补全，或者补充缺失信息时，才需要展开这里。
                    </p>
                  </div>
                  {showAdvanced ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </button>

                {showAdvanced && (
                  <div className="mt-5 space-y-4 border-t border-slate-100 pt-5 dark:border-slate-800">
                    <div>
                      <Label>币种</Label>
                      <select
                        className="mt-2 h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm disabled:opacity-50 dark:bg-gray-800 transition-all duration-200 ease-in-out hover:border-blue-400 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:ring-offset-2 dark:hover:border-blue-500 cursor-pointer"
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
                      <Label>支付方式</Label>
                      <select
                        className="mt-2 h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm disabled:opacity-50 dark:bg-gray-800 transition-all duration-200 ease-in-out hover:border-blue-400 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:ring-offset-2 dark:hover:border-blue-500 cursor-pointer"
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

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <Label>商家/品牌</Label>
                        <div className="mt-2">
                          <MerchantInput
                            value={merchant}
                            onChange={setMerchant}
                            placeholder="如：瑞幸咖啡、地铁"
                            disabled={isSubmitting}
                            category={category}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>子分类</Label>
                        <div className="mt-2">
                          <SubcategorySelect
                            category={category}
                            value={subcategory}
                            onChange={setSubcategory}
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>具体产品/服务</Label>
                      <div className="mt-2">
                        <ClearableInput
                          value={product}
                          onChange={(e) => setProduct(e.target.value)}
                          onClear={() => setProduct('')}
                          placeholder="如：生椰拿铁、地铁票"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
