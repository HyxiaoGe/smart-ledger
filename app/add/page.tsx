"use client";
import { useState } from 'react';
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
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const invalidAmount = (() => parseAmount(amountText) <= 0)();

  function formatThousand(n: number) {
    return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function parseAmount(s: string) {
    const v = s.replace(/,/g, '');
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // 防止重复提交 - 多重检查
    if (loading || isSubmitted) {
      console.log('阻止重复提交：loading 或 isSubmitted 为 true');
      return;
    }

    // 生成唯一的提交ID
    const submissionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 原子性地设置提交状态
    setSubmittingId(submissionId);
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const amt = parseAmount(amountText);
      // type 固定为 'expense'，无需验证
      if (!category || !date) {
        throw new Error('请完整填写必填项');
      }
      if (!(amt > 0)) {
        throw new Error('金额必须大于 0');
      }
      setAmount(amt);

      // 检查是否是当前有效的提交ID（防止竞态条件）
      if (submittingId !== submissionId) {
        console.log('阻止过期的提交请求：', submissionId);
        return;
      }

      // 立即标记为已提交，防止重复提交
      setIsSubmitted(true);

      // 显示保存中状态，包含提交ID便于调试
      setSuccess(`正在保存... [${submissionId.slice(-6)}]`);

      console.log('开始提交交易记录：', { type, category, amount: amt, date: date.toISOString().slice(0, 10), currency, submissionId });

      // 异步保存交易记录
      const { error: transactionError } = await supabase.from('transactions').insert([
        { type, category, amount: amt, note, date: date.toISOString().slice(0, 10), currency }
      ]);

      // 再次检查提交ID
      if (submittingId !== submissionId) {
        console.log('提交完成后发现ID已过期：', submissionId);
        return;
      }

      if (transactionError) throw transactionError;

      console.log('交易记录保存成功：', submissionId);

      // 如果有备注，异步更新常用备注（不阻塞用户操作）
      if (note && note.trim()) {
        updateCommonNote(note.trim(), amt).catch(console.error);
      }

      // 保存成功
      setSuccess('✅ 账单保存成功！');

    } catch (err: any) {
      console.error('提交失败：', { error: err.message, submissionId });
      setError(err.message || '提交失败');
      setIsSubmitted(false);
    } finally {
      setLoading(false);
      setSubmittingId(null);
    }
  }

  // 重置表单
  function resetForm() {
    setCategory('food');
    setAmount(0);
    setAmountText('0');
    setNote('');
    setDate(new Date());
    setCurrency(DEFAULT_CURRENCY as Currency);
    setError('');
    setSuccess('');
    setIsSubmitted(false);
    setSubmittingId(null);
    // type 固定为 'expense'，无需重置
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
              disabled={isSubmitted}
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
              disabled={isSubmitted}
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
                disabled={isSubmitted}
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
                disabled={isSubmitted}
              />
            </div>
          </div>
          <div>
            <Label>备注</Label>
            <SmartNoteInput
              value={note}
              onChange={setNote}
              placeholder="可选"
              disabled={isSubmitted}
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm font-medium">{success}</p>

              {isSubmitted && (
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

          {!isSubmitted && (
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
