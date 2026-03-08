"use client";
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import React from 'react';
import { cn } from '@/lib/utils/helpers';
import { DatePicker } from '@/components/features/input/DatePicker';

export interface DateInputProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  containerZIndex?: number;
  inputId?: string;
  onOpen?: (inputId: string) => void;
  onClose?: () => void;
  isActive?: boolean;
}

export function DateInput({
  selected,
  onSelect,
  className,
  placeholder = "选择日期",
  disabled = false,
  containerZIndex = 9999,
  inputId,
  onOpen,
  onClose,
  isActive
}: DateInputProps) {
  const [isOpen, setIsOpen] = useState(false);

  // 监听 isActive 状态，当其他日期选择器打开时关闭当前
  // 只有当 isActive 明确为 false 时才关闭（避免 undefined 导致的误关闭）
  useEffect(() => {
    if (isActive === false && isOpen) {
      setIsOpen(false);
    }
  }, [isActive, isOpen]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onSelect?.(date);
      setIsOpen(false); // 选择后自动关闭
    }
  };

  const handleButtonClick = () => {
    if (!disabled) {
      if (!isOpen) {
        // 打开时通知父组件
        onOpen?.(inputId || '');
      } else {
        // 关闭时通知父组件
        onClose?.();
      }
      setIsOpen(!isOpen);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className={cn("relative", className)}>
      {/* 触发按钮 */}
      <Button
        type="button"
        variant="outline"
        onClick={handleButtonClick}
        className="min-h-11 w-full justify-between rounded-xl border-slate-200 bg-white/80 px-3 text-left font-normal shadow-sm hover:border-blue-400 hover:bg-white focus-visible:ring-blue-500/70 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-blue-500 dark:hover:bg-slate-950"
        disabled={disabled}
      >
        <span className="flex min-w-0 items-center gap-2">
          <CalendarIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {selected ? format(selected, 'yyyy年MM月dd日', { locale: zhCN }) : placeholder}
          </span>
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {isOpen ? '收起' : '展开'}
        </span>
      </Button>

      {/* 弹出日历 */}
      {isOpen && (
        <>
          {/* 遮罩层 */}
          <div
            className="fixed inset-0"
            style={{ zIndex: containerZIndex - 1 }}
            onClick={() => setIsOpen(false)}
          />

          {/* 日历面板 */}
          <Card
            className="absolute left-0 top-full mt-2 w-[min(92vw,22rem)] rounded-2xl border border-slate-200 shadow-xl dark:border-slate-700 sm:w-[22rem]"
            style={{ zIndex: containerZIndex }}
            onClick={handleCardClick}
          >
            <CardContent className="p-3">
              <DatePicker
                mode="single"
                selected={selected}
                onSelect={handleDateSelect}
                compact
                className="mx-auto"
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
