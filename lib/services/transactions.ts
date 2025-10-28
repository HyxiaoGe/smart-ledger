import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabaseClient';
import { parseMonthStr, formatMonth, getQuickRange } from '@/lib/date';

type DateRange = { start: string; end: string; label: string };

export async function listTransactionsByRange(
  month?: string,
  range?: string,
  startDate?: string,
  endDate?: string
) {
  // 计算当前日期，确保缓存键包含日期信息
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD格式

  const cacheKey = [
    'records:transactions',
    month ?? 'all',
    range ?? 'today',
    startDate ?? 'none',
    endDate ?? 'none',
    today // 添加当前日期到缓存键
  ];

  const getCached = unstable_cache(
    async () => {
      let dateRange: DateRange | undefined;
      let query;

      if (range && range !== 'month') {
        if (range === 'custom' && startDate && endDate) {
          dateRange = { start: startDate, end: endDate, label: `${startDate} - ${endDate}` };
        } else {
          dateRange = getQuickRange(range as any, month);
        }

        query = supabase
          .from('transactions')
          .select('*')
          .is('deleted_at', null)
          .eq('type', 'expense');

        if ((range === 'today' || range === 'yesterday') && dateRange.start === dateRange.end) {
          query = query.eq('date', dateRange.start);
        } else if (range === 'custom') {
          const end = new Date(dateRange.end);
          end.setDate(end.getDate() + 1);
          const endDateStr = end.toISOString().slice(0, 10);
          query = query.gte('date', dateRange.start).lt('date', endDateStr);
        } else if (dateRange) {
          query = query.gte('date', dateRange.start).lt('date', dateRange.end);
        }
      } else {
        let parsedMonth: Date | null = null;
        if (range === 'month') {
          parsedMonth = new Date();
        } else {
          parsedMonth = parseMonthStr(month || formatMonth(new Date()));
        }

        if (!parsedMonth) {
          query = supabase
            .from('transactions')
            .select('*')
            .is('deleted_at', null)
            .eq('type', 'expense')
            .order('date', { ascending: false });
          const { data, error } = await query;
          if (error) throw error;
          return { rows: data ?? [], monthLabel: '全部' } as const;
        }

        const start = new Date(parsedMonth.getFullYear(), parsedMonth.getMonth(), 1)
          .toISOString()
          .slice(0, 10);
        const end = new Date(parsedMonth.getFullYear(), parsedMonth.getMonth() + 1, 1)
          .toISOString()
          .slice(0, 10);
        dateRange = { start, end, label: formatMonth(parsedMonth) };

        query = supabase
          .from('transactions')
          .select('*')
          .is('deleted_at', null)
          .eq('type', 'expense')
          .gte('date', start)
          .lt('date', end)
          .order('date', { ascending: false });
      }

      const { data, error } = await query!;
      if (error) throw error;
      return { rows: data ?? [], monthLabel: dateRange?.label ?? '全部' } as const;
    },
    cacheKey,
    { revalidate: 60, tags: ['transactions'] }
  );

  return getCached();
}

export async function listYesterdayTransactions(range?: string) {
  // 计算昨天的日期（在函数外部计算，确保缓存键包含日期）
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const cacheKey = ['records:yesterday', range ?? 'none', yesterdayStr];
  const getCached = unstable_cache(
    async () => {
      if (range !== 'today' && range !== 'yesterday') {
        return [];
      }

      const { data } = await supabase
        .from('transactions')
        .select('*')
        .is('deleted_at', null)
        .eq('type', 'expense')
        .eq('date', yesterdayStr)
        .order('date', { ascending: false });

      return data || [];
    },
    cacheKey,
    { revalidate: 300, tags: ['transactions'] } // 增加到5分钟，但包含日期键
  );
  return getCached();
}

export async function getCurrentMonthSummary() {
  // 计算当前月份（在函数外部计算，确保缓存键包含月份）
  const today = new Date();
  const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM格式

  const getCached = unstable_cache(
    async () => {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1)
        .toISOString()
        .slice(0, 10);

      const { data: monthData } = await supabase
        .from('transactions')
        .select('*')
        .is('deleted_at', null)
        .eq('type', 'expense')
        .gte('date', monthStart)
        .lt('date', monthEnd)
        .order('date', { ascending: false });

      const monthDaily = new Map<string, { total: number; count: number }>();
      for (const r of monthData || []) {
        const key = r.date;
        const cur = monthDaily.get(key) || { total: 0, count: 0 };
        monthDaily.set(key, { total: cur.total + Number(r.amount || 0), count: cur.count + 1 });
      }

      const monthItems = Array.from(monthDaily.entries()).map(([date, v]) => ({
        date,
        total: v.total,
        count: v.count
      }));
      const monthTotalAmount = monthItems.reduce((sum, item) => sum + item.total, 0);
      const monthTotalCount = monthItems.reduce((sum, item) => sum + item.count, 0);

      return { monthItems, monthTotalAmount, monthTotalCount };
    },
    ['records:month-summary', currentMonth],
    { revalidate: 300, tags: ['transactions'] } // 增加到5分钟，但包含月份键
  );

  return getCached();
}

// AI分析统一数据获取接口
export async function getAIAnalysisData(targetMonth?: string) {
  // 确定目标月份
  const today = new Date();
  const currentMonth = targetMonth || today.toISOString().slice(0, 7);

  // 计算日期范围
  const currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
  if (targetMonth) {
    const [year, month] = targetMonth.split('-').map(Number);
    currentDate.setFullYear(year, month - 1, 1);
  }

  const currentYear = currentDate.getFullYear();
  const currentMonthNum = currentDate.getMonth() + 1;

  // 计算上个月
  const lastMonthNum = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
  const lastYear = currentMonthNum === 1 ? currentYear - 1 : currentYear;

  // 格式化日期范围
  const formatDate = (year: number, month: number) => {
    return `${year}-${month.toString().padStart(2, '0')}`;
  };

  const currentMonthStr = formatDate(currentYear, currentMonthNum);
  const lastMonthStr = formatDate(lastYear, lastMonthNum);

  const cacheKey = [
    'aiAnalysisDataV2', // 修改缓存key让旧缓存失效
    currentMonthStr,
    lastMonthStr
  ];

  const getCached = unstable_cache(
    async () => {
      console.log('AI分析数据查询:', { currentMonthStr, lastMonthStr });

      // 并行查询所需数据
      const [
        currentMonthFullResult,
        lastMonthResult,
        currentMonthTop20Result
      ] = await Promise.all([
        // 当前月完整数据 (包含note字段，用于DeepInsight)
        supabase
          .from('transactions')
          .select('category, amount, date, note')
          .gte('date', `${currentMonthStr}-01`)
          .lt('date', `${currentMonthNum === 12 ? currentYear + 1 : currentYear}-${currentMonthNum === 12 ? '01' : (currentMonthNum + 1).toString().padStart(2, '0')}-01`)
          .eq('type', 'expense')
          .is('deleted_at', null)
          .is('is_auto_generated', false) // 过滤掉自动生成的交易记录
          .is('recurring_expense_id', null) // 过滤掉固定支出关联的交易记录
          .order('date', { ascending: false }),

        // 上个月数据 (用于趋势分析)
        supabase
          .from('transactions')
          .select('category, amount, date')
          .gte('date', `${lastMonthStr}-01`)
          .lt('date', `${currentMonthStr}-01`)
          .eq('type', 'expense')
          .is('deleted_at', null)
          .is('is_auto_generated', false) // 过滤掉自动生成的交易记录
          .is('recurring_expense_id', null), // 过滤掉固定支出关联的交易记录

        // 当前月高金额数据 (用于个性化建议)
        supabase
          .from('transactions')
          .select('category, amount, date')
          .gte('date', `${currentMonthStr}-01`)
          .lt('date', `${currentMonthNum === 12 ? currentYear + 1 : currentYear}-${currentMonthNum === 12 ? '01' : (currentMonthNum + 1).toString().padStart(2, '0')}-01`)
          .eq('type', 'expense')
          .is('deleted_at', null)
          .is('is_auto_generated', false) // 过滤掉自动生成的交易记录
          .is('recurring_expense_id', null) // 过滤掉固定支出关联的交易记录
          .order('amount', { ascending: false })
          .limit(20)
      ]);

      if (currentMonthFullResult.error || lastMonthResult.error || currentMonthTop20Result.error) {
        console.error('AI数据查询错误:', {
          currentMonthFull: currentMonthFullResult.error,
          lastMonth: lastMonthResult.error,
          top20: currentMonthTop20Result.error
        });
        throw new Error('获取AI分析数据失败');
      }

      return {
        currentMonthFull: currentMonthFullResult.data || [],
        lastMonth: lastMonthResult.data || [],
        currentMonthTop20: currentMonthTop20Result.data || [],
        currentMonthStr,
        lastMonthStr
      };

    },
    cacheKey,
    { revalidate: 300, tags: ['transactions'] } // 5分钟缓存
  );

  return getCached();
}
