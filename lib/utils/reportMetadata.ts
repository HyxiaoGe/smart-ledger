export const REPORT_CATEGORY_NAME_MAP: Record<string, string> = {
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

export const REPORT_PAYMENT_METHOD_NAME_MAP: Record<string, string> = {
  alipay: '支付宝',
  wechat: '微信支付',
  cash: '现金',
  card: '银行卡',
  creditcard: '信用卡',
  debitcard: '借记卡',
  '未指定': '其他',
};

export function getReportCategoryName(category: string): string {
  return REPORT_CATEGORY_NAME_MAP[category.toLowerCase()] || category;
}

export function getReportPaymentMethodName(method: string): string {
  return REPORT_PAYMENT_METHOD_NAME_MAP[method.toLowerCase()] || method;
}
