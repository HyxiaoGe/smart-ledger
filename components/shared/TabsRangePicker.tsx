"use client";

import { useState, useCallback, useEffect, useMemo, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { DatePicker } from "@/components/features/input/DatePicker";
import { ComponentErrorBoundary } from "@/components/layout/ErrorBoundary";
import { cn } from "@/lib/utils/helpers";
import {
  getExtendedQuickRange,
  formatDateToLocal,
  type ExtendedQuickRange,
} from "@/lib/utils/date";

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
function getTabFromRange(range: ExtendedQuickRange): TabType {
  if (["today", "yesterday", "dayBeforeYesterday"].includes(range)) return "day";
  if (["thisWeek", "lastWeek", "weekBeforeLast"].includes(range)) return "week";
  if (["thisMonth", "lastMonth", "monthBeforeLast"].includes(range)) return "month";
  if (["thisQuarter", "lastQuarter"].includes(range)) return "quarter";
  return "day";
}

export interface TabsRangePickerProps {
  className?: string;
  onRangeChange?: (range: { start: Date; end: Date } | null) => void;
}

function TabsRangePickerContent({ className, onRangeChange }: TabsRangePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("day");
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>();

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

  // 更新 URL 参数
  const updateURL = useCallback(
    (range: { start: string; end: string }, key: string) => {
      const sp = new URLSearchParams(search?.toString());

      sp.set("range", key);
      if (key === "custom") {
        sp.set("start", range.start);
        sp.set("end", range.end);
      } else {
        sp.delete("start");
        sp.delete("end");
      }
      sp.delete("month"); // 清除旧的月份参数

      router.push((pathname + "?" + sp.toString()) as any);
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
      // 结束日期需要+1天，因为查询是左闭右开
      const queryEnd = new Date(to);
      queryEnd.setDate(queryEnd.getDate() + 1);
      const queryEndStr = formatDateToLocal(queryEnd);

      setIsOpen(false);
      updateURL({ start: startStr, end: queryEndStr }, "custom");
      onRangeChange?.({ start: from, end: to });
    },
    [updateURL, onRangeChange]
  );

  // 获取显示文本
  const getDisplayText = useCallback(() => {
    if (current.key === "custom") {
      return current.label;
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

              {/* 自定义日期选择器（可折叠） */}
              <div className="border-t border-gray-100 dark:border-gray-700">
                <details className="group">
                  <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      自定义日期范围
                    </span>
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="p-3 pt-0">
                    <ComponentErrorBoundary
                      fallback={
                        <div className="text-center py-4 text-sm text-gray-500">
                          日期选择器加载失败
                        </div>
                      }
                    >
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
                      </div>
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
