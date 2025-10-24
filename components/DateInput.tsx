/* eslint-disable */
'use client';

import React, { useCallback } from 'react';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface DateInputProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function DateInput({
  selected,
  onSelect,
  className,
  placeholder = 'ѡ������',
  disabled = false
}: DateInputProps) {
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!event.target.value) return;
      const next = new Date(event.target.value);
      if (!Number.isNaN(next.getTime())) {
        onSelect?.(next);
      }
    },
    [onSelect]
  );

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button type="button" variant="outline" className="w-full justify-start" disabled={disabled}>
        <CalendarIcon className="mr-2 h-4 w-4" />
        {selected ? selected.toLocaleDateString('zh-CN') : placeholder}
      </Button>
      <input
        type="date"
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        disabled={disabled}
        value={selected ? selected.toISOString().slice(0, 10) : ''}
        onChange={handleChange}
      />
    </div>
  );
}
