"use client";
import React, { useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/clients/supabase/client';
import type { TransactionType, Currency } from '@/types/transaction';
import { PRESET_CATEGORIES, SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } from '@/lib/config/config';
import { CategoryChip } from '@/components/CategoryChip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateInput } from '@/components/features/input/DateInput';
import { SmartNoteInput } from '@/components/features/input/SmartNoteInput';
import { AIPredictionPanel } from '@/components/features/ai-analysis/AIPredictionPanel';
import { dataSync, markTransactionsDirty } from '@/lib/core/dataSync';
import { ProgressToast } from '@/components/shared/ProgressToast';
import type { TransactionPrediction, QuickTransactionSuggestion } from '@/lib/services/aiPrediction';
import { formatDateToLocal } from '@/lib/utils/date';

export default function AddPage() {
  const type: TransactionType = 'expense'; // 固定为支出类型
  const [category, setCategory] = useState<string>('food');
    const [amountText, setAmountText] = useState<string>('0');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY as Currency);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('账单保存成功！');
  const [showAIPrediction, setShowAIPrediction] = useState(true);

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

  // 防抖提交函数
  const debouncedSubmit = useCallback(async (formData: {
    amt: number;
    category: string;
    note: string;
    date: Date;
    currency: Currency;
  }) => {
    setLoading(true);
    setError('');

    try {
      // 使用本地时区格式化日期，避免时区问题
      const dateStr = formatDateToLocal(formData.date);
      console.log('🔍 准备保存账单:', {
        date: dateStr,
        category: formData.category,
        amount: formData.amt,
        note: formData.note
      });

      // 先查询是否存在相同业务记录（包括已删除的）
      const { data: existingRecord, error: queryError } = await supabase
        .from('transactions')
        .select('*')
        .eq('type', type)
        .eq('category', formData.category)
        .eq('date', dateStr)
        .eq('currency', formData.currency)
        .eq('note', formData.note)
        .single();

      console.log('🔍 查询结果:', { existingRecord, queryError });

      let transactionError;

      if (existingRecord) {
        if (existingRecord.deleted_at) {
          // 记录已删除，替换为新金额而不是累加
          const { error: updateError } = await supabase
            .from('transactions')
            .update({
              amount: formData.amt, // 使用新金额，不累加
              deleted_at: null // 恢复记录
            })
            .eq('id', existingRecord.id);

          transactionError = updateError;
        } else {
          // 记录未删除，累加金额
          const { error: updateError } = await supabase
            .from('transactions')
            .update({
              amount: existingRecord.amount + formData.amt
            })
            .eq('id', existingRecord.id);

          transactionError = updateError;
        }
      } else {
        // 不存在任何记录，插入新记录
        console.log('➕ 插入新记录:', {
          type,
          category: formData.category,
          amount: formData.amt,
          note: formData.note,
          date: dateStr,
          currency: formData.currency
        });

        const { data: insertData, error: insertError } = await supabase
          .from('transactions')
          .insert([{
            type,
            category: formData.category,
            amount: formData.amt,
            note: formData.note,
            date: dateStr,
            currency: formData.currency
          }])
          .select();

        console.log('✅ 插入结果:', { insertData, insertError });
        transactionError = insertError;
      }

      // 处理查询和更新/插入错误
      if (queryError && queryError.code !== 'PGRST116') { // PGRST116表示没有找到记录
        console.error('❌ 查询错误:', queryError);
        throw queryError;
      }

      if (transactionError) {
        console.error('❌ 保存错误:', transactionError);
        throw transactionError;
      }

      console.log('✅ 账单保存成功');

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

      // 触发同步事件
      dataSync.notifyTransactionAdded({
        type,
        category: formData.category,
        amount: formData.amt,
        note: formData.note,
        date: dateStr, // 使用已经格式化好的本地日期字符串
        currency: formData.currency
      });
      markTransactionsDirty();
      void fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: 'transactions' }),
        cache: 'no-store'
      }).catch(() => {});

      // 更新常用备注
      if (formData.note && formData.note.trim()) {
        void updateCommonNote(formData.note.trim(), formData.amt);
      }

      // 延迟重置表单，让用户看到成功提示
      setTimeout(() => {
        resetForm();
      }, 500);

    } catch (err: any) {
      console.error('❌ 提交失败:', err);
      setError(err.message || '提交失败');
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
      debouncedSubmit({ amt, category, note, date, currency });
    }, 200); // 200ms 延迟
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
      setAmountText('0');
    setNote('');
    setDate(new Date());
    setCurrency(DEFAULT_CURRENCY as Currency);
    setError('');
  }

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
      // 生成时间上下文
      const timeContext = generateTimeContext();

      const response = await fetch('/api/common-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: noteContent,
          amount: amount,
          category: category,
          time_context: timeContext.label
        })
      });

      if (response.ok) {
        // 清除本地缓存，强制下次重新获取最新数据
        localStorage.removeItem('common-notes-cache');
      }
    } catch {
      // ignore note update failures
    }
  }

  // 生成时间上下文的工具函数
  function generateTimeContext() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const isWeekend = day === 0 || day === 6;

    let timeContext = '';
    if (hour >= 11 && hour < 14) {
      timeContext = isWeekend ? '周末午餐时间' : '工作日午餐时间';
    } else if (hour >= 17 && hour < 21) {
      timeContext = isWeekend ? '周末晚餐时间' : '工作日晚餐时间';
    } else if (hour >= 7 && hour < 10) {
      timeContext = '早餐时间';
    } else if (hour >= 9 && hour < 18 && !isWeekend) {
      timeContext = '工作时间';
    } else {
      timeContext = '日常时间';
    }

    return {
      label: timeContext,
      hour,
      isWeekend
    };
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
            <div>
              <Label>分类 <span className="text-destructive">*</span></Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm disabled:opacity-50"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={loading}
              >
                {PRESET_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
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
              <Input
                placeholder="例如：1,234.56"
                value={amountText}
                onChange={(e) => {
                  const raw = e.target.value;
                  // 允许输入数字、小数点与逗号
                  if (/^[0-9.,]*$/.test(raw)) setAmountText(raw);
                }}
                onBlur={() => setAmountText(formatThousand(parsedAmount))}
                className={invalidAmount ? 'border-destructive' : undefined}
                disabled={loading}
              />
              {invalidAmount && <p className="mt-1 text-sm text-destructive">金额必须大于 0</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>币种 <span className="text-destructive">*</span></Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm disabled:opacity-50"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  disabled={loading}
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code as string}>{c.name}</option>
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
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-blue-700">AI智能预测</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAIPrediction(!showAIPrediction)}
              className="text-blue-600 hover:text-blue-800 h-6 px-2"
            >
              {showAIPrediction ? '隐藏' : '显示'}
            </Button>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            基于您的历史数据智能预测分类和金额，让记账更快速
          </p>
        </div>
      </div>
    </div>
  );
}
