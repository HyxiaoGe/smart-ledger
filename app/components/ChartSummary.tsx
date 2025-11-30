"use client";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/EmptyState';
import { formatCurrency } from '@/lib/utils/format';
import { useCategories } from '@/contexts/CategoryContext';
import { useMemo } from 'react';
import { PieChart as PieChartIcon } from 'lucide-react';
import type { TooltipPayloadItem } from '@/types/ui/chart';

interface CategoryMeta {
  label: string;
  color: string;
}

interface ChartSummaryTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  currency: string;
  kind: 'trend' | 'pie';
  catMeta?: Map<string, CategoryMeta>;
}

const COLORS = ['#F97316', '#A855F7', '#06B6D4', '#22C55E', '#EF4444', '#3B82F6', '#F59E0B', '#0EA5E9', '#94A3B8'];

function currencyTick(value: number | string, currency: string) {
  return formatCurrency(Number(value || 0), currency);
}

function Title({ text }: { text: string }) {
  return <CardTitle className="text-base text-muted-foreground">{text}</CardTitle>;
}

function CustomTooltip({ active, payload, label, currency, kind, catMeta }: ChartSummaryTooltipProps) {
  if (!active) return null;
  const box = (title: string, rows: Array<[string, string]>) => (
    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-sm">
      <div className="mb-1 font-medium">{title}</div>
      {rows.map(([k, v], i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">{k}</span>
          <span className="font-medium">{v}</span>
        </div>
      ))}
    </div>
  );
  if (kind === 'trend') {
    const val = payload?.[0]?.value ?? 0;
    return box(String(label), [['支出', formatCurrency(val, currency)]]);
  }
  if (kind === 'pie') {
    const p = payload?.[0];
    if (!p) return null;
    const key = p?.name as string;
    const meta = catMeta?.get(key);
    const name = meta?.label || key;
    const val = p?.value ?? 0;
    const pct = (p as TooltipPayloadItem & { percent?: number })?.percent
      ? ((p as TooltipPayloadItem & { percent?: number }).percent! * 100).toFixed(1) + '%'
      : '';
    return box(name, [['金额', formatCurrency(val, currency)], ['占比', pct]]);
  }
  return null;
}

export function ChartSummary({
  trend,
  pie,
  rangeLabel,
  currency,
}: {
  trend: { name: string; expense: number }[];
  pie: { name: string; value: number }[];
  rangeLabel: string;
  currency: string;
}) {
  const { categories } = useCategories();

  // 动态构建分类元数据映射
  const catMeta = useMemo(() => {
    return new Map(categories.map((c) => [c.key, { label: c.label, color: c.color || '#94A3B8' }]));
  }, [categories]);

  // 判断是否显示趋势图（日粒度时不显示）
  const showTrend = trend.length > 0;

  // 判断是使用柱状图还是面积图
  // 周粒度（7个数据点）用柱状图，月/季粒度用面积图
  const useBarChart = trend.length <= 7;

  return (
    <div className={`grid gap-4 ${showTrend ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
      {/* 动态趋势图 */}
      {showTrend && (
        <Card>
          <CardHeader>
            <Title text={`${rangeLabel}支出趋势`} />
          </CardHeader>
          <CardContent>
            <div className="w-full h-[260px]">
              <ResponsiveContainer>
                {useBarChart ? (
                  <BarChart data={trend} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis
                      tickFormatter={(v) => currencyTick(v, currency)}
                      tickLine={false}
                      axisLine={false}
                      width={80}
                    />
                    <Tooltip content={<CustomTooltip currency={currency} kind="trend" />} />
                    <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <AreaChart data={trend} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                    <defs>
                      <linearGradient id="expGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis
                      tickFormatter={(v) => currencyTick(v, currency)}
                      tickLine={false}
                      axisLine={false}
                      width={80}
                    />
                    <Tooltip content={<CustomTooltip currency={currency} kind="trend" />} />
                    <Area
                      type="monotone"
                      dataKey="expense"
                      stroke="#EF4444"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#expGradient)"
                      activeDot={{ r: 4 }}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 分类饼图 */}
      <Card>
        <CardHeader>
          <Title text={`${rangeLabel}分类占比`} />
        </CardHeader>
        <CardContent>
          {pie.length === 0 ? (
            <EmptyState
              icon={PieChartIcon}
              title="暂无分类数据"
              description="暂无可用于占比的支出记录"
            />
          ) : (
            <div className="w-full h-[260px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    stroke="#fff"
                    strokeWidth={1}
                  >
                    {pie.map((entry, index) => {
                      const meta = catMeta.get(entry.name);
                      const color = meta?.color || COLORS[index % COLORS.length];
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Pie>
                  <Tooltip content={<CustomTooltip currency={currency} kind="pie" catMeta={catMeta} />} />
                  <Legend
                    verticalAlign="bottom"
                    height={24}
                    formatter={(value: string) => catMeta.get(value)?.label || value}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
