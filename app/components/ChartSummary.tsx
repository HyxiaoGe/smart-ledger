"use client";
// 图表区优化：更美观的主题化样式、圆角、渐变、图例与自定义 Tooltip（中文注释）
import { AreaChart, Area, LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/EmptyState';
import { formatCurrency } from '@/lib/format';
import { PRESET_CATEGORIES } from '@/lib/config';

const COLORS = ['#F97316', '#A855F7', '#06B6D4', '#22C55E', '#EF4444', '#3B82F6', '#F59E0B', '#0EA5E9', '#94A3B8'];
const catMeta = new Map(PRESET_CATEGORIES.map(c => [c.key, { label: c.label, color: c.color || '#94A3B8' }]));

function currencyTick(value: any, currency: string) {
  return formatCurrency(Number(value || 0), currency);
}

function Title({ text }: { text: string }) {
  return <CardTitle className="text-base text-muted-foreground">{text}</CardTitle>;
}

function CustomTooltip({ active, payload, label, currency, kind }: any) {
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
    const meta = catMeta.get(key);
    const name = meta?.label || key;
    const val = p?.value ?? 0;
    const pct = p?.percent ? (p.percent * 100).toFixed(1) + '%' : '';
    return box(name, [["金额", formatCurrency(val, currency)], ["占比", pct]]);
  }
  return null;
}

export function ChartSummary({
  trend,
  pie,
  compare,
  currency
}: {
  trend: { name: string; expense: number }[];
  pie: { name: string; value: number }[];
  compare: { name: string; income: number; expense: number }[];
  currency: string;
}) {
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
          <Title text="类别占比" />
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
                  <Tooltip content={<CustomTooltip currency={currency} kind="pie" />} />
                  <Legend verticalAlign="bottom" height={24} formatter={(value: any) => (catMeta.get(value)?.label || value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <Title text="收支对比" />
        </CardHeader>
        <CardContent>
          {compare.length === 0 ? (
            <EmptyState description="暂无可比较的收支数据" />
          ) : (
            <div className="w-full h-[260px]">
              <ResponsiveContainer>
                <BarChart data={compare} margin={{ left: 8, right: 8, top: 8, bottom: 8 }} barGap={10} barCategoryGap="24%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(v) => currencyTick(v, currency)} tickLine={false} axisLine={false} width={80} />
                  <Tooltip content={<CustomTooltip currency={currency} kind="compare" />} />
                  <Legend verticalAlign="bottom" height={24} />
                  <Bar dataKey="income" name="收入" fill="#10B981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expense" name="支出" fill="#EF4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
