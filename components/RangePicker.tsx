"use client";
import { useState, useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format, addDays, startOfMonth, endOfMonth, subDays } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, X } from "lucide-react";
import { DatePicker } from "@/components/DatePicker";
import { ComponentErrorBoundary } from "@/components/ErrorBoundary";
import { cn } from "@/lib/utils";

const QUICK_OPTIONS = [
  {
    key: 'today',
    label: '今日',
    getRange: () => ({ start: new Date(), end: new Date() })
  },
  {
    key: 'yesterday',
    label: '昨日',
    getRange: () => {
      const yesterday = subDays(new Date(), 1);
      return { start: yesterday, end: yesterday };
    }
  },
  {
    key: 'last7',
    label: '近7日',
    getRange: () => ({
      start: subDays(new Date(), 6),
      end: new Date()
    })
  },
  {
    key: 'month',
    label: '当月',
    getRange: () => ({
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date())
    })
  }
] as const;

export interface RangePickerProps {
  className?: string;
  onRangeChange?: (range: { start: Date; end: Date } | null) => void;
}

export function RangePicker({ className, onRangeChange }: RangePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>();
  const [calendarMonth, setCalendarMonth] = useState<Date>();

  // 从 URL 参数解析当前范围
  const current = useMemo(() => {
    const rangeKey = search.get('range') as 'today' | 'yesterday' | 'last7' | 'month' | 'custom';
    const startStr = search.get('start');
    const endStr = search.get('end');

    if (rangeKey === 'custom' && startStr && endStr) {
      return {
        start: new Date(startStr),
        end: new Date(endStr),
        key: 'custom' as const
      };
    }

    const option = QUICK_OPTIONS.find(opt => opt.key === rangeKey);
    if (option) {
      const range = option.getRange();
      return { ...range, key: option.key };
    }

    // 默认返回今日
    const today = QUICK_OPTIONS[0].getRange();
    return { ...today, key: QUICK_OPTIONS[0].key };
  }, [search]);

  // 更新 URL 参数
  const updateURL = useCallback((range: { start: Date; end: Date } | null, key: string) => {
    const sp = new URLSearchParams(search?.toString());

    if (range && key !== 'month') {
      sp.set('range', key);
      sp.set('start', format(range.start, 'yyyy-MM-dd'));
      sp.set('end', format(range.end, 'yyyy-MM-dd'));
      sp.delete('month'); // 清除月份参数
    } else if (key === 'month') {
      sp.set('range', 'month');
      sp.delete('start');
      sp.delete('end');
    } else {
      sp.delete('range');
      sp.delete('start');
      sp.delete('end');
    }

    router.push(pathname + '?' + sp.toString() as any);
  }, [router, pathname, search]);

  // 处理快捷选项点击
  const handleQuickOption = useCallback((option: typeof QUICK_OPTIONS[number]) => {
    const range = option.getRange();

    // 根据选项类型设置日历显示
    let displayRange;
    if (option.key === 'today' || option.key === 'yesterday') {
      // 单日选择：只选中一个日期
      displayRange = {
        from: range.start,
        to: range.start
      };
    } else {
      // 范围选择：显示完整范围
      if (option.key === 'last7') {
        // 近7日：包含今天
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        displayRange = {
          from: range.start,
          to: today
        };
      } else if (option.key === 'month') {
        // 当月：显示1号到今天
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        displayRange = {
          from: monthStart,
          to: today
        };
      } else {
        // 其他范围：减去1天
        displayRange = {
          from: range.start,
          to: new Date(range.end.getTime() - 24 * 60 * 60 * 1000)
        };
      }
    }

    setCustomRange(displayRange);
    setCalendarMonth(range.start); // 同步更新日历月份
    setIsOpen(false);
    updateURL(range, option.key);
    onRangeChange?.(range);
  }, [updateURL, onRangeChange]);

  // 处理自定义日期范围选择
  const handleCustomRangeSelect = useCallback((range: { from?: Date; to?: Date } | undefined) => {
    try {
      if (!range) {
        return;
      }

      // 验证range对象的结构
      if (typeof range !== 'object' || range === null) {
        console.warn('Invalid range object received:', range);
        return;
      }

      setCustomRange(range);

      if (range.from && range.to) {
        // 验证日期对象
        if (!(range.from instanceof Date) || !(range.to instanceof Date)) {
          console.warn('Invalid date objects in range:', range);
          return;
        }

        const dateRange = { start: range.from, end: range.to };
        setIsOpen(false);
        updateURL(dateRange, 'custom');
        onRangeChange?.(dateRange);
      }
    } catch (error) {
      console.error('Error in handleCustomRangeSelect:', error);
    }
  }, [updateURL, onRangeChange]);

  // 清除自定义范围
  const clearCustomRange = useCallback(() => {
    setCustomRange(undefined);
    setIsOpen(false);
    const todayRange = QUICK_OPTIONS[0].getRange();
    updateURL(todayRange, 'today');
    onRangeChange?.(todayRange);
  }, [updateURL, onRangeChange]);

  // 格式化显示文本
  const getDisplayText = useCallback(() => {
    if (current.key === 'custom') {
      return `${format(current.start, 'MM/dd')} - ${format(current.end, 'MM/dd')}`;
    }

    const option = QUICK_OPTIONS.find(opt => opt.key === current.key);
    return option?.label || '自定义';
  }, [current]);

  return (
    <div className={cn("relative", className)}>
      {/* 触发按钮 */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="justify-start text-left font-normal w-full sm:w-auto pr-8"
      >
        <span className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          {getDisplayText()}
        </span>
        <span className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <svg
            className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </Button>

      {/* 弹出内容 */}
      {isOpen && (
        <>
          {/* 遮罩层，点击关闭 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* 弹出面板 */}
          <Card className="absolute top-full right-0 z-50 mt-3 w-auto min-w-[380px] shadow-2xl border border-gray-100 bg-white rounded-xl overflow-hidden">
            <CardContent className="p-0">
              {/* 快捷选项区域 */}
              <div className="border-b border-gray-100 bg-gray-50/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-700">快速选择</span>
                  <div className="h-px bg-gradient-to-r from-blue-200 to-transparent flex-1 ml-3"></div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_OPTIONS.map(option => (
                    <Button
                      key={option.key}
                      variant={current.key === option.key ? "default" : "secondary"}
                      size="sm"
                      onClick={() => handleQuickOption(option)}
                      className={cn(
                        "text-xs h-9 px-3 transition-all duration-200 font-medium",
                        current.key === option.key
                          ? "bg-blue-500 text-white shadow-sm hover:bg-blue-600"
                          : "bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200"
                      )}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 自定义日期选择器区域 */}
              <div className="p-4 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-semibold text-gray-700">自定义日期范围</span>
                  </div>
                  {customRange && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {customRange.from && format(customRange.from, 'MM月dd日')} -
                        {customRange.to && format(customRange.to, 'MM月dd日')}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearCustomRange}
                        className="h-7 px-2 text-xs hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <X className="h-3 w-3 mr-1" />
                        清除
                      </Button>
                    </div>
                  )}
                </div>

                {/* 日期选择器容器 */}
                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 rounded-xl p-4 border border-blue-100">
                  <ComponentErrorBoundary
                    fallback={
                      <div className="text-center py-8 text-sm text-gray-500">
                        日期选择器加载失败，请刷新页面重试
                      </div>
                    }
                  >
                    <DatePicker
                      mode="range"
                      selected={customRange as { from?: Date; to?: Date } | undefined}
                      onSelect={handleCustomRangeSelect}
                      locale={zhCN}
                      defaultMonth={calendarMonth || current.start}
                      className="mx-auto rdp-enhanced"
                    />
                  </ComponentErrorBoundary>
                </div>

                {/* 提示文字 */}
                {!customRange && (
                  <div className="mt-3 text-center">
                    <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      点击日历选择开始和结束日期
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );

  // 同步当前选中范围到日历组件
  useEffect(() => {
    // 添加调试信息
    const today = new Date();
    console.log('当前日期:', today.toISOString().slice(0, 10));
    console.log('current:', current);

    if (current.key !== 'custom') {
      // 快捷选项：根据类型设置不同的显示
      if (current.key === 'today' || current.key === 'yesterday') {
        // 单日选择：只选中一个日期
        setCustomRange({
          from: current.start,
          to: current.start // from和to相同，表示单日选择
        });
      } else if (current.key === 'last7') {
        // 近7日：显示7天范围（包含今天）
        // current.end是明天，但我们要显示到今天
        const today = new Date();
        today.setHours(0, 0, 0, 0); // 设置为今天的开始时间
        setCustomRange({
          from: current.start,
          to: today
        });
      } else if (current.key === 'month') {
        // 当月：显示1号到今天的范围
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        setCustomRange({
          from: monthStart,
          to: today
        });
      }
      setCalendarMonth(current.start);
    } else {
      // 自定义范围：从URL参数解析
      const startStr = search.get('start');
      const endStr = search.get('end');
      if (startStr && endStr) {
        setCustomRange({
          from: new Date(startStr),
          to: new Date(endStr)
        });
        setCalendarMonth(new Date(startStr));
      }
    }
  }, [current.key, current.start, current.end, search]);
}