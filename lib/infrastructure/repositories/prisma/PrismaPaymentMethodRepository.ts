/**
 * Prisma 支付方式仓储实现
 */

import type { PrismaClient } from '@/generated/prisma/client';
import type {
  IPaymentMethodRepository,
  PaymentMethod,
  PaymentMethodWithStats,
  PaymentMethodUsageDetail,
  CreatePaymentMethodDTO,
  UpdatePaymentMethodDTO,
} from '@/lib/domain/repositories/IPaymentMethodRepository';

export class PrismaPaymentMethodRepository implements IPaymentMethodRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<PaymentMethod | null> {
    const data = await this.prisma.payment_methods.findUnique({
      where: { id },
    });
    return data ? this.mapToEntity(data) : null;
  }

  async findAll(activeOnly = true): Promise<PaymentMethod[]> {
    const data = await this.prisma.payment_methods.findMany({
      where: activeOnly ? { is_active: true } : undefined,
      orderBy: [{ is_default: 'desc' }, { sort_order: 'asc' }, { created_at: 'asc' }],
    });
    return data.map(this.mapToEntity);
  }

  async findAllWithStats(): Promise<PaymentMethodWithStats[]> {
    const paymentMethods = await this.prisma.payment_methods.findMany({
      where: { is_active: true },
      orderBy: [{ is_default: 'desc' }, { sort_order: 'asc' }],
    });

    const stats = await this.prisma.transactions.groupBy({
      by: ['payment_method'],
      where: {
        deleted_at: null,
        payment_method: { not: null },
      },
      _count: true,
      _max: { date: true },
    });

    type PaymentStat = { count: number; lastUsed: Date | null };
    const statsMap = new Map<string | null, PaymentStat>(
      stats.map((s: { payment_method: string | null; _count: number; _max: { date: Date | null } }) => [
        s.payment_method,
        { count: s._count, lastUsed: s._max.date },
      ])
    );

    return paymentMethods.map((pm: { id: string; name: string; [key: string]: unknown }) => {
      const stat = statsMap.get(pm.id) || statsMap.get(pm.name);
      return {
        ...this.mapToEntity(pm),
        usage_count: stat?.count || 0,
        last_used: stat?.lastUsed?.toISOString() || null,
      };
    });
  }

  async findDefault(): Promise<PaymentMethod | null> {
    const data = await this.prisma.payment_methods.findFirst({
      where: { is_default: true, is_active: true },
    });
    return data ? this.mapToEntity(data) : null;
  }

  async create(data: CreatePaymentMethodDTO): Promise<PaymentMethod> {
    // 如果设置为默认，先清除其他默认
    if (data.is_default) {
      await this.prisma.payment_methods.updateMany({
        where: { is_default: true },
        data: { is_default: false },
      });
    }

    const result = await this.prisma.payment_methods.create({
      data: {
        name: data.name,
        type: data.type,
        icon: data.icon || null,
        color: data.color || null,
        last_4_digits: data.last_4_digits || null,
        is_default: data.is_default || false,
        is_active: true,
        sort_order: 0,
      },
    });

    return this.mapToEntity(result);
  }

  async update(id: string, data: UpdatePaymentMethodDTO): Promise<PaymentMethod> {
    const result = await this.prisma.payment_methods.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.last_4_digits !== undefined && { last_4_digits: data.last_4_digits }),
        ...(data.is_default !== undefined && { is_default: data.is_default }),
        ...(data.is_active !== undefined && { is_active: data.is_active }),
        ...(data.sort_order !== undefined && { sort_order: data.sort_order }),
        updated_at: new Date(),
      },
    });

    return this.mapToEntity(result);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.payment_methods.update({
      where: { id },
      data: { is_active: false },
    });
  }

  async setDefault(id: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.payment_methods.updateMany({
        where: { is_default: true },
        data: { is_default: false },
      }),
      this.prisma.payment_methods.update({
        where: { id },
        data: { is_default: true },
      }),
    ]);
  }

  async getUsageDetail(id: string): Promise<PaymentMethodUsageDetail> {
    const paymentMethod = await this.prisma.payment_methods.findUnique({
      where: { id },
    });

    if (!paymentMethod) {
      return {
        total_transactions: 0,
        total_amount: 0,
        avg_amount: 0,
        last_used: null,
        most_used_category: null,
        most_used_category_count: 0,
      };
    }

    // 查询使用该支付方式的交易统计
    const stats = await this.prisma.transactions.aggregate({
      where: {
        deleted_at: null,
        OR: [
          { payment_method: id },
          { payment_method: paymentMethod.name },
        ],
      },
      _count: true,
      _sum: { amount: true },
      _avg: { amount: true },
      _max: { date: true },
    });

    // 查询最常用分类
    const categoryStats = await this.prisma.transactions.groupBy({
      by: ['category'],
      where: {
        deleted_at: null,
        OR: [
          { payment_method: id },
          { payment_method: paymentMethod.name },
        ],
      },
      _count: true,
      orderBy: { _count: { category: 'desc' } },
      take: 1,
    });

    return {
      total_transactions: stats._count || 0,
      total_amount: Number(stats._sum.amount) || 0,
      avg_amount: Number(stats._avg.amount) || 0,
      last_used: stats._max.date?.toISOString() || null,
      most_used_category: categoryStats[0]?.category || null,
      most_used_category_count: categoryStats[0]?._count || 0,
    };
  }

  async migrateTransactions(fromId: string, toId: string): Promise<number> {
    const fromMethod = await this.prisma.payment_methods.findUnique({
      where: { id: fromId },
    });
    const toMethod = await this.prisma.payment_methods.findUnique({
      where: { id: toId },
    });

    if (!fromMethod || !toMethod) {
      return 0;
    }

    const result = await this.prisma.transactions.updateMany({
      where: {
        OR: [
          { payment_method: fromId },
          { payment_method: fromMethod.name },
        ],
      },
      data: { payment_method: toMethod.name },
    });

    return result.count;
  }

  private mapToEntity(row: any): PaymentMethod {
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      type: row.type as PaymentMethod['type'],
      icon: row.icon,
      color: row.color,
      last_4_digits: row.last_4_digits,
      is_default: row.is_default,
      is_active: row.is_active,
      sort_order: row.sort_order || 0,
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
      updated_at: row.updated_at?.toISOString() || new Date().toISOString(),
    };
  }
}
