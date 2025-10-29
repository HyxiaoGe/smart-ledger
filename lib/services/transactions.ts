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

// 预测分析数据获取接口 - 获取多个月份的历史数据用于AI预测
export async function getPredictionData(monthsToAnalyze: number = 6) {
  const currentDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  // 生成要分析的月份数组
  const monthsData = [];
  for (let i = 0; i < monthsToAnalyze; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const monthStr = `${year}-${month.toString().padStart(2, '0')}`;

    monthsData.push({
      year,
      month,
      monthStr,
      start: `${monthStr}-01`,
      end: month === 12 ? `${year + 1}-01-01` : `${year}-${(month + 1).toString().padStart(2, '0')}-01`
    });
  }

  const cacheKey = [
    'predictionDataV1',
    monthsToAnalyze.toString(),
    currentDate.toISOString().slice(0, 7) // 当前月份，确保缓存时效性
  ];

  const getCached = unstable_cache(
    async () => {
    
      // 并行查询所有月份数据
      const monthResults = await Promise.all(
        monthsData.map(({ start, end }) =>
          supabase
            .from('transactions')
            .select('category, amount, date, note')
            .gte('date', start)
            .lt('date', end)
            .eq('type', 'expense')
            .is('deleted_at', null)
            .is('is_auto_generated', false) // 过滤掉自动生成的交易记录
            .is('recurring_expense_id', null) // 过滤掉固定支出关联的交易记录
            .order('date', { ascending: false })
        )
      );

      // 检查查询结果
      const hasError = monthResults.some(result => result.error);
      if (hasError) {
        console.error('预测数据查询错误:', monthResults.map(r => r.error));
        throw new Error('获取预测数据失败');
      }

      // 整理数据
      const monthlyData = monthsData.map(({ monthStr }, index) => ({
        month: monthStr,
        transactions: monthResults[index].data || [],
        totalAmount: monthResults[index].data?.reduce((sum, t) => sum + t.amount, 0) || 0,
        transactionCount: monthResults[index].data?.length || 0
      }));

      // 分析整体趋势和模式
      const allTransactions = monthlyData.flatMap(m => m.transactions);

      // 按类别聚合数据
      const categoryData = {};
      allTransactions.forEach(t => {
        if (!categoryData[t.category]) {
          categoryData[t.category] = [];
        }
        categoryData[t.category].push({
          amount: t.amount,
          date: t.date,
          month: t.date.slice(0, 7)
        });
      });

      // 计算各类别的月度平均和趋势
      const categoryAnalysis = Object.entries(categoryData).map(([category, transactions]) => {
        const monthlyAmounts = {};
        transactions.forEach(t => {
          if (!monthlyAmounts[t.month]) {
            monthlyAmounts[t.month] = 0;
          }
          monthlyAmounts[t.month] += t.amount;
        });

        const amounts = Object.values(monthlyAmounts);
        const avgAmount = amounts.length > 0 ? amounts.reduce((sum, a) => sum + a, 0) / amounts.length : 0;
        const maxAmount = amounts.length > 0 ? Math.max(...amounts) : 0;
        const minAmount = amounts.length > 0 ? Math.min(...amounts) : 0;

        return {
          category,
          totalTransactions: transactions.length,
          avgAmount: Math.round(avgAmount * 100) / 100,
          maxAmount,
          minAmount,
          monthlyAmounts,
          trend: amounts.length >= 2 ?
            (amounts[amounts.length - 1] - amounts[0]) / amounts[0] * 100 : 0
        };
      });

      // 高级分析 - 支出模式和时间分布
      const spendingPatterns = analyzeSpendingPatterns(allTransactions);
      const seasonalPatterns = analyzeSeasonalPatterns(monthlyData);
      const timeDistribution = analyzeTimeDistribution(allTransactions);

      return {
        monthlyData,
        categoryAnalysis,
        overallStats: {
          totalMonths: monthlyData.length,
          totalTransactions: allTransactions.length,
          avgMonthlySpending: Math.round(
            monthlyData.reduce((sum, m) => sum + m.totalAmount, 0) / monthlyData.length * 100
          ) / 100,
          dataQuality: {
            sufficientData: monthlyData.length >= 3,
            consistentData: monthlyData.every(m => m.transactionCount > 0),
            recentDataAvailable: monthlyData[0]?.transactionCount > 0,
            dataRichness: allTransactions.length >= 50 // 数据丰富度
          }
        },
        advancedAnalysis: {
          spendingPatterns,
          seasonalPatterns,
          timeDistribution
        }
      };
    },
    cacheKey,
    { revalidate: 1800, tags: ['transactions'] } // 30分钟缓存，预测数据不需要频繁更新
  );

  return getCached();
}

/**
 * 分析支出模式
 */
function analyzeSpendingPatterns(transactions: any[]) {
  if (!transactions || transactions.length === 0) {
    return { frequency: 0, avgAmount: 0, regularityScore: 0 };
  }

  // 分析交易频率
  const dailySpending = {};
  transactions.forEach(t => {
    const date = t.date.split('T')[0]; // 只取日期部分
    if (!dailySpending[date]) {
      dailySpending[date] = { count: 0, amount: 0 };
    }
    dailySpending[date].count++;
    dailySpending[date].amount += t.amount;
  });

  const daysWithSpending = Object.keys(dailySpending).length;
  const totalDays = 30; // 假设分析30天的数据
  const frequency = daysWithSpending / totalDays;

  // 计算平均金额
  const avgAmount = transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length;

  // 计算规律性评分（基于每日支出的方差）
  const dailyAmounts = Object.values(dailySpending).map((d: any) => d.amount);
  const variance = dailyAmounts.reduce((sum, amount) => {
    const mean = dailyAmounts.reduce((s, a) => s + a, 0) / dailyAmounts.length;
    return sum + Math.pow(amount - mean, 2);
  }, 0) / dailyAmounts.length;

  const regularityScore = Math.max(0, 100 - Math.sqrt(variance) / avgAmount * 100);

  return {
    frequency: Math.round(frequency * 100) / 100,
    avgAmount: Math.round(avgAmount * 100) / 100,
    regularityScore: Math.round(regularityScore),
    spendingDays: daysWithSpending,
    avgDailySpending: Math.round(Object.values(dailySpending).reduce((sum: number, d: any) => sum + d.amount, 0) / daysWithSpending * 100) / 100
  };
}

/**
 * 分析季节性模式
 */
function analyzeSeasonalPatterns(monthlyData: any[]) {
  if (!monthlyData || monthlyData.length < 3) {
    return { seasonality: 'low', quarterlyTrends: [], monthlyVariation: 0 };
  }

  // 按季度分组
  const quarterlyData = {};
  monthlyData.forEach(month => {
    const date = new Date(month.month + '-01');
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    const year = date.getFullYear();
    const key = `${year}-Q${quarter}`;

    if (!quarterlyData[key]) {
      quarterlyData[key] = { total: 0, count: 0 };
    }
    quarterlyData[key].total += month.totalAmount;
    quarterlyData[key].count++;
  });

  // 计算季度趋势
  const quarterlyTrends = Object.entries(quarterlyData).map(([quarter, data]: [string, any]) => ({
    quarter,
    avgSpending: Math.round(data.total / data.count * 100) / 100,
    monthsCount: data.count
  }));

  // 计算月度变异系数
  const amounts = monthlyData.map(m => m.totalAmount);
  const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
  const stdDev = Math.sqrt(amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length);
  const monthlyVariation = stdDev / mean;

  // 判断季节性强度
  let seasonality = 'low';
  if (monthlyVariation > 0.3) {
    seasonality = 'high';
  } else if (monthlyVariation > 0.15) {
    seasonality = 'medium';
  }

  return {
    seasonality,
    quarterlyTrends,
    monthlyVariation: Math.round(monthlyVariation * 100) / 100,
    coefficientOfVariation: monthlyVariation
  };
}

/**
 * 分析时间分布
 */
function analyzeTimeDistribution(transactions: any[]) {
  if (!transactions || transactions.length === 0) {
    return { peakHours: [], peakDays: [], timePreference: 'none' };
  }

  // 分析小时分布
  const hourlyDistribution = {};
  const dayOfWeekDistribution = {};

  transactions.forEach(t => {
    try {
      const date = new Date(t.date);
      const hour = date.getHours();
      const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday

      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
      dayOfWeekDistribution[dayOfWeek] = (dayOfWeekDistribution[dayOfWeek] || 0) + 1;
    } catch (error) {
      // 忽略无效日期
    }
  });

  // 找出高峰时段
  const peakHours = Object.entries(hourlyDistribution)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([hour]) => parseInt(hour));

  // 找出高峰日
  const peakDays = Object.entries(dayOfWeekDistribution)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([day]) => {
      const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return { day: parseInt(day), name: dayNames[parseInt(day)], count: dayOfWeekDistribution[day] as number };
    });

  // 分析时间偏好
  let timePreference = 'none';
  const weekdayTotal = [1,2,3,4,5].reduce((sum, day) => sum + (dayOfWeekDistribution[day] || 0), 0);
  const weekendTotal = [0,6].reduce((sum, day) => sum + (dayOfWeekDistribution[day] || 0), 0);

  if (weekdayTotal > weekendTotal * 1.5) {
    timePreference = 'weekday';
  } else if (weekendTotal > weekdayTotal * 1.5) {
    timePreference = 'weekend';
  } else {
    timePreference = 'balanced';
  }

  return {
    peakHours,
    peakDays,
    timePreference,
    hourlyDistribution,
    dayOfWeekDistribution
  };
}
