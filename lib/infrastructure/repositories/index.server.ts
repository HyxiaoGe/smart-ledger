/**
 * Repository 服务端入口
 * 仅在服务端（API 路由、Server Components）使用
 * 支持通过环境变量 USE_PRISMA=true 切换到 Prisma 实现
 */

import type { ITransactionRepository } from '@/lib/domain/repositories/ITransactionRepository';
import type { IBudgetRepository } from '@/lib/domain/repositories/IBudgetRepository';
import type { ICommonNoteRepository } from '@/lib/domain/repositories/ICommonNoteRepository';
import type { ICategoryRepository } from '@/lib/domain/repositories/ICategoryRepository';
import type { IPaymentMethodRepository } from '@/lib/domain/repositories/IPaymentMethodRepository';
import type { IRecurringExpenseRepository } from '@/lib/domain/repositories/IRecurringExpenseRepository';
import type { IWeeklyReportRepository } from '@/lib/domain/repositories/IWeeklyReportRepository';
import type { IAIFeedbackRepository } from '@/lib/domain/repositories/IAIFeedbackRepository';
import type { ISystemLogRepository } from '@/lib/domain/repositories/ISystemLogRepository';

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
  private static paymentMethodRepository: IPaymentMethodRepository;
  private static recurringExpenseRepository: IRecurringExpenseRepository;
  private static weeklyReportRepository: IWeeklyReportRepository;
  private static aiFeedbackRepository: IAIFeedbackRepository;
  private static systemLogRepository: ISystemLogRepository;

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

  static getPaymentMethodRepository(): IPaymentMethodRepository {
    if (!this.paymentMethodRepository) {
      if (USE_PRISMA) {
        const { prisma } = require('@/lib/clients/db/prisma');
        const { PrismaPaymentMethodRepository } = require('./prisma/PrismaPaymentMethodRepository');
        this.paymentMethodRepository = new PrismaPaymentMethodRepository(prisma);
      } else {
        const { supabase } = require('@/lib/clients/supabase/client');
        const { SupabasePaymentMethodRepository } = require('./SupabasePaymentMethodRepository');
        this.paymentMethodRepository = new SupabasePaymentMethodRepository(supabase);
      }
    }
    return this.paymentMethodRepository;
  }

  static getRecurringExpenseRepository(): IRecurringExpenseRepository {
    if (!this.recurringExpenseRepository) {
      if (USE_PRISMA) {
        const { prisma } = require('@/lib/clients/db/prisma');
        const { PrismaRecurringExpenseRepository } = require('./prisma/PrismaRecurringExpenseRepository');
        this.recurringExpenseRepository = new PrismaRecurringExpenseRepository(prisma);
      } else {
        const { supabase } = require('@/lib/clients/supabase/client');
        const { SupabaseRecurringExpenseRepository } = require('./SupabaseRecurringExpenseRepository');
        this.recurringExpenseRepository = new SupabaseRecurringExpenseRepository(supabase);
      }
    }
    return this.recurringExpenseRepository;
  }

  static getWeeklyReportRepository(): IWeeklyReportRepository {
    if (!this.weeklyReportRepository) {
      if (USE_PRISMA) {
        const { prisma } = require('@/lib/clients/db/prisma');
        const { PrismaWeeklyReportRepository } = require('./prisma/PrismaWeeklyReportRepository');
        this.weeklyReportRepository = new PrismaWeeklyReportRepository(prisma);
      } else {
        const { supabase } = require('@/lib/clients/supabase/client');
        const { SupabaseWeeklyReportRepository } = require('./SupabaseWeeklyReportRepository');
        this.weeklyReportRepository = new SupabaseWeeklyReportRepository(supabase);
      }
    }
    return this.weeklyReportRepository;
  }

  static getAIFeedbackRepository(): IAIFeedbackRepository {
    if (!this.aiFeedbackRepository) {
      if (USE_PRISMA) {
        const { prisma } = require('@/lib/clients/db/prisma');
        const { PrismaAIFeedbackRepository } = require('./prisma/PrismaAIFeedbackRepository');
        this.aiFeedbackRepository = new PrismaAIFeedbackRepository(prisma);
      } else {
        const { supabase } = require('@/lib/clients/supabase/client');
        const { SupabaseAIFeedbackRepository } = require('./SupabaseAIFeedbackRepository');
        this.aiFeedbackRepository = new SupabaseAIFeedbackRepository(supabase);
      }
    }
    return this.aiFeedbackRepository;
  }

  static getSystemLogRepository(): ISystemLogRepository {
    if (!this.systemLogRepository) {
      if (USE_PRISMA) {
        const { prisma } = require('@/lib/clients/db/prisma');
        const { PrismaSystemLogRepository } = require('./prisma/PrismaSystemLogRepository');
        this.systemLogRepository = new PrismaSystemLogRepository(prisma);
      } else {
        const { supabase } = require('@/lib/clients/supabase/client');
        const { SupabaseSystemLogRepository } = require('./SupabaseSystemLogRepository');
        this.systemLogRepository = new SupabaseSystemLogRepository(supabase);
      }
    }
    return this.systemLogRepository;
  }

  static reset(): void {
    this.transactionRepository = null as any;
    this.budgetRepository = null as any;
    this.commonNoteRepository = null as any;
    this.categoryRepository = null as any;
    this.paymentMethodRepository = null as any;
    this.recurringExpenseRepository = null as any;
    this.weeklyReportRepository = null as any;
    this.aiFeedbackRepository = null as any;
    this.systemLogRepository = null as any;
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
export const getPaymentMethodRepository = () => ServerRepositoryFactory.getPaymentMethodRepository();
export const getRecurringExpenseRepository = () => ServerRepositoryFactory.getRecurringExpenseRepository();
export const getWeeklyReportRepository = () => ServerRepositoryFactory.getWeeklyReportRepository();
export const getAIFeedbackRepository = () => ServerRepositoryFactory.getAIFeedbackRepository();
export const getSystemLogRepository = () => ServerRepositoryFactory.getSystemLogRepository();
export const resetRepositories = () => ServerRepositoryFactory.reset();
export const getDbType = () => ServerRepositoryFactory.getDbType();
