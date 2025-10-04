// 交易记录类型定义（所有注释均为中文）

export type Currency = 'CNY' | 'USD';

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  amount: number; // 注意：前端以 number 处理，后端存储为 NUMERIC
  note?: string;
  date: string; // ISO 日期字符串，如 2025-10-04
  created_at?: string;
  currency?: Currency; // 允许记录币种，默认 CNY
}

