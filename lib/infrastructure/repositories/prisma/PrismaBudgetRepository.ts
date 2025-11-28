/**
 * Prisma 预算仓储实现
 * 实现 IBudgetRepository 接口，提供基于 Prisma 的预算数据访问
 */

import type { PrismaClient, Prisma } from '@/generated/prisma/client';
import type { Budget } from '@/lib/services/budgetService';
import type { IBudgetRepository } from '@/lib/domain/repositories/IBudgetRepository';
import type {
  CreateBudgetDTO,
  UpdateBudgetDTO,
  BudgetQueryFilter,
} from '@/types/dto/budget.dto';

/**
 * Prisma 预算仓储实现
 */
export class PrismaBudgetRepository implements IBudgetRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 根据 ID 查找预算
   */
  async findById(id: string): Promise<Budget | null> {
    const data = await this.prisma.budgets.findUnique({
      where: { id },
    });

    return data ? this.mapToEntity(data) : null;
  }

  /**
   * 根据年月查找预算
   */
  async findByYearMonth(year: number, month: number): Promise<Budget[]> {
    const data = await this.prisma.budgets.findMany({
      where: {
        year,
        month,
      },
      orderBy: { category_key: 'asc' },
    });

    return data.map(this.mapToEntity);
  }

  /**
   * 根据条件查找预算
   */
  async findMany(filter: BudgetQueryFilter): Promise<Budget[]> {
    const where: Prisma.budgetsWhereInput = {};

    if (filter.year !== undefined) {
      where.year = filter.year;
    }

    if (filter.month !== undefined) {
      where.month = filter.month;
    }

    if (filter.category_key !== undefined) {
      where.category_key = filter.category_key;
    }

    if (filter.is_active !== undefined) {
      where.is_active = filter.is_active;
    }

    const data = await this.prisma.budgets.findMany({
      where,
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
    });

    return data.map(this.mapToEntity);
  }

  /**
   * 创建预算
   */
  async create(budget: CreateBudgetDTO): Promise<Budget> {
    const data = await this.prisma.budgets.create({
      data: {
        year: budget.year,
        month: budget.month,
        category_key: budget.category_key,
        amount: budget.amount,
        alert_threshold: budget.alert_threshold ?? 0.8,
        is_active: budget.is_active ?? true,
      },
    });

    return this.mapToEntity(data);
  }

  /**
   * 更新预算
   */
  async update(id: string, budget: UpdateBudgetDTO): Promise<Budget> {
    const updateData: Prisma.budgetsUpdateInput = {
      updated_at: new Date(),
    };

    if (budget.amount !== undefined) updateData.amount = budget.amount;
    if (budget.alert_threshold !== undefined) updateData.alert_threshold = budget.alert_threshold;
    if (budget.is_active !== undefined) updateData.is_active = budget.is_active;

    const data = await this.prisma.budgets.update({
      where: { id },
      data: updateData,
    });

    return this.mapToEntity(data);
  }

  /**
   * 删除预算
   */
  async delete(id: string): Promise<void> {
    await this.prisma.budgets.delete({
      where: { id },
    });
  }

  /**
   * 检查预算是否存在
   */
  async exists(year: number, month: number, category_key?: string | null): Promise<boolean> {
    const where: Prisma.budgetsWhereInput = {
      year,
      month,
    };

    if (category_key !== undefined) {
      where.category_key = category_key;
    }

    const count = await this.prisma.budgets.count({ where });

    return count > 0;
  }

  /**
   * 批量创建预算
   */
  async createMany(budgets: CreateBudgetDTO[]): Promise<Budget[]> {
    const data = budgets.map((b) => ({
      year: b.year,
      month: b.month,
      category_key: b.category_key,
      amount: b.amount,
      alert_threshold: b.alert_threshold ?? 0.8,
      is_active: b.is_active ?? true,
    }));

    // 使用事务批量创建并返回结果
    const created = await this.prisma.$transaction(
      data.map((item) => this.prisma.budgets.create({ data: item }))
    );

    return created.map(this.mapToEntity);
  }

  /**
   * 将数据库记录映射为领域实体
   */
  private mapToEntity(row: any): Budget {
    return {
      id: row.id,
      year: row.year,
      month: row.month,
      category_key: row.category_key,
      amount: Number(row.amount),
      alert_threshold: Number(row.alert_threshold),
      is_active: row.is_active,
      created_at: row.created_at?.toISOString?.() || row.created_at,
      updated_at: row.updated_at?.toISOString?.() || row.updated_at,
    };
  }
}
