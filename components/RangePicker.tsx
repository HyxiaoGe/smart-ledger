/* eslint-disable */
'use client';

import React, { useMemo } from 'react';
import { getQuickRange } from '@/lib/date';

const OPTIONS = [
  { key: 'today', label: '����' },
  { key: 'yesterday', label: '����' },
  { key: 'last7', label: '�� 7 ��' },
  { key: 'month', label: '����' },
  { key: 'custom', label: '�Զ���' }
] as const;

type RangePickerProps = {
  value?: { key: string; start?: string; end?: string };
  month?: string;
  onChange?: (value: { key: string; start?: string; end?: string }) => void;
};

export function RangePicker({ value, month, onChange }: RangePickerProps) {
  const selectedKey = value?.key ?? 'today';

  const label = useMemo(() => {
    if (selectedKey !== 'custom') {
      const quick = getQuickRange(selectedKey as any, month ?? '');
      return quick.label;
    }
    if (value?.start && value?.end) {
      return `${value.start} - ${value.end}`;
    }
    return '��ѡ�����ڷ�Χ';
  }, [selectedKey, value?.start, value?.end, month]);

  const handleSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const key = event.target.value;
    if (key === 'custom') {
      onChange?.({ key, start: value?.start, end: value?.end });
    } else {
      const quick = getQuickRange(key as any, month ?? '');
      onChange?.({ key, start: quick.start, end: quick.end });
    }
  };

  const handleDateChange =
    (type: 'start' | 'end') => (event: React.ChangeEvent<HTMLInputElement>) => {
      if (selectedKey !== 'custom') return;
      const next = { ...value, key: 'custom', [type]: event.target.value };
      onChange?.(next as { key: string; start?: string; end?: string });
    };

  return (
    <div className="flex flex-col gap-2 text-sm">
      <select
        className="h-9 rounded-md border border-input bg-background px-3"
        value={selectedKey}
        onChange={handleSelect}
      >
        {OPTIONS.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="text-xs text-muted-foreground">{label}</div>
      {selectedKey === 'custom' ? (
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="h-9 w-full rounded-md border border-input bg-background px-3"
            value={value?.start ?? ''}
            onChange={handleDateChange('start')}
          />
          <span>��</span>
          <input
            type="date"
            className="h-9 w-full rounded-md border border-input bg-background px-3"
            value={value?.end ?? ''}
            onChange={handleDateChange('end')}
          />
        </div>
      ) : null}
    </div>
  );
}
