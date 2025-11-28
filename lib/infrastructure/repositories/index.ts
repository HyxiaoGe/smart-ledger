/**
 * Repository 统一导出
 * 提供便捷的 Repository 创建和访问方式
 * 支持通过环境变量 USE_PRISMA=true 切换到 Prisma 实现
 */

import type { ITransactionRepository } from '@/lib/domain/repositories/ITransactionRepository';
import type { IBudgetRepository } from '@/lib/domain/repositories/IBudgetRepository';
import type { ICommonNoteRepository } from '@/lib/domain/repositories/ICommonNoteRepository';
import type { ICategoryRepository } from '@/lib/domain/repositories/ICategoryRepository';

// 判断是否使用 Prisma
const USE_PRISMA = process.env.USE_PRISMA === 'true';

// 导出 Repository 类（保持向后兼容）
export { SupabaseTransactionRepository } from './SupabaseTransactionRepository';
export { SupabaseBudgetRepository } from './SupabaseBudgetRepository';
export { SupabaseCommonNoteRepository } from './SupabaseCommonNoteRepository';
export { SupabaseCategoryRepository } from './SupabaseCategoryRepository';

// 导出 Prisma Repository 类
export {
  PrismaTransactionRepository,
  PrismaCommonNoteRepository,
  PrismaBudgetRepository,
  PrismaCategoryRepository,
} from './prisma';

/**
 * Repository 工厂
 * 提供单例的 Repository 实例
 * 根据环境变量自动选择 Supabase 或 Prisma 实现
 */
class RepositoryFactory {
  private static transactionRepository: ITransactionRepository;
  private static budgetRepository: IBudgetRepository;
  private static commonNoteRepository: ICommonNoteRepository;
  private static categoryRepository: ICategoryRepository;

  /**
   * 获取交易仓储实例
   */
  static getTransactionRepository(): ITransactionRepository {
    if (!this.transactionRepository) {
      if (USE_PRISMA) {
        const { prisma } = require('@/lib/clients/db/prisma');
        const { PrismaTransactionRepository } = require('./prisma');
        this.transactionRepository = new PrismaTransactionRepository(prisma);
      } else {
        const { supabase } = require('@/lib/clients/supabase/client');
        const { SupabaseTransactionRepository } = require('./SupabaseTransactionRepository');
        this.transactionRepository = new SupabaseTransactionRepository(supabase);
      }
    }
    return this.transactionRepository;
  }

  /**
   * 获取预算仓储实例
   */
  static getBudgetRepository(): IBudgetRepository {
    if (!this.budgetRepository) {
      if (USE_PRISMA) {
        const { prisma } = require('@/lib/clients/db/prisma');
        const { PrismaBudgetRepository } = require('./prisma');
        this.budgetRepository = new PrismaBudgetRepository(prisma);
      } else {
        const { supabase } = require('@/lib/clients/supabase/client');
        const { SupabaseBudgetRepository } = require('./SupabaseBudgetRepository');
        this.budgetRepository = new SupabaseBudgetRepository(supabase);
      }
    }
    return this.budgetRepository;
  }

  /**
   * 获取常用备注仓储实例
   */
  static getCommonNoteRepository(): ICommonNoteRepository {
    if (!this.commonNoteRepository) {
      if (USE_PRISMA) {
        const { prisma } = require('@/lib/clients/db/prisma');
        const { PrismaCommonNoteRepository } = require('./prisma');
        this.commonNoteRepository = new PrismaCommonNoteRepository(prisma);
      } else {
        const { supabase } = require('@/lib/clients/supabase/client');
        const { SupabaseCommonNoteRepository } = require('./SupabaseCommonNoteRepository');
        this.commonNoteRepository = new SupabaseCommonNoteRepository(supabase);
      }
    }
    return this.commonNoteRepository;
  }

  /**
   * 获取分类仓储实例
   */
  static getCategoryRepository(): ICategoryRepository {
    if (!this.categoryRepository) {
      if (USE_PRISMA) {
        const { prisma } = require('@/lib/clients/db/prisma');
        const { PrismaCategoryRepository } = require('./prisma');
        this.categoryRepository = new PrismaCategoryRepository(prisma);
      } else {
        const { supabase } = require('@/lib/clients/supabase/client');
        const { SupabaseCategoryRepository } = require('./SupabaseCategoryRepository');
        this.categoryRepository = new SupabaseCategoryRepository(supabase);
      }
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

  /**
   * 获取当前使用的数据库类型
   */
  static getDbType(): 'prisma' | 'supabase' {
    return USE_PRISMA ? 'prisma' : 'supabase';
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
