/**
 * 预算仓储接口
 * 定义所有预算数据访问的标准接口
 */

import type { Budget } from '@/lib/services/budgetService';

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

/**
 * 预算仓储接口
 */
export interface IBudgetRepository {
  /**
   * 根据 ID 查找预算
   */
  findById(id: string): Promise<Budget | null>;

  /**
   * 根据年月查找预算
   */
  findByYearMonth(year: number, month: number): Promise<Budget[]>;

  /**
   * 根据条件查找预算
   */
  findMany(filter: BudgetQueryFilter): Promise<Budget[]>;

  /**
   * 创建预算
   */
  create(budget: CreateBudgetDTO): Promise<Budget>;

  /**
   * 更新预算
   */
  update(id: string, budget: UpdateBudgetDTO): Promise<Budget>;

  /**
   * 删除预算
   */
  delete(id: string): Promise<void>;

  /**
   * 检查预算是否存在
   */
  exists(year: number, month: number, category_key?: string | null): Promise<boolean>;

  /**
   * 批量创建预算
   */
  createMany(budgets: CreateBudgetDTO[]): Promise<Budget[]>;
}
