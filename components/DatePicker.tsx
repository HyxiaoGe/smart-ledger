"use client";
import { DayPicker } from "react-day-picker";
import { zhCN } from "date-fns/locale";
import * as React from "react";
import { cn } from "@/lib/utils";

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
  compact?: boolean; // 新增：紧凑模式，适用于表单场景
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
  compact = false,
  ...props
}: DatePickerProps) {
  if (compact && mode === "single") {
    // 紧凑模式：只显示月份导航和选择
    return (
      <div className={cn(
        "border rounded-md bg-background p-2",
        className
      )}>
        <div className="text-sm font-medium text-center mb-2">
          {selected ? selected.toLocaleDateString('zh-CN', {
            month: 'long',
            day: 'numeric',
            weekday: 'short'
          }) : '选择日期'}
        </div>
        <div className="flex justify-center items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const newDate = new Date(selected || new Date());
              newDate.setDate(newDate.getDate() - 1);
              onSelect?.(newDate);
            }}
            className="h-8 w-8 rounded-md border bg-background hover:bg-accent flex items-center justify-center text-sm"
            disabled={disabled?.includes(new Date((selected || new Date()).getTime() - 24 * 60 * 60 * 1000))}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onSelect?.(new Date())}
            className={cn(
              "h-8 w-8 rounded-md border flex items-center justify-center text-sm font-medium",
              selected?.toDateString() === new Date().toDateString()
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-accent border-border"
            )}
          >
            今
          </button>
          <button
            type="button"
            onClick={() => {
              const newDate = new Date(selected || new Date());
              newDate.setDate(newDate.getDate() + 1);
              onSelect?.(newDate);
            }}
            className="h-8 w-8 rounded-md border bg-background hover:bg-accent flex items-center justify-center text-sm"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

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
      className={cn(
        compact ? "rdp-compact" : "",
        className
      )}
      {...props}
    />
  );
}