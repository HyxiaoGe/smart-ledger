"use client";
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { AIPredictionPanel } from '@/components/features/ai-analysis/AIPredictionPanel';
import { enhancedDataSync, markTransactionsDirty } from '@/lib/core/EnhancedDataSync';
import { ProgressToast } from '@/components/shared/ProgressToast';
import { paymentMethodsApi } from '@/lib/api/services/payment-methods';
import { transactionsApi } from '@/lib/api/services/transactions';
import { commonNotesApi } from '@/lib/api/services/common-notes';
import { aiApi } from '@/lib/api/services/ai';
import { Clock } from 'lucide-react';
// AI 预测类型定义
interface TransactionPrediction {
  id: string;
  type: 'category' | 'amount' | 'full';
  confidence: number;
  reason: string;
  predictedCategory?: string;
  predictedAmount?: number;
  suggestedNote?: string;
  metadata?: any;
}

interface QuickTransactionSuggestion {
  id: string;
  title: string;
  description: string;
  category: string;
  amount: number;
  note: string;
  confidence: number;
  icon?: string;
  reason: string;
}
import { formatDateToLocal } from '@/lib/utils/date';
import { logger } from '@/lib/services/logging';
import { STORAGE_KEYS } from '@/lib/config/storageKeys';
import { getErrorMessage } from '@/types/common';

import type { PaymentMethod } from '@/lib/api/services/payment-methods';

export default function AddPage() {
  const type: TransactionType = 'expense'; // 固定为支出类型
  const { categories, isLoading: categoriesLoading, getMerchantsForCategory } = useCategories();
  const [category, setCategory] = useState<string>('food');
    const [amountText, setAmountText] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY as Currency);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('账单保存成功！');
  const [showAIPrediction, setShowAIPrediction] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 新增：三层数据结构字段
  const [merchant, setMerchant] = useState<string>('');
  const [subcategory, setSubcategory] = useState<string>('');
  const [product, setProduct] = useState<string>('');

  // 新增：支付方式
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>('');

  // 防抖相关
  const submitTimeoutRef = useRef<number | null>(null);
  const lastSubmitTimeRef = useRef<number>(0);
  const isSubmittingRef = useRef<boolean>(false); // 强制提交状态
  const parsedAmount = useMemo(() => parseAmount(amountText), [amountText]);
  const invalidAmount = parsedAmount <= 0;

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

  const applyRecentTransaction = useCallback(
    (tx: Transaction) => {
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
    },
    []
  );

  // 防抖提交函数
  const debouncedSubmit = useCallback(async (formData: {
    amt: number;
    category: string;
    note: string;
    date: Date;
    currency: Currency;
    paymentMethod?: string;
    merchant?: string;
    subcategory?: string;
    product?: string;
  }) => {
    setLoading(true);
    setError('');

    try {
      // 使用本地时区格式化日期，避免时区问题
      const dateStr = formatDateToLocal(formData.date);

      // 使用 API 服务创建交易
      const result = await transactionsApi.create({
        type,
        category: formData.category,
        amount: formData.amt,
        note: formData.note,
        date: dateStr,
        currency: formData.currency,
        payment_method: formData.paymentMethod || null,
        merchant: formData.merchant || null,
        subcategory: formData.subcategory || null,
        product: formData.product || null,
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
          note: formData.note ? formData.note.substring(0, 50) : undefined, // 只记录前50字符
        },
      });

      // 显示Toast成功提示（带进度条），包含日期信息
      const formattedDate = formData.date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });

      // 检查是否添加的是历史日期
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const addedDate = new Date(formData.date);
      addedDate.setHours(0, 0, 0, 0);

      if (addedDate.getTime() < today.getTime()) {
        // 历史日期 - 提示用户需要切换月份查看
        setToastMessage(`账单已保存到 ${formattedDate}！切换到对应月份查看`);
      } else {
        setToastMessage('账单保存成功！');
      }

      setShowToast(true);

      // 触发增强版同步事件（会自动显示 Toast 通知）
      enhancedDataSync.notifyTransactionAdded({
        type,
        category: formData.category,
        amount: formData.amt,
        note: formData.note,
        date: dateStr, // 使用已经格式化好的本地日期字符串
        currency: formData.currency,
        merchant: formData.merchant,
        subcategory: formData.subcategory,
        product: formData.product
      });
      markTransactionsDirty();

      // 异步刷新缓存（带错误日志）
      aiApi.revalidate('transactions').catch((err) => {
        console.error('缓存刷新失败:', err);
      });

      // 更新常用备注（带错误日志）
      if (formData.note && formData.note.trim()) {
        updateCommonNote(formData.note.trim(), formData.amt).catch((err) => {
          console.error('更新常用备注失败:', err);
        });
      }

      // 延迟重置表单，让用户看到成功提示
      setTimeout(() => {
        resetForm();
      }, 500);

    } catch (err: unknown) {
      setError(getErrorMessage(err) || '提交失败');
    } finally {
      setLoading(false);
      lastSubmitTimeRef.current = 0; // 重置时间戳，允许下次提交
      isSubmittingRef.current = false; // 重置提交状态
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation(); // 阻止事件冒泡


    // 强制防重复提交检查
    if (isSubmittingRef.current || loading) {
      return;
    }

    // 防抖处理：500ms内只允许一次提交
    const now = Date.now();
    if (now - lastSubmitTimeRef.current < 500) {
      return;
    }

    // 立即设置提交状态，防止重复
    isSubmittingRef.current = true;
    lastSubmitTimeRef.current = now;
    setLoading(true);


    // 清除之前的定时器
    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current);
    }

    const amt = parsedAmount;
    if (!category || !date) {
      setError('请完整填写必填项');
      isSubmittingRef.current = false;
      setLoading(false);
      return;
    }
    if (!(amt > 0)) {
      setError('金额必须大于 0');
      isSubmittingRef.current = false;
      setLoading(false);
      return;
    }

    // 使用防抖提交
    submitTimeoutRef.current = setTimeout(() => {
      debouncedSubmit({ amt, category, note, date, currency, paymentMethod, merchant, subcategory, product });
    }, 200) as any as number; // 200ms 延迟
  }

  // 处理AI预测选择
  const handlePredictionSelect = useCallback((prediction: TransactionPrediction | QuickTransactionSuggestion) => {
    let updatedCategory = category;
    let updatedAmount = parsedAmount;
    let updatedNote = note;

    if ('predictedCategory' in prediction && prediction.predictedCategory) {
      updatedCategory = prediction.predictedCategory;
      setCategory(updatedCategory);
    }

    if ('predictedAmount' in prediction && prediction.predictedAmount) {
      updatedAmount = prediction.predictedAmount;
      setAmountText(formatThousand(updatedAmount));
    }

    if ('suggestedNote' in prediction && prediction.suggestedNote) {
      updatedNote = prediction.suggestedNote;
      setNote(updatedNote);
    } else if ('note' in prediction && prediction.note) {
      updatedNote = prediction.note;
      setNote(updatedNote);
    }

    // 如果是快速建议且有完整数据，可以自动提交
    if ('category' in prediction && 'amount' in prediction && 'note' in prediction) {
      const quickSuggestion = prediction as QuickTransactionSuggestion;
      setCategory(quickSuggestion.category);
      setAmountText(formatThousand(quickSuggestion.amount));
      setNote(quickSuggestion.note);

      // 自动聚焦到备注输入框让用户确认
      setTimeout(() => {
        const noteInput = document.querySelector('input[placeholder*="备注"]') as HTMLInputElement;
        if (noteInput) {
          noteInput.focus();
          noteInput.select();
        }
      }, 100);
    }
  }, [category, parsedAmount, note]);

  // 重置表单
  function resetForm() {
    // 清理防抖状态
    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current);
      submitTimeoutRef.current = null;
    }
    lastSubmitTimeRef.current = 0;
    isSubmittingRef.current = false;

    setCategory('food');
    setAmountText('');
    setNote('');
    setDate(new Date());
    setCurrency(DEFAULT_CURRENCY as Currency);
    setError('');

    // 重置为默认支付方式
    const defaultMethod = paymentMethods.find(m => m.is_default);
    if (defaultMethod) {
      setPaymentMethod(defaultMethod.id);
    }

    // 清空三层结构字段
    setMerchant('');
    setSubcategory('');
    setProduct('');
  }

  // 使用 React Query 加载支付方式列表
  const { data: paymentMethodsData } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => paymentMethodsApi.list(),
  });

  const { data: recentTransactionsData, isLoading: recentLoading } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: () =>
      transactionsApi.list({
        type: 'expense',
        page_size: 5,
        sort_by: 'created_at',
        sort_order: 'desc',
      }),
  });

  const recentTransactions = useMemo(() => {
    if (!recentTransactionsData) return [];
    return (recentTransactionsData.data || recentTransactionsData.transactions || []) as Transaction[];
  }, [recentTransactionsData]);

  // 当支付方式数据加载完成时更新状态
  useEffect(() => {
    if (paymentMethodsData) {
      setPaymentMethods(paymentMethodsData);
      const defaultMethod = paymentMethodsData.find(m => m.is_default);
      if (defaultMethod && !paymentMethod) {
        setPaymentMethod(defaultMethod.id);
      }
    }
  }, [paymentMethodsData, paymentMethod]);

  // 组件卸载时清理
  React.useEffect(() => {
    return () => {
      // 组件卸载时清理所有定时器和状态
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
      isSubmittingRef.current = false;
    };
  }, []);

  // 异步更新常用备注
  async function updateCommonNote(noteContent: string, amount: number) {
    try {
      await commonNotesApi.upsert({
        content: noteContent,
        amount: amount,
      });
      // 清除本地缓存，强制下次重新获取最新数据
      localStorage.removeItem(STORAGE_KEYS.COMMON_NOTES_CACHE);
    } catch {
      // ignore note update failures
    }
  }

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
                        <span className="truncate">
                          {tx.note || tx.merchant || '未填写备注'}
                        </span>
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
              <Label>分类 <span className="text-destructive">*</span></Label>
              {!categoriesLoading && commonCategories.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {commonCategories.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setCategory(item.key)}
                      className={`rounded-full border px-2 py-1 text-xs transition ${
                        category === item.key
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : 'border-border text-muted-foreground hover:border-blue-400 hover:text-foreground'
                      }`}
                    >
                      {item.icon ? `${item.icon} ` : ''}
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
              <select
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm disabled:opacity-50 dark:bg-gray-800 transition-all duration-200 ease-in-out hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm cursor-pointer"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={loading || categoriesLoading}
              >
                {categories.map((c) => (
                  <option className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700" key={c.key} value={c.key}>
                    {c.icon ? `${c.icon} ` : ''}{c.label}
                  </option>
                ))}
              </select>
              <div className="mt-2">
                <CategoryChip category={category} />
              </div>
            </div>
            <div>
              <Label>金额 <span className="text-destructive">*</span></Label>
              <ClearableInput
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
                disabled={loading}
              />
              {amountText.trim() && invalidAmount && <p className="mt-1 text-sm text-destructive">金额必须大于 0</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>币种 <span className="text-destructive">*</span></Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm disabled:opacity-50 dark:bg-gray-800 transition-all duration-200 ease-in-out hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm cursor-pointer"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  disabled={loading}
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700" key={c.code} value={c.code as string}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>日期 <span className="text-destructive">*</span></Label>
                <DateInput
                  selected={date}
                  onSelect={setDate}
                  placeholder="选择日期"
                  disabled={loading}
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
                <span className="text-xs text-gray-400 dark:text-gray-500">（支付方式 / 商家 / 子分类）</span>
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-4">
                  <div>
                    <Label>支付方式</Label>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm disabled:opacity-50 dark:bg-gray-800 transition-all duration-200 ease-in-out hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm cursor-pointer"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      disabled={loading}
                    >
                      <option className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700" value="">未设置</option>
                      {paymentMethods.map((pm) => (
                        <option className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700" key={pm.id} value={pm.id}>
                          {pm.name}{pm.is_default ? ' (默认)' : ''}
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
                        disabled={loading}
                        category={category}
                      />
                      {commonMerchants.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {commonMerchants.map((item) => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => setMerchant(item)}
                              className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground transition hover:border-blue-400 hover:text-foreground"
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>子分类</Label>
                      <SubcategorySelect
                        category={category}
                        value={subcategory}
                        onChange={setSubcategory}
                        disabled={loading}
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
                      disabled={loading}
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
                disabled={loading}
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
              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? '保存中...' : '保存账单'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>

      {/* 右侧：AI预测面板 */}
      <div className="lg:col-span-1">
        {showAIPrediction && (
          <AIPredictionPanel
            onPredictionSelect={handlePredictionSelect}
            currentAmount={parsedAmount}
            currentCategory={category}
            className="sticky top-6"
          />
        )}

        {/* AI预测开关 */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-blue-700 dark:text-blue-400">AI智能预测</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAIPrediction(!showAIPrediction)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 h-6 px-2"
            >
              {showAIPrediction ? '隐藏' : '显示'}
            </Button>
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
            基于您的历史数据智能预测分类和金额，让记账更快速
          </p>
        </div>
      </div>
    </div>
  );
}
