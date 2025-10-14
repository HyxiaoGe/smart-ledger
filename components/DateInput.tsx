"use client";
import { useState } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { DatePicker } from '@/components/DatePicker';

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
  placeholder = "选择日期",
  disabled = false
}: DateInputProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onSelect?.(date);
      setIsOpen(false); // 选择后自动关闭
    }
  };

  const handleButtonClick = () => {
    if (!disabled) {
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
        className="w-full justify-between text-left font-normal"
        disabled={disabled}
      >
        <span className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          {selected ? format(selected, 'yyyy年MM月dd日', { locale: zhCN }) : placeholder}
        </span>
        <span className="text-muted-foreground">
          {isOpen ? '收起' : '展开'}
        </span>
      </Button>

      {/* 弹出日历 */}
      {isOpen && (
        <>
          {/* 遮罩层 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* 日历面板 */}
          <Card
            className="absolute top-full left-0 right-0 z-50 mt-1 shadow-lg"
            onClick={handleCardClick}
          >
            <CardContent className="p-2">
              <DatePicker
                mode="single"
                selected={selected}
                onSelect={handleDateSelect}
                className="mx-auto rdp-enhanced"
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}