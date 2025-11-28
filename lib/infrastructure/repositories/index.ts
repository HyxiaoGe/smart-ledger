/**
 * Repository 客户端入口
 * 仅包含 Supabase 实现，可在客户端安全使用
 *
 * 注意：如需在服务端使用（支持 Prisma 切换），请使用 index.server.ts
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
 * 客户端 Repository 工厂
 * 仅使用 Supabase 实现
 */
class ClientRepositoryFactory {
  private static transactionRepository: SupabaseTransactionRepository;
  private static budgetRepository: SupabaseBudgetRepository;
  private static commonNoteRepository: SupabaseCommonNoteRepository;
  private static categoryRepository: SupabaseCategoryRepository;

  static getTransactionRepository(): SupabaseTransactionRepository {
    if (!this.transactionRepository) {
      this.transactionRepository = new SupabaseTransactionRepository(supabase);
    }
    return this.transactionRepository;
  }

  static getBudgetRepository(): SupabaseBudgetRepository {
    if (!this.budgetRepository) {
      this.budgetRepository = new SupabaseBudgetRepository(supabase);
    }
    return this.budgetRepository;
  }

  static getCommonNoteRepository(): SupabaseCommonNoteRepository {
    if (!this.commonNoteRepository) {
      this.commonNoteRepository = new SupabaseCommonNoteRepository(supabase);
    }
    return this.commonNoteRepository;
  }

  static getCategoryRepository(): SupabaseCategoryRepository {
    if (!this.categoryRepository) {
      this.categoryRepository = new SupabaseCategoryRepository(supabase);
    }
    return this.categoryRepository;
  }

  static reset(): void {
    this.transactionRepository = null as any;
    this.budgetRepository = null as any;
    this.commonNoteRepository = null as any;
    this.categoryRepository = null as any;
  }
}

// 导出工厂方法
export const getTransactionRepository = () => ClientRepositoryFactory.getTransactionRepository();
export const getBudgetRepository = () => ClientRepositoryFactory.getBudgetRepository();
export const getCommonNoteRepository = () => ClientRepositoryFactory.getCommonNoteRepository();
export const getCategoryRepository = () => ClientRepositoryFactory.getCategoryRepository();
export const resetRepositories = () => ClientRepositoryFactory.reset();

// 导出默认实例（便于直接使用）
export const transactionRepository = getTransactionRepository();
export const budgetRepository = getBudgetRepository();
export const commonNoteRepository = getCommonNoteRepository();
export const categoryRepository = getCategoryRepository();
