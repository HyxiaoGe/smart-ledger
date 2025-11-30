// 智能备注上下文分析工具

export interface TimeContext {
  label: string;
  tags: string[];
  meal_period?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  work_period?: 'work_hours' | 'after_work' | 'weekend' | 'holiday';
  time_category: 'morning' | 'noon' | 'afternoon' | 'evening' | 'night';
}

/**
 * 根据当前时间生成时间上下文信息
 */
export function generateTimeContext(date: Date = new Date()): TimeContext {
  const hour = date.getHours();
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = day === 0 || day === 6;

  // 时间段分类
  let time_category: TimeContext['time_category'];
  let meal_period: TimeContext['meal_period'];
  let work_period: TimeContext['work_period'];

  if (hour >= 5 && hour < 9) {
    time_category = 'morning';
    meal_period = 'breakfast';
    work_period = isWeekend ? 'weekend' : 'work_hours';
  } else if (hour >= 9 && hour < 12) {
    time_category = 'noon';
    work_period = isWeekend ? 'weekend' : 'work_hours';
  } else if (hour >= 12 && hour < 14) {
    time_category = 'noon';
    meal_period = 'lunch';
    work_period = isWeekend ? 'weekend' : 'work_hours';
  } else if (hour >= 14 && hour < 17) {
    time_category = 'afternoon';
    work_period = isWeekend ? 'weekend' : 'work_hours';
  } else if (hour >= 17 && hour < 19) {
    time_category = 'afternoon';
    work_period = isWeekend ? 'weekend' : 'after_work';
  } else if (hour >= 19 && hour < 22) {
    time_category = 'evening';
    meal_period = hour < 21 ? 'dinner' : 'snack';
    work_period = isWeekend ? 'weekend' : 'after_work';
  } else {
    time_category = 'night';
    meal_period = 'snack';
    work_period = undefined; // 深夜时段不属于任何工作时段分类
  }

  // 生成标签
  const tags: string[] = [time_category];

  if (meal_period) {
    tags.push(meal_period === 'breakfast' ? '早餐' :
              meal_period === 'lunch' ? '午餐' :
              meal_period === 'dinner' ? '晚餐' : '夜宵');
  }

  if (work_period) {
    tags.push(work_period === 'work_hours' ? '工作时间' :
              work_period === 'after_work' ? '下班时间' :
              work_period === 'weekend' ? '周末' : '夜间');
  }

  if (isWeekend) {
    tags.push('周末');
  }

  // 生成描述性标签
  let label = '';
  if (meal_period === 'lunch' && work_period === 'work_hours') {
    label = '工作日午餐时间';
  } else if (meal_period === 'dinner' && work_period === 'after_work') {
    label = '下班晚餐时间';
  } else if (meal_period === 'breakfast') {
    label = '早餐时间';
  } else if (work_period === 'weekend') {
    label = '周末时间';
  } else if (work_period === 'work_hours') {
    label = '工作时间';
  } else if (time_category === 'night') {
    label = '夜间时间';
  } else {
    label = '日常时间';
  }

  return {
    label,
    tags,
    meal_period,
    work_period,
    time_category
  };
}

/**
 * 金额范围分类
 */
export function categorizeAmount(amount: number, category: string): {
  range: string;
  level: 'low' | 'medium' | 'high' | 'luxury';
  typical: boolean;
} {
  // 不同类别的金额区间定义（人民币）
  const categoryRanges: Record<string, { low: number; medium: number; high: number; luxury: number }> = {
    food: { low: 15, medium: 35, high: 80, luxury: 200 },
    drink: { low: 8, medium: 20, high: 50, luxury: 100 },
    transport: { low: 10, medium: 25, high: 60, luxury: 150 },
    entertainment: { low: 30, medium: 80, high: 200, luxury: 500 },
    rent: { low: 1000, medium: 2500, high: 5000, luxury: 10000 },
    utilities: { low: 100, medium: 300, high: 600, luxury: 1500 },
    daily: { low: 20, medium: 50, high: 120, luxury: 300 },
    subscription: { low: 15, medium: 40, high: 100, luxury: 300 },
    other: { low: 25, medium: 60, high: 150, luxury: 400 }
  };

  const ranges = categoryRanges[category] || categoryRanges.other;

  let level: 'low' | 'medium' | 'high' | 'luxury';
  let range: string;

  if (amount <= ranges.low) {
    level = 'low';
    range = `低价 (0-${ranges.low})`;
  } else if (amount <= ranges.medium) {
    level = 'medium';
    range = `中价 (${ranges.low}-${ranges.medium})`;
  } else if (amount <= ranges.high) {
    level = 'high';
    range = `高价 (${ranges.medium}-${ranges.high})`;
  } else {
    level = 'luxury';
    range = `奢华 (${ranges.high}+)`;
  }

  // 判断是否为典型金额（整数或常见价格点）
  const typical = amount % 10 === 0 ||
                 [5, 8, 15, 20, 25, 30, 35, 40, 45, 50, 60, 80, 100].includes(amount);

  return { range, level, typical };
}

/**
 * 生成消费场景描述
 */
export function generateConsumptionScenario(params: {
  category: string;
  amount: number;
  timeContext: TimeContext;
  currency?: string;
}): string {
  const { category, amount, timeContext, currency = 'CNY' } = params;
  const amountAnalysis = categorizeAmount(amount, category);

  // 基础场景描述
  let scenario = '';

  // 类别 + 时间 + 金额组合
  if (timeContext.meal_period) {
    const mealMap = {
      breakfast: '早餐',
      lunch: '午餐',
      dinner: '晚餐',
      snack: '加餐'
    };
    scenario = `${mealMap[timeContext.meal_period]}消费`;
  } else if (timeContext.work_period === 'work_hours') {
    scenario = '工作时间消费';
  } else if (timeContext.work_period === 'weekend') {
    scenario = '周末消费';
  } else if (timeContext.time_category === 'evening') {
    scenario = '晚间消费';
  } else {
    scenario = '日常消费';
  }

  // 添加金额特征
  if (amountAnalysis.typical) {
    scenario += '，金额较为典型';
  } else if (amountAnalysis.level === 'luxury') {
    scenario += '，金额较高';
  }

  return scenario;
}