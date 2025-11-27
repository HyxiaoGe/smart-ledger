"use client";
import { useSearchParams, useRouter } from 'next/navigation';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/EmptyState';
import { formatCurrency } from '@/lib/utils/format';
import { useCategories } from '@/contexts/CategoryContext';
import { useMemo } from 'react';

const COLORS = ['#F97316', '#A855F7', '#06B6D4', '#22C55E', '#EF4444', '#3B82F6', '#F59E0B', '#0EA5E9', '#94A3B8'];

function currencyTick(value: any, currency: string) {
  return formatCurrency(Number(value || 0), currency);
}

function Title({ text }: { text: string }) {
  return <CardTitle className="text-base text-muted-foreground">{text}</CardTitle>;
}

function CustomTooltip({ active, payload, label, currency, kind, catMeta }: any) {
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
    return box(`第 ${label} 日`, [["支出", formatCurrency(val, currency)]]);
  }
  if (kind === 'compare') {
    const p = payload || [];
    const inc = p.find((x: any) => x.dataKey === 'income')?.value ?? 0;
    const exp = p.find((x: any) => x.dataKey === 'expense')?.value ?? 0;
    return box(String(label), [["收入", formatCurrency(inc, currency)], ["支出", formatCurrency(exp, currency)]]);
  }
  if (kind === 'pie') {
    const p = payload?.[0];
    if (!p) return null;
    const key = p?.name as string;
    const meta = catMeta?.get(key);
    const name = meta?.label || key;
    const val = p?.value ?? 0;
    const pct = p?.percent ? (p.percent * 100).toFixed(1) + '%' : '';
    return box(name, [["金额", formatCurrency(val, currency)], ["占比", pct]]);
  }
  return null;
}

export function ChartSummary({
  trend,
  pieMonth,
  pieRange,
    currency
}: {
  trend: { name: string; expense: number }[];
  pieMonth: { name: string; value: number }[];
  pieRange?: { name: string; value: number }[];
    currency: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { categories } = useCategories();

  // 动态构建分类元数据映射
  const catMeta = useMemo(() => {
    return new Map(categories.map(c => [c.key, { label: c.label, color: c.color || '#94A3B8' }]));
  }, [categories]);

  const rangeParam = searchParams.get('range') || 'today';
  const monthParam = searchParams.get('month') || '';
  const currencyParam = searchParams.get('currency') || '';

  // 将range参数映射为pieMode
  const pieMode = rangeParam === 'month' ? 'month' : 'range';
  const pie = pieMode === 'range' && pieRange ? pieRange : pieMonth;

  // 处理按钮点击，更新URL参数
  const handleModeChange = (mode: 'month' | 'range') => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('range', mode === 'month' ? 'month' : 'today');
    if (monthParam) newParams.set('month', monthParam);
    if (currencyParam) newParams.set('currency', currencyParam);
    router.push(`/?${newParams.toString()}`);
  };
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <Title text="月度支出趋势" />
        </CardHeader>
        <CardContent>
          {trend.length === 0 ? (
            <EmptyState description="当月暂无支出记录" />
          ) : (
            <div className="w-full h-[260px]">
              <ResponsiveContainer>
                <AreaChart data={trend} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <defs>
                    <linearGradient id="expGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(v) => currencyTick(v, currency)} tickLine={false} axisLine={false} width={80} />
                  <Tooltip content={<CustomTooltip currency={currency} kind="trend" />} />
                  <Area type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#expGradient)" activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Title text="类别占比" />
            {pieRange && (
              <div className="flex gap-1 text-xs">
                <button
                  className={`h-7 px-2 rounded-md border ${pieMode==='range'?'bg-muted':''}`}
                  onClick={() => handleModeChange('range')}
                >
                  今日
                </button>
                <button
                  className={`h-7 px-2 rounded-md border ${pieMode==='month'?'bg-muted':''}`}
                  onClick={() => handleModeChange('month')}
                >
                  本月
                </button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pie.length === 0 ? (
            <EmptyState description="暂无可用于占比的支出记录" />
          ) : (
            <div className="w-full h-[260px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2} stroke="#fff" strokeWidth={1}>
                    {pie.map((entry, index) => {
                      const meta = catMeta.get(entry.name);
                      const color = meta?.color || COLORS[index % COLORS.length];
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Pie>
                  <Tooltip content={<CustomTooltip currency={currency} kind="pie" catMeta={catMeta} />} />
                  <Legend verticalAlign="bottom" height={24} formatter={(value: any) => (catMeta.get(value)?.label || value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {null}
    </div>
  );
}
