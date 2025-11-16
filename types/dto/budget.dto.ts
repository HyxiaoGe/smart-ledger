/**
 * 预算 DTO 类型定义
 * Data Transfer Objects for Budget domain
 */

/**
 * 创建预算 DTO
 */
export interface CreateBudgetDTO {
  year: number;
  month: number;
  category_key: string | null;
  amount: number;
  alert_threshold?: number;
  is_active?: boolean;
}

/**
 * 更新预算 DTO
 */
export interface UpdateBudgetDTO {
  amount?: number;
  alert_threshold?: number;
  is_active?: boolean;
}

/**
 * 预算查询过滤条件
 */
export interface BudgetQueryFilter {
  year?: number;
  month?: number;
  category_key?: string | null;
  is_active?: boolean;
}
