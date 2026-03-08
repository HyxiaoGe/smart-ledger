"use client";

import { useState, useCallback, useEffect, useMemo, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { zhCN } from "date-fns/locale";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, addMonths, addQuarters, getWeek, getQuarter } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { DatePicker } from "@/components/features/input/DatePicker";
import { ComponentErrorBoundary } from "@/components/layout/ErrorBoundary";
import { cn } from "@/lib/utils/helpers";
import { buildTransactionPageHref } from "@/lib/services/transaction/pageParams";
import {
  getExtendedQuickRange,
  formatDateToLocal,
  type ExtendedQuickRange,
} from "@/lib/utils/date";

// 周选择器组件
function WeekPicker({ onSelect }: { onSelect: (_range: { start: string; end: string }) => void }) {
  const weeks = useMemo(() => {
    const result = [];
    const today = new Date();
    // 显示最近12周
    for (let i = 0; i < 12; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i * 7);
      const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // 周一开始
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
      const weekNum = getWeek(date, { weekStartsOn: 1 });
      result.push({
        weekNum,
        start: weekStart,
        end: weekEnd,
        label: `第${weekNum}周 (${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()})`,
      });
    }
    return result;
  }, []);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 max-h-[300px] overflow-y-auto">
      <div className="space-y-2">
        {weeks.map((week, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => {
              onSelect({
                start: formatDateToLocal(week.start),
                end: formatDateToLocal(week.end),
              });
            }}
            className="w-full justify-start text-left hover:bg-blue-50 dark:hover:bg-blue-950"
          >
            {week.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

// 月份选择器组件
function MonthPicker({ onSelect }: { onSelect: (_range: { start: string; end: string }) => void }) {
  const months = useMemo(() => {
    const result = [];
    const today = new Date();
    // 显示最近12个月
    for (let i = 0; i < 12; i++) {
      const date = addMonths(today, -i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      result.push({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        start: monthStart,
        end: monthEnd,
        label: `${date.getFullYear()}年${date.getMonth() + 1}月`,
      });
    }
    return result;
  }, []);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 max-h-[300px] overflow-y-auto">
      <div className="space-y-2">
        {months.map((month, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => {
              onSelect({
                start: formatDateToLocal(month.start),
                end: formatDateToLocal(month.end),
              });
            }}
            className="w-full justify-start text-left hover:bg-blue-50 dark:hover:bg-blue-950"
          >
            {month.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

// 季度选择器组件
function QuarterPicker({ onSelect }: { onSelect: (_range: { start: string; end: string }) => void }) {
  const quarters = useMemo(() => {
    const result = [];
    const today = new Date();
    // 显示最近8个季度
    for (let i = 0; i < 8; i++) {
      const date = addQuarters(today, -i);
      const quarterStart = startOfQuarter(date);
      const quarterEnd = endOfQuarter(date);
      const quarterNum = getQuarter(date);
      result.push({
        year: date.getFullYear(),
        quarter: quarterNum,
        start: quarterStart,
        end: quarterEnd,
        label: `${date.getFullYear()}年 Q${quarterNum}`,
      });
    }
    return result;
  }, []);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 max-h-[300px] overflow-y-auto">
      <div className="space-y-2">
        {quarters.map((quarter, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => {
              onSelect({
                start: formatDateToLocal(quarter.start),
                end: formatDateToLocal(quarter.end),
              });
            }}
            className="w-full justify-start text-left hover:bg-blue-50 dark:hover:bg-blue-950"
          >
            {quarter.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

// Tab 类型定义
type TabType = "day" | "week" | "month" | "quarter";

// 每个 Tab 的快捷选项配置
const TAB_OPTIONS: Record<
  TabType,
  { key: ExtendedQuickRange; label: string }[]
> = {
  day: [
    { key: "today", label: "今天" },
    { key: "yesterday", label: "昨天" },
    { key: "dayBeforeYesterday", label: "前天" },
  ],
  week: [
    { key: "thisWeek", label: "本周" },
    { key: "lastWeek", label: "上周" },
    { key: "weekBeforeLast", label: "上上周" },
  ],
  month: [
    { key: "thisMonth", label: "本月" },
    { key: "lastMonth", label: "上月" },
    { key: "monthBeforeLast", label: "上上月" },
  ],
  quarter: [
    { key: "thisQuarter", label: "本季度" },
    { key: "lastQuarter", label: "上季度" },
  ],
};

// Tab 名称映射
const TAB_LABELS: Record<TabType, string> = {
  day: "日",
  week: "周",
  month: "月",
  quarter: "季",
};

// 根据范围 key 找到对应的 tab
function getTabFromRange(_range: ExtendedQuickRange): TabType {
  if (["today", "yesterday", "dayBeforeYesterday"].includes(_range)) return "day";
  if (["thisWeek", "lastWeek", "weekBeforeLast"].includes(_range)) return "week";
  if (["thisMonth", "lastMonth", "monthBeforeLast"].includes(_range)) return "month";
  if (["thisQuarter", "lastQuarter"].includes(_range)) return "quarter";
  return "day";
}

export interface TabsRangePickerProps {
  className?: string;
  onRangeChange?: (_range: { start: Date; end: Date } | null) => void;
}

function TabsRangePickerContent({ className, onRangeChange }: TabsRangePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("day");
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>();

  const parseYMD = useCallback((value: string) => {
    const parts = value.split("-");
    if (parts.length !== 3) return null;
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { year, month, day };
  }, []);

  const formatCustomLabel = useCallback(
    (startStr: string, endStr: string) => {
      const start = parseYMD(startStr);
      const end = parseYMD(endStr);
      if (!start || !end) return `${startStr} ~ ${endStr}`;
      if (startStr === endStr) {
        return `${start.year}年${start.month}月${start.day}日`;
      }
      if (start.year === end.year) {
        if (start.month === end.month) {
          return `${start.month}月${start.day}日 ~ ${end.day}日`;
        }
        return `${start.month}月${start.day}日 ~ ${end.month}月${end.day}日`;
      }
      return `${start.year}年${start.month}月${start.day}日 ~ ${end.year}年${end.month}月${end.day}日`;
    },
    [parseYMD]
  );

  // 从 URL 参数解析当前范围
  const current = useMemo(() => {
    const rangeKey = search.get("range") as ExtendedQuickRange | "custom";
    const startStr = search.get("start");
    const endStr = search.get("end");

    if (rangeKey === "custom" && startStr && endStr) {
      return {
        start: startStr,
        end: endStr,
        key: "custom" as const,
        label: `${startStr.slice(5)} ~ ${endStr.slice(5)}`,
      };
    }

    if (rangeKey && rangeKey !== "custom") {
      const rangeData = getExtendedQuickRange(rangeKey);
      return { ...rangeData, key: rangeKey };
    }

    // 默认今天
    const todayRange = getExtendedQuickRange("today");
    return { ...todayRange, key: "today" as ExtendedQuickRange };
  }, [search]);

  // 初始化 activeTab
  useEffect(() => {
    if (current.key !== "custom") {
      setActiveTab(getTabFromRange(current.key));
    }
  }, [current.key]);

  // URL 自定义范围回显到日期选择器
  useEffect(() => {
    if (current.key !== "custom") return;
    const start = parseYMD(current.start);
    const end = parseYMD(current.end);
    if (!start || !end) return;
    setCustomRange({
      from: new Date(start.year, start.month - 1, start.day),
      to: new Date(end.year, end.month - 1, end.day),
    });
  }, [current.key, current.start, current.end, parseYMD]);

  // 更新 URL 参数
  const updateURL = useCallback(
    (_range: { start: string; end: string }, key: string) => {
      router.push(
        buildTransactionPageHref(pathname, search?.toString(), {
          range: key,
          start: key === "custom" ? _range.start : null,
          end: key === "custom" ? _range.end : null,
          month: null,
        }) as any
      );
    },
    [router, pathname, search]
  );

  // 处理快捷选项点击
  const handleQuickOption = useCallback(
    (optionKey: ExtendedQuickRange) => {
      const range = getExtendedQuickRange(optionKey);
      setIsOpen(false);
      updateURL({ start: range.start, end: range.end }, optionKey);
      onRangeChange?.({
        start: new Date(range.start),
        end: new Date(range.end),
      });
    },
    [updateURL, onRangeChange]
  );

  // 处理自定义日期范围选择
  const handleCustomRangeSelect = useCallback(
    (range: { from?: Date; to?: Date } | undefined) => {
      if (!range || typeof range !== "object") return;
      setCustomRange(range);

      const { from, to } = range;
      if (!from || !to || !(from instanceof Date) || !(to instanceof Date)) return;

      const startStr = formatDateToLocal(from);
      const endStr = formatDateToLocal(to);

      setIsOpen(false);
      // 前端不再加1天，让后端统一处理
      updateURL({ start: startStr, end: endStr }, "custom");
      onRangeChange?.({ start: from, end: to });
    },
    [updateURL, onRangeChange]
  );

  // 获取显示文本
  const getDisplayText = useCallback(() => {
    if (current.key === "custom") {
      return formatCustomLabel(current.start, current.end);
    }
    // 查找选项标签
    for (const tab of Object.values(TAB_OPTIONS)) {
      const option = tab.find((opt) => opt.key === current.key);
      if (option) return option.label;
    }
    return "今天";
  }, [current]);

  // 获取当前选中的 Tab 内的选中项
  const getCurrentTabSelection = useCallback(() => {
    if (current.key === "custom") return null;
    const options = TAB_OPTIONS[activeTab];
    return options.find((opt) => opt.key === current.key)?.key || null;
  }, [current.key, activeTab]);

  return (
    <div className={cn("relative", className)}>
      {/* 触发按钮 */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="justify-between text-left font-normal min-w-[100px]"
      >
        <span className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          {getDisplayText()}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 ml-2 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </Button>

      {/* 弹出面板 */}
      {isOpen && (
        <>
          {/* 遮罩层 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* 弹出内容 */}
          <Card className="absolute top-full right-0 z-50 mt-2 w-auto min-w-[320px] shadow-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
            <CardContent className="p-0">
              {/* Tab 切换 */}
              <div className="flex border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                {(Object.keys(TAB_OPTIONS) as TabType[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "flex-1 py-3 text-sm font-medium transition-colors relative",
                      activeTab === tab
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                  >
                    {TAB_LABELS[tab]}
                    {activeTab === tab && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              {/* 快捷选项 */}
              <div className="p-3">
                <div className="flex flex-wrap gap-2">
                  {TAB_OPTIONS[activeTab].map((option) => (
                    <Button
                      key={option.key}
                      variant={getCurrentTabSelection() === option.key ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleQuickOption(option.key)}
                      className={cn(
                        "flex-1 min-w-[80px]",
                        getCurrentTabSelection() === option.key
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "hover:bg-gray-100 dark:hover:bg-gray-700"
                      )}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 自定义选择器 */}
              <div className="border-t border-gray-100 dark:border-gray-700">
                <details className="group" open={activeTab === "day"}>
                  <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {activeTab === "day" && "自定义日期"}
                      {activeTab === "week" && "选择周"}
                      {activeTab === "month" && "选择月份"}
                      {activeTab === "quarter" && "选择季度"}
                    </span>
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="p-3 pt-0">
                    <ComponentErrorBoundary
                      fallback={
                        <div className="text-center py-4 text-sm text-gray-500">
                          选择器加载失败
                        </div>
                      }
                    >
                      {activeTab === "day" && (
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 overflow-x-auto">
                          <DatePicker
                            mode="range"
                            selected={
                              customRange?.from && customRange?.to
                                ? { from: customRange.from, to: customRange.to }
                                : undefined
                            }
                            onSelect={handleCustomRangeSelect}
                            locale={zhCN}
                            className="rdp-enhanced"
                          />
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                            💡 点击同一天可选择单日，点击两个日期可选择范围
                          </div>
                        </div>
                      )}
                      {activeTab === "week" && (
                        <WeekPicker
                          onSelect={(weekRange) => {
                            setIsOpen(false);
                            updateURL({ start: weekRange.start, end: weekRange.end }, "custom");
                            onRangeChange?.({
                              start: new Date(weekRange.start),
                              end: new Date(weekRange.end),
                            });
                          }}
                        />
                      )}
                      {activeTab === "month" && (
                        <MonthPicker
                          onSelect={(monthRange) => {
                            setIsOpen(false);
                            updateURL({ start: monthRange.start, end: monthRange.end }, "custom");
                            onRangeChange?.({
                              start: new Date(monthRange.start),
                              end: new Date(monthRange.end),
                            });
                          }}
                        />
                      )}
                      {activeTab === "quarter" && (
                        <QuarterPicker
                          onSelect={(quarterRange) => {
                            setIsOpen(false);
                            updateURL({ start: quarterRange.start, end: quarterRange.end }, "custom");
                            onRangeChange?.({
                              start: new Date(quarterRange.start),
                              end: new Date(quarterRange.end),
                            });
                          }}
                        />
                      )}
                    </ComponentErrorBoundary>
                  </div>
                </details>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export function TabsRangePicker(props: TabsRangePickerProps) {
  return (
    <Suspense fallback={<Button variant="outline" disabled className="min-w-[100px]">加载中...</Button>}>
      <TabsRangePickerContent {...props} />
    </Suspense>
  );
}
