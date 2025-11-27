/**
 * Repository 统一导出
 * 提供便捷的 Repository 创建和访问方式
 */

import { supabase } from '@/lib/clients/supabase/client';
import { SupabaseTransactionRepository } from './SupabaseTransactionRepository';
import { SupabaseBudgetRepository } from './SupabaseBudgetRepository';
import { SupabaseCommonNoteRepository } from './SupabaseCommonNoteRepository';
import { SupabaseCategoryRepository } from './SupabaseCategoryRepository';

// 导出 Repository 类
export { SupabaseTransactionRepository } from './SupabaseTransactionRepository';
export { SupabaseBudgetRepository } from './SupabaseBudgetRepository';
export { SupabaseCommonNoteRepository } from './SupabaseCommonNoteRepository';
export { SupabaseCategoryRepository } from './SupabaseCategoryRepository';

/**
 * Repository 工厂
 * 提供单例的 Repository 实例
 */
class RepositoryFactory {
  private static transactionRepository: SupabaseTransactionRepository;
  private static budgetRepository: SupabaseBudgetRepository;
  private static commonNoteRepository: SupabaseCommonNoteRepository;
  private static categoryRepository: SupabaseCategoryRepository;

  /**
   * 获取交易仓储实例
   */
  static getTransactionRepository(): SupabaseTransactionRepository {
    if (!this.transactionRepository) {
      this.transactionRepository = new SupabaseTransactionRepository(supabase);
    }
    return this.transactionRepository;
  }

  /**
   * 获取预算仓储实例
   */
  static getBudgetRepository(): SupabaseBudgetRepository {
    if (!this.budgetRepository) {
      this.budgetRepository = new SupabaseBudgetRepository(supabase);
    }
    return this.budgetRepository;
  }

  /**
   * 获取常用备注仓储实例
   */
  static getCommonNoteRepository(): SupabaseCommonNoteRepository {
    if (!this.commonNoteRepository) {
      this.commonNoteRepository = new SupabaseCommonNoteRepository(supabase);
    }
    return this.commonNoteRepository;
  }

  /**
   * 获取分类仓储实例
   */
  static getCategoryRepository(): SupabaseCategoryRepository {
    if (!this.categoryRepository) {
      this.categoryRepository = new SupabaseCategoryRepository(supabase);
    }
    return this.categoryRepository;
  }

  /**
   * 重置所有 Repository 实例（用于测试）
   */
  static reset(): void {
    this.transactionRepository = null as any;
    this.budgetRepository = null as any;
    this.commonNoteRepository = null as any;
    this.categoryRepository = null as any;
  }
}

// 导出工厂方法
export const getTransactionRepository = () => RepositoryFactory.getTransactionRepository();
export const getBudgetRepository = () => RepositoryFactory.getBudgetRepository();
export const getCommonNoteRepository = () => RepositoryFactory.getCommonNoteRepository();
export const getCategoryRepository = () => RepositoryFactory.getCategoryRepository();
export const resetRepositories = () => RepositoryFactory.reset();

// 导出默认实例（便于直接使用）
export const transactionRepository = getTransactionRepository();
export const budgetRepository = getBudgetRepository();
export const commonNoteRepository = getCommonNoteRepository();
export const categoryRepository = getCategoryRepository();
