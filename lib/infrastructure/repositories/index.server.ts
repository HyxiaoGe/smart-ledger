/**
 * Repository 服务端入口
 * 仅在服务端（API 路由、Server Components）使用
 * 使用 Prisma 实现
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

/**
 * 服务端 Repository 工厂
 * 使用 Prisma 实现
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
      const { prisma } = require('@/lib/clients/db/prisma');
      const { PrismaTransactionRepository } = require('./prisma/PrismaTransactionRepository');
      this.transactionRepository = new PrismaTransactionRepository(prisma);
    }
    return this.transactionRepository;
  }

  static getBudgetRepository(): IBudgetRepository {
    if (!this.budgetRepository) {
      const { prisma } = require('@/lib/clients/db/prisma');
      const { PrismaBudgetRepository } = require('./prisma/PrismaBudgetRepository');
      this.budgetRepository = new PrismaBudgetRepository(prisma);
    }
    return this.budgetRepository;
  }

  static getCommonNoteRepository(): ICommonNoteRepository {
    if (!this.commonNoteRepository) {
      const { prisma } = require('@/lib/clients/db/prisma');
      const { PrismaCommonNoteRepository } = require('./prisma/PrismaCommonNoteRepository');
      this.commonNoteRepository = new PrismaCommonNoteRepository(prisma);
    }
    return this.commonNoteRepository;
  }

  static getCategoryRepository(): ICategoryRepository {
    if (!this.categoryRepository) {
      const { prisma } = require('@/lib/clients/db/prisma');
      const { PrismaCategoryRepository } = require('./prisma/PrismaCategoryRepository');
      this.categoryRepository = new PrismaCategoryRepository(prisma);
    }
    return this.categoryRepository;
  }

  static getPaymentMethodRepository(): IPaymentMethodRepository {
    if (!this.paymentMethodRepository) {
      const { prisma } = require('@/lib/clients/db/prisma');
      const { PrismaPaymentMethodRepository } = require('./prisma/PrismaPaymentMethodRepository');
      this.paymentMethodRepository = new PrismaPaymentMethodRepository(prisma);
    }
    return this.paymentMethodRepository;
  }

  static getRecurringExpenseRepository(): IRecurringExpenseRepository {
    if (!this.recurringExpenseRepository) {
      const { prisma } = require('@/lib/clients/db/prisma');
      const { PrismaRecurringExpenseRepository } = require('./prisma/PrismaRecurringExpenseRepository');
      this.recurringExpenseRepository = new PrismaRecurringExpenseRepository(prisma);
    }
    return this.recurringExpenseRepository;
  }

  static getWeeklyReportRepository(): IWeeklyReportRepository {
    if (!this.weeklyReportRepository) {
      const { prisma } = require('@/lib/clients/db/prisma');
      const { PrismaWeeklyReportRepository } = require('./prisma/PrismaWeeklyReportRepository');
      this.weeklyReportRepository = new PrismaWeeklyReportRepository(prisma);
    }
    return this.weeklyReportRepository;
  }

  static getAIFeedbackRepository(): IAIFeedbackRepository {
    if (!this.aiFeedbackRepository) {
      const { prisma } = require('@/lib/clients/db/prisma');
      const { PrismaAIFeedbackRepository } = require('./prisma/PrismaAIFeedbackRepository');
      this.aiFeedbackRepository = new PrismaAIFeedbackRepository(prisma);
    }
    return this.aiFeedbackRepository;
  }

  static getSystemLogRepository(): ISystemLogRepository {
    if (!this.systemLogRepository) {
      const { prisma } = require('@/lib/clients/db/prisma');
      const { PrismaSystemLogRepository } = require('./prisma/PrismaSystemLogRepository');
      this.systemLogRepository = new PrismaSystemLogRepository(prisma);
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

  static getDbType(): 'prisma' {
    return 'prisma';
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
