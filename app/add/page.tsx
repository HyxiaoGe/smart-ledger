"use client";
// 添加账单页（中文注释）
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

export default function AddPage() {
  const router = useRouter();
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState<string>('food');
  const [amount, setAmount] = useState<number>(0);
  const [amountText, setAmountText] = useState<string>('0');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY as Currency);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
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
    setLoading(true);
    setError('');
    try {
      const amt = parseAmount(amountText);
      if (!type || !category || !date) {
        throw new Error('请完整填写必填项');
      }
      if (!(amt > 0)) {
        throw new Error('金额必须大于 0');
      }
      setAmount(amt);
      const { error } = await supabase.from('transactions').insert([
        { type, category, amount: amt, note, date, currency }
      ]);
      if (error) throw error;
      router.push('/');
    } catch (err: any) {
      setError(err.message || '提交失败');
    } finally {
      setLoading(false);
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
            <Label>类型 <span className="text-destructive">*</span></Label>
            <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={type} onChange={(e) => setType(e.target.value as TransactionType)}>
              <option value="expense">支出</option>
              <option value="income">收入</option>
            </select>
          </div>
          <div>
            <Label>分类 <span className="text-destructive">*</span></Label>
            <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
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
            />
            {invalidAmount && <p className="mt-1 text-sm text-destructive">金额必须大于 0</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>币种 <span className="text-destructive">*</span></Label>
              <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code as string}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>日期 <span className="text-destructive">*</span></Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>备注</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="可选" />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div>
            <Button disabled={loading}>{loading ? '提交中…' : '提交'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
