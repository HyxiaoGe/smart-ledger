"use client";
// 统一日期选择器组件（基于 react-day-picker，中文注释）
import { DayPicker } from "react-day-picker";
import { zhCN } from "date-fns/locale";
import * as React from "react";

export interface DatePickerProps {
  mode?: "single" | "range" | "multiple";
  selected?: Date | { from: Date; to: Date } | Date[];
  onSelect?: (date: any) => void;
  className?: string;
  showOutsideDays?: boolean;
  disabled?: Date[];
  defaultMonth?: Date;
  locale?: Locale;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  fromDate?: Date;
  toDate?: Date;
}

export function DatePicker({
  mode = "single",
  selected,
  onSelect,
  className,
  showOutsideDays = true,
  disabled,
  defaultMonth,
  locale = zhCN,
  weekStartsOn = 1, // 周一开始
  fromDate,
  toDate,
  ...props
}: DatePickerProps) {
  return (
    <DayPicker
      mode={mode}
      selected={selected}
      onSelect={onSelect}
      showOutsideDays={showOutsideDays}
      disabled={disabled}
      defaultMonth={defaultMonth}
      locale={locale}
      weekStartsOn={weekStartsOn}
      fromDate={fromDate}
      toDate={toDate}
      className={className}
      {...props}
    />
  );
}