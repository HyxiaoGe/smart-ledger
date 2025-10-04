"use client";
// 快捷范围选择器（中文注释）：今日/昨日/近7日/当月
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

const OPTIONS = [
  { key: 'today', label: '今日' },
  { key: 'yesterday', label: '昨日' },
  { key: 'last7', label: '近7日' },
  { key: 'month', label: '当月' }
] as const;

export function RangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const current = (search.get('range') || 'today') as 'today' | 'yesterday' | 'last7' | 'month';

  function setRange(next: string) {
    const sp = new URLSearchParams(search?.toString());
    sp.set('range', next);
    // 当选择日维度时，移除 month 参数；选择 month 时保留已有 month（若无则自动由页面逻辑填充）
    if (next !== 'month') sp.delete('month');
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="flex gap-2">
      {OPTIONS.map(opt => (
        <Button key={opt.key} variant={current === opt.key ? 'default' : 'secondary'} onClick={() => setRange(opt.key)}>
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
