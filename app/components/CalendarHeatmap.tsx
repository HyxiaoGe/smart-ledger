'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/format';

interface DayData {
  date: string; // YYYY-MM-DD
  amount: number;
  count: number;
}

interface CalendarHeatmapProps {
  data: DayData[];
  year: number;
  month: number; // 1-12
  currency: string;
  onDayClick?: (date: string) => void;
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

/**
 * 根据消费金额计算热力等级 (0-4)
 */
function getHeatLevel(amount: number, maxAmount: number): number {
  if (amount === 0) return 0;
  if (maxAmount === 0) return 0;
  const ratio = amount / maxAmount;
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.75) return 3;
  return 4;
}

/**
 * 热力等级对应的颜色
 */
const HEAT_COLORS = [
  'bg-gray-100 dark:bg-gray-800', // 0: 无消费
  'bg-red-100 dark:bg-red-900/30', // 1: 低
  'bg-red-200 dark:bg-red-800/50', // 2: 中低
  'bg-red-300 dark:bg-red-700/70', // 3: 中高
  'bg-red-500 dark:bg-red-600', // 4: 高
];

export function CalendarHeatmap({
  data,
  year,
  month,
  currency,
  onDayClick,
}: CalendarHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  // 构建日期到数据的映射
  const dayMap = useMemo(() => {
    const map = new Map<string, DayData>();
    data.forEach((d) => map.set(d.date, d));
    return map;
  }, [data]);

  // 计算最大金额（用于归一化热力等级）
  const maxAmount = useMemo(() => {
    return Math.max(...data.map((d) => d.amount), 0);
  }, [data]);

  // 生成月历数据
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay(); // 0=周日

    const days: Array<{ day: number | null; date: string | null }> = [];

    // 填充月初空白
    for (let i = 0; i < startWeekday; i++) {
      days.push({ day: null, date: null });
    }

    // 填充日期
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, date: dateStr });
    }

    return days;
  }, [year, month]);

  // 月份名称
  const monthName = `${year}年${month}月`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-muted-foreground">
            {monthName} 消费日历
          </CardTitle>
          {/* 图例 */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>少</span>
            {HEAT_COLORS.map((color, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-sm ${color}`}
              />
            ))}
            <span>多</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 星期标题 */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="text-center text-xs text-muted-foreground font-medium py-1"
            >
              {label}
            </div>
          ))}
        </div>

        {/* 日历网格 */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((item, index) => {
            if (item.day === null) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const dayData = item.date ? dayMap.get(item.date) : null;
            const amount = dayData?.amount || 0;
            const count = dayData?.count || 0;
            const heatLevel = getHeatLevel(amount, maxAmount);
            const colorClass = HEAT_COLORS[heatLevel];

            const isToday =
              item.date === new Date().toISOString().slice(0, 10);
            const isHovered = hoveredDay === item.date;

            return (
              <div key={item.date} className="relative">
                <button
                  className={`
                    w-full aspect-square rounded-sm flex items-center justify-center
                    text-xs font-medium transition-all
                    ${colorClass}
                    ${isToday ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                    ${amount > 0 ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}
                    hover:ring-2 hover:ring-gray-400 hover:ring-offset-1
                  `}
                  onClick={() => item.date && onDayClick?.(item.date)}
                  onMouseEnter={() => setHoveredDay(item.date)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  {item.day}
                </button>

                {/* 自定义 Tooltip */}
                {isHovered && (
                  <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
                    <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-xs shadow-md whitespace-nowrap">
                      <div className="font-medium">{item.date}</div>
                      {amount > 0 ? (
                        <>
                          <div>支出: {formatCurrency(amount, currency)}</div>
                          <div>笔数: {count} 笔</div>
                        </>
                      ) : (
                        <div className="text-muted-foreground">无消费记录</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
