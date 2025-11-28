/**
 * Repository 服务端入口
 * 仅在服务端（API 路由、Server Components）使用
 * 支持通过环境变量 USE_PRISMA=true 切换到 Prisma 实现
 */

import type { ITransactionRepository } from '@/lib/domain/repositories/ITransactionRepository';
import type { IBudgetRepository } from '@/lib/domain/repositories/IBudgetRepository';
import type { ICommonNoteRepository } from '@/lib/domain/repositories/ICommonNoteRepository';
import type { ICategoryRepository } from '@/lib/domain/repositories/ICategoryRepository';

// 判断是否使用 Prisma
const USE_PRISMA = process.env.USE_PRISMA === 'true';

/**
 * 服务端 Repository 工厂
 * 根据环境变量自动选择 Supabase 或 Prisma 实现
 */
class ServerRepositoryFactory {
  private static transactionRepository: ITransactionRepository;
  private static budgetRepository: IBudgetRepository;
  private static commonNoteRepository: ICommonNoteRepository;
  private static categoryRepository: ICategoryRepository;

  static getTransactionRepository(): ITransactionRepository {
    if (!this.transactionRepository) {
      if (USE_PRISMA) {
        const { prisma } = require('@/lib/clients/db/prisma');
        const { PrismaTransactionRepository } = require('./prisma/PrismaTransactionRepository');
        this.transactionRepository = new PrismaTransactionRepository(prisma);
      } else {
        const { supabase } = require('@/lib/clients/supabase/client');
        const { SupabaseTransactionRepository } = require('./SupabaseTransactionRepository');
        this.transactionRepository = new SupabaseTransactionRepository(supabase);
      }
    }
    return this.transactionRepository;
  }

  static getBudgetRepository(): IBudgetRepository {
    if (!this.budgetRepository) {
      if (USE_PRISMA) {
        const { prisma } = require('@/lib/clients/db/prisma');
        const { PrismaBudgetRepository } = require('./prisma/PrismaBudgetRepository');
        this.budgetRepository = new PrismaBudgetRepository(prisma);
      } else {
        const { supabase } = require('@/lib/clients/supabase/client');
        const { SupabaseBudgetRepository } = require('./SupabaseBudgetRepository');
        this.budgetRepository = new SupabaseBudgetRepository(supabase);
      }
    }
    return this.budgetRepository;
  }

  static getCommonNoteRepository(): ICommonNoteRepository {
    if (!this.commonNoteRepository) {
      if (USE_PRISMA) {
        const { prisma } = require('@/lib/clients/db/prisma');
        const { PrismaCommonNoteRepository } = require('./prisma/PrismaCommonNoteRepository');
        this.commonNoteRepository = new PrismaCommonNoteRepository(prisma);
      } else {
        const { supabase } = require('@/lib/clients/supabase/client');
        const { SupabaseCommonNoteRepository } = require('./SupabaseCommonNoteRepository');
        this.commonNoteRepository = new SupabaseCommonNoteRepository(supabase);
      }
    }
    return this.commonNoteRepository;
  }

  static getCategoryRepository(): ICategoryRepository {
    if (!this.categoryRepository) {
      if (USE_PRISMA) {
        const { prisma } = require('@/lib/clients/db/prisma');
        const { PrismaCategoryRepository } = require('./prisma/PrismaCategoryRepository');
        this.categoryRepository = new PrismaCategoryRepository(prisma);
      } else {
        const { supabase } = require('@/lib/clients/supabase/client');
        const { SupabaseCategoryRepository } = require('./SupabaseCategoryRepository');
        this.categoryRepository = new SupabaseCategoryRepository(supabase);
      }
    }
    return this.categoryRepository;
  }

  static reset(): void {
    this.transactionRepository = null as any;
    this.budgetRepository = null as any;
    this.commonNoteRepository = null as any;
    this.categoryRepository = null as any;
  }

  static getDbType(): 'prisma' | 'supabase' {
    return USE_PRISMA ? 'prisma' : 'supabase';
  }
}

// 导出工厂方法
export const getTransactionRepository = () => ServerRepositoryFactory.getTransactionRepository();
export const getBudgetRepository = () => ServerRepositoryFactory.getBudgetRepository();
export const getCommonNoteRepository = () => ServerRepositoryFactory.getCommonNoteRepository();
export const getCategoryRepository = () => ServerRepositoryFactory.getCategoryRepository();
export const resetRepositories = () => ServerRepositoryFactory.reset();
export const getDbType = () => ServerRepositoryFactory.getDbType();
