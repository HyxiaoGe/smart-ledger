/**
 * 支付方式仓储接口
 * 定义所有支付方式数据访问的标准接口
 */

export interface PaymentMethod {
  id: string;
  user_id: string | null;
  name: string;
  type: 'credit_card' | 'debit_card' | 'alipay' | 'wechat' | 'cash' | 'other';
  icon: string | null;
  color: string | null;
  last_4_digits: string | null;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethodWithStats extends PaymentMethod {
  usage_count: number;
  last_used: string | null;
}

export interface PaymentMethodUsageDetail {
  total_transactions: number;
  total_amount: number;
  avg_amount: number;
  last_used: string | null;
  most_used_category: string | null;
  most_used_category_count: number;
}

export interface CreatePaymentMethodDTO {
  name: string;
  type: PaymentMethod['type'];
  icon?: string;
  color?: string;
  last_4_digits?: string;
  is_default?: boolean;
}

export interface UpdatePaymentMethodDTO {
  name?: string;
  icon?: string;
  color?: string;
  last_4_digits?: string;
  is_default?: boolean;
  is_active?: boolean;
  sort_order?: number;
}

/**
 * 支付方式仓储接口
 */
export interface IPaymentMethodRepository {
  /**
   * 根据 ID 查找支付方式
   */
  findById(id: string): Promise<PaymentMethod | null>;

  /**
   * 获取所有支付方式
   */
  findAll(activeOnly?: boolean): Promise<PaymentMethod[]>;

  /**
   * 获取带统计信息的支付方式列表
   */
  findAllWithStats(): Promise<PaymentMethodWithStats[]>;

  /**
   * 获取默认支付方式
   */
  findDefault(): Promise<PaymentMethod | null>;

  /**
   * 创建支付方式
   */
  create(data: CreatePaymentMethodDTO): Promise<PaymentMethod>;

  /**
   * 更新支付方式
   */
  update(id: string, data: UpdatePaymentMethodDTO): Promise<PaymentMethod>;

  /**
   * 删除支付方式
   */
  delete(id: string): Promise<void>;

  /**
   * 设置默认支付方式
   */
  setDefault(id: string): Promise<void>;

  /**
   * 获取支付方式使用详情
   */
  getUsageDetail(id: string): Promise<PaymentMethodUsageDetail>;

  /**
   * 迁移交易到另一个支付方式
   */
  migrateTransactions(fromId: string, toId: string): Promise<number>;
}
