"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { TransactionType, Currency } from '@/types/transaction';
import { PRESET_CATEGORIES, SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } from '@/lib/config';
import { CategoryChip } from '@/components/CategoryChip';
import dynamic from 'next/dynamic';
import type { DateInputProps } from '@/components/DateInput';
import type { NoteInputProps } from '@/components/NoteInput';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dataSync, markTransactionsDirty } from '@/lib/dataSync';
import { ProgressToast } from '@/components/ProgressToast';
import { commonNotesService } from '@/lib/services/commonNotes';
import { invalidateCommonNotesCache } from '@/hooks/useCommonNotes';
import { SkeletonBlock } from '@/components/Skeletons';

const DateInput = dynamic<DateInputProps>(
  () => import('@/components/DateInput').then((mod) => mod.DateInput),
  {
    ssr: false,
    loading: () => <SkeletonBlock className="h-9 w-full" />
  }
);

const NoteInput = dynamic<NoteInputProps>(
  () => import('@/components/NoteInput').then((mod) => mod.NoteInput),
  {
    ssr: false,
    loading: () => <SkeletonBlock className="h-9 w-full" />
  }
);

export default function AddPage() {
  const type: TransactionType = 'expense';
  const [category, setCategory] = useState<string>('food');
  const [amountText, setAmountText] = useState<string>('0');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY as Currency);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showToast, setShowToast] = useState(false);

  const submitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSubmitTimeRef = useRef<number>(0);
  const isSubmittingRef = useRef<boolean>(false);
  const invalidAmount = (() => parseAmount(amountText) <= 0)();

  function formatThousand(n: number) {
    return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function parseAmount(value: string) {
    const normalized = value.replace(/,/g, '');
    const parsed = parseFloat(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

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
      const { data: existingRecord, error: queryError } = await supabase
        .from('transactions')
        .select('*')
        .eq('type', type)
        .eq('category', formData.category)
        .eq('date', formData.date.toISOString().slice(0, 10))
        .eq('currency', formData.currency)
        .eq('note', formData.note)
        .single();

      let transactionError;

      if (existingRecord) {
        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            amount: existingRecord.amount + formData.amt
          })
          .eq('id', existingRecord.id);

        transactionError = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('transactions')
          .insert([
            {
              type,
              category: formData.category,
              amount: formData.amt,
              note: formData.note,
              date: formData.date.toISOString().slice(0, 10),
              currency: formData.currency
            }
          ]);

        transactionError = insertError;
      }

      if (queryError && queryError.code !== 'PGRST116') {
        throw queryError;
      }

      if (transactionError) {
        throw transactionError;
      }

      setShowToast(true);

      dataSync.notifyTransactionAdded({
        type,
        category: formData.category,
        amount: formData.amt,
        note: formData.note,
        date: formData.date.toISOString(),
        currency: formData.currency
      });
      markTransactionsDirty();
      void fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: 'transactions' }),
        cache: 'no-store'
      }).catch(() => undefined);

      if (formData.note && formData.note.trim()) {
        void updateCommonNote(formData.note.trim(), formData.amt);
      }

      setTimeout(() => {
        resetForm();
      }, 500);
    } catch (err: any) {
      setError(err?.message || '提交失败');
    } finally {
      setLoading(false);
      lastSubmitTimeRef.current = 0;
      isSubmittingRef.current = false;
    }
  }, [type]);

  const onSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSubmittingRef.current || loading) {
      return;
    }

    const now = Date.now();
    if (now - lastSubmitTimeRef.current < 500) {
      return;
    }

    isSubmittingRef.current = true;
    lastSubmitTimeRef.current = now;
    setLoading(true);

    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current);
    }

    const amt = parseAmount(amountText);
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

    submitTimeoutRef.current = setTimeout(() => {
      debouncedSubmit({
        amt,
        category,
        note,
        date,
        currency
      });
    }, 200);
  }, [amountText, category, currency, date, debouncedSubmit, loading, note]);

  function resetForm() {
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

  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
      isSubmittingRef.current = false;
    };
  }, []);

  async function updateCommonNote(noteContent: string, amount: number) {
    try {
      await commonNotesService.upsert({ content: noteContent, amount });
      invalidateCommonNotesCache();
    } catch {
      // ignore note update failures
    }
  }

  return (
    <>
      {showToast && (
        <ProgressToast
          message="账单保存成功！"
          duration={3000}
          onClose={() => setShowToast(false)}
        />
      )}

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
                placeholder="例如 1,234.56"
                value={amountText}
                onChange={(e) => {
                  const raw = e.target.value;
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
              <NoteInput
                value={note}
                onChange={setNote}
                placeholder="可选"
                disabled={loading}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? '保存中…' : '保存账单'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
