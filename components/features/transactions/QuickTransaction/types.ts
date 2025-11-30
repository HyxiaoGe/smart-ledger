export interface QuickTransactionItem {
  id: string;
  title: string;
  icon: string;
  category: string;
  fixedAmount?: number;  // 固定价格，如地铁
  suggestedAmount?: number;  // 建议价格，如午饭
  isFixed: boolean;  // 是否固定价格
}

export interface QuickTransactionCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}
