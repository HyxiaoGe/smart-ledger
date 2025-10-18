"use client";
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { TransactionType, Currency } from '@/types/transaction';
import { PRESET_CATEGORIES, SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } from '@/lib/config';
import { CategoryChip } from '@/components/CategoryChip';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateInput } from '@/components/DateInput';
import { SmartNoteInput } from '@/components/SmartNoteInput';
import { dataSync } from '@/lib/dataSync';

export default function AddPage() {
  const router = useRouter();
  const type: TransactionType = 'expense'; // 固定为支出类型
  const [category, setCategory] = useState<string>('food');
  const [amount, setAmount] = useState<number>(0);
  const [amountText, setAmountText] = useState<string>('0');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY as Currency);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // 防抖相关
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSubmitTimeRef = useRef<number>(0);
  const invalidAmount = (() => parseAmount(amountText) <= 0)();

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
    setSuccess('');

    try {
      // 保存交易记录
      const { error: transactionError } = await supabase.from('transactions').insert([
        {
          type,
          category: formData.category,
          amount: formData.amt,
          note: formData.note,
          date: formData.date.toISOString().slice(0, 10),
          currency: formData.currency
        }
      ]);

      if (transactionError) throw transactionError;

      // 触发同步事件
      dataSync.notifyTransactionAdded({
        type,
        category: formData.category,
        amount: formData.amt,
        note: formData.note,
        date: formData.date.toISOString().slice(0, 10),
        currency: formData.currency
      });

      // 更新常用备注
      if (formData.note && formData.note.trim()) {
        updateCommonNote(formData.note.trim(), formData.amt).catch(console.error);
      }

      setSuccess('✅ 账单保存成功！');

    } catch (err: any) {
      setError(err.message || '提交失败');
    } finally {
      setLoading(false);
      lastSubmitTimeRef.current = 0; // 重置时间戳，允许下次提交
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // 防抖处理：500ms内只允许一次提交
    const now = Date.now();
    if (now - lastSubmitTimeRef.current < 500) {
      return;
    }
    lastSubmitTimeRef.current = now;

    // 清除之前的定时器
    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current);
    }

    const amt = parseAmount(amountText);
    if (!category || !date) {
      setError('请完整填写必填项');
      return;
    }
    if (!(amt > 0)) {
      setError('金额必须大于 0');
      return;
    }

    // 使用防抖提交
    submitTimeoutRef.current = setTimeout(() => {
      debouncedSubmit({ amt, category, note, date, currency });
    }, 200); // 200ms 延迟
  }

  // 重置表单
  function resetForm() {
    // 清理防抖状态
    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current);
      submitTimeoutRef.current = null;
    }
    lastSubmitTimeRef.current = 0;

    setCategory('food');
    setAmount(0);
    setAmountText('0');
    setNote('');
    setDate(new Date());
    setCurrency(DEFAULT_CURRENCY as Currency);
    setError('');
    setSuccess('');
  }

  // 继续添加下一笔
  function continueAdding() {
    resetForm();
  }

  // 返回首页
  function goHome() {
    router.push('/');
  }

  // 异步更新常用备注
  async function updateCommonNote(noteContent: string, amount: number) {
    try {
      const response = await fetch('/api/common-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: noteContent,
          amount: amount
        })
      });

      if (!response.ok) {
        console.error('Failed to update common note');
      } else {
        // 清除本地缓存，强制下次重新获取最新数据
        localStorage.removeItem('common-notes-cache');
      }
    } catch (error) {
      console.error('Error updating common note:', error);
    }
  }

  return (
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
              onBlur={() => setAmountText(formatThousand(parseAmount(amountText)))}
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
              placeholder="可选"
              disabled={loading}
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm font-medium">{success}</p>

              {success && (
                <div className="mt-3 flex gap-2">
                  <Button
                    onClick={continueAdding}
                    variant="outline"
                    size="sm"
                    className="border-green-500 text-green-600 hover:bg-green-50"
                  >
                    继续添加
                  </Button>
                  <Button
                    onClick={goHome}
                    variant="success"
                    size="sm"
                  >
                    返回首页
                  </Button>
                </div>
              )}
            </div>
          )}

          {!success && (
            <div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? '保存中...' : '保存账单'}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
