// 周报告详情页工具函数和常量

export const CATEGORY_MAP: Record<string, string> = {
  food: '餐饮',
  drink: '饮品',
  transport: '交通',
  shopping: '购物',
  entertainment: '娱乐',
  daily: '日用',
  housing: '住房',
  medical: '医疗',
  education: '教育',
  subscription: '订阅',
  rent: '房租',
  utilities: '水电费',
  other: '其他',
};

export const PAYMENT_METHOD_MAP: Record<string, string> = {
  alipay: '支付宝',
  wechat: '微信支付',
  cash: '现金',
  card: '银行卡',
  creditcard: '信用卡',
  debitcard: '借记卡',
  '未指定': '其他',
};

// 图表颜色配置
export const CATEGORY_COLORS = [
  '#9333ea', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#8b5cf6', '#f43f5e', '#14b8a6'
];

export const PAYMENT_COLORS = [
  '#3b82f6', '#06b6d4', '#0ea5e9', '#60a5fa',
  '#38bdf8', '#7dd3fc'
];

export function formatWeekRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const startMonth = start.getMonth() + 1;
  const startDay = start.getDate();
  const endMonth = end.getMonth() + 1;
  const endDay = end.getDate();

  if (startMonth === endMonth) {
    return `${startMonth}月${startDay}日 - ${endDay}日`;
  } else {
    return `${startMonth}月${startDay}日 - ${endMonth}月${endDay}日`;
  }
}

export function getWeekDescription(date: string): string {
  const d = new Date(date);
  const year = d.getFullYear();

  const firstDayOfYear = new Date(year, 0, 1);
  const daysDiff = Math.floor(
    (d.getTime() - firstDayOfYear.getTime()) / (1000 * 60 * 60 * 24)
  );
  const weekNumber = Math.ceil((daysDiff + firstDayOfYear.getDay() + 1) / 7);

  return `${year}年第${weekNumber}周`;
}

export function getCategoryName(category: string): string {
  return CATEGORY_MAP[category.toLowerCase()] || category;
}

export function getPaymentMethodName(method: string): string {
  return PAYMENT_METHOD_MAP[method.toLowerCase()] || method;
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '0.00';
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPercentage(value: number | null | undefined): string {
  if (value == null) return '+0.0%';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}
