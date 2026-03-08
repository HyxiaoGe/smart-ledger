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
  Layers3,
  ReceiptText,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { formatDateToLocal } from '@/lib/utils/date';
import { logger } from '@/lib/services/logging';
import { getErrorMessage } from '@/types/common';
import {
  useCreateTransaction,
  useFrequentExpenseAmounts,
  usePaymentMethodsWithDefault,
  useRecentExpenseTransactions,
} from '@/lib/api/hooks';

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
    <div className="space-y-5 sm:space-y-6">
      {showToast && (
        <div>
          <ProgressToast
            message={toastMessage}
            duration={5000}
            onClose={() => setShowToast(false)}
          />
        </div>
      )}

      <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.14),_transparent_28%),linear-gradient(135deg,_#ffffff_0%,_#f8fafc_100%)] p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(135deg,_#020617_0%,_#0f172a_100%)]">
        <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-medium text-sky-700 backdrop-blur dark:border-sky-900 dark:bg-slate-950/60 dark:text-sky-300">
              <Sparkles className="h-3.5 w-3.5" />
              先录入核心信息，再补充细节
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
                快速记一笔支出
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                主流程只保留金额、分类、备注和保存。支付方式、商家、子分类这些次级信息放到后面，减少录入负担。
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                <ReceiptText className="h-3.5 w-3.5" />
                主录入
              </div>
              <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">金额、分类、备注</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                <Layers3 className="h-3.5 w-3.5" />
                快速填充
              </div>
              <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">最近记录与常用金额一键带入</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                <Wallet className="h-3.5 w-3.5" />
                进阶信息
              </div>
              <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">支付方式、商家、子分类按需补充</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)] xl:gap-6">
        <div className="space-y-5 sm:space-y-6">
          <Card className="overflow-hidden border-slate-200 shadow-sm dark:border-slate-800">
            <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-4 pb-4 pt-5 sm:px-6 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-xl">账单录入</CardTitle>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    优先完成必填项，其他信息放到后面补充。
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white dark:bg-slate-100 dark:text-slate-900">
                  <Sparkles className="h-3.5 w-3.5" />
                  保存后自动同步首页与记录页
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-4 sm:space-y-6 sm:p-6">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)]">
                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          金额
                          <span className="ml-1 text-destructive">*</span>
                        </Label>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          支持直接输入数字，失焦后自动格式化。
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
                          当前币种
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
                          高频金额
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
                          先从常用分类里选，找不到再展开完整列表。
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
                        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">备注</Label>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          录完金额和分类后，智能备注会更准确。
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
                </div>

                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                          快速填充
                        </div>
                        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                          最近记录一键带回整套字段，适合高频重复消费。
                        </p>
                      </div>
                      <Clock className="h-4 w-4 text-slate-400" />
                    </div>
                    {recentTransactions.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {recentTransactions.map((tx) => (
                          <button
                            key={tx.id}
                            type="button"
                            onClick={() => applyRecentTransaction(tx)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-sky-400 hover:shadow dark:border-slate-700 dark:bg-slate-950"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {tx.note || tx.merchant || '未填写备注'}
                                </div>
                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  {tx.merchant || '无商家'} · {tx.category || 'other'}
                                </div>
                              </div>
                              <span className="shrink-0 text-sm font-semibold text-slate-900 dark:text-slate-100">
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

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-950">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced((prev) => !prev)}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          进阶信息
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          日期、币种、支付方式、商家、子分类和具体产品。
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
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <Label>
                              币种 <span className="text-destructive">*</span>
                            </Label>
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
                            <Label>
                              日期 <span className="text-destructive">*</span>
                            </Label>
                            <div className="mt-2">
                              <DateInput
                                selected={date}
                                onSelect={setDate}
                                placeholder="选择日期"
                                disabled={isSubmitting}
                              />
                            </div>
                          </div>
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

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          保存策略
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          高频记账时保留表单上下文，减少重复切换。
                        </p>
                      </div>
                    </div>
                    <label className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={keepForm}
                        onChange={(e) => setKeepForm(e.target.checked)}
                        className="mt-0.5"
                      />
                      <span>
                        保存后保留分类、日期和支付方式，方便继续记下一笔。
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      当前准备保存
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {categories.find((c) => c.key === category)?.label || category} ·{' '}
                      {parsedAmount > 0 ? `${currency === 'USD' ? '$' : '¥'}${formatThousand(parsedAmount)}` : '未填写金额'}
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
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
}
