"use client";

import React from 'react';
import { DayPicker, DayPickerProps } from 'react-day-picker';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export type DatePickerProps = DayPickerProps & {
  compact?: boolean;
};

export function DatePicker({ className, compact, locale = zhCN, ...props }: DatePickerProps) {
  return (
    <DayPicker
      locale={locale}
      className={cn(compact ? 'rdp-compact' : undefined, className)}
      {...props}
    />
  );
}
