/**
 * Prisma 常用备注仓储实现
 * 实现 ICommonNoteRepository 接口，提供基于 Prisma 的常用备注数据访问
 */

import type { PrismaClient } from '@prisma/client';
import type { CommonNote } from '@/types/domain/transaction';
import type { ICommonNoteRepository } from '@/lib/domain/repositories/ICommonNoteRepository';
import type {
  CreateCommonNoteDTO,
  UpdateCommonNoteDTO,
  CommonNoteQueryFilter,
  CommonNoteSortOptions,
} from '@/types/dto/common-note.dto';

/**
 * Prisma 常用备注仓储实现
 */
export class PrismaCommonNoteRepository implements ICommonNoteRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 根据 ID 查找备注
   */
  async findById(id: string): Promise<CommonNote | null> {
    const data = await this.prisma.common_notes.findUnique({
      where: { id },
    });

    return data ? this.mapToEntity(data) : null;
  }

  /**
   * 根据内容查找备注
   */
  async findByContent(content: string): Promise<CommonNote | null> {
    const data = await this.prisma.common_notes.findFirst({
      where: {
        content,
        is_active: true,
      },
    });

    return data ? this.mapToEntity(data) : null;
  }

  /**
   * 根据条件查找备注列表
   */
  async findMany(
    filter: CommonNoteQueryFilter,
    sort?: CommonNoteSortOptions,
    limit?: number
  ): Promise<CommonNote[]> {
    const where: Record<string, unknown> = {};

    if (filter.search) {
      where.content = {
        contains: filter.search,
        mode: 'insensitive',
      };
    }

    if (filter.category_affinity) {
      where.category_affinity = filter.category_affinity;
    }

    if (filter.merchant) {
      where.merchant = filter.merchant;
    }

    if (filter.subcategory) {
      where.subcategory = filter.subcategory;
    }

    if (filter.is_active !== undefined) {
      where.is_active = filter.is_active;
    }

    if (filter.minUsageCount !== undefined) {
      where.usage_count = {
        gte: filter.minUsageCount,
      };
    }

    // 构建排序
    const orderBy: Record<string, unknown> = sort
      ? { [sort.field]: sort.order }
      : { usage_count: 'desc' };

    const data = await this.prisma.common_notes.findMany({
      where,
      orderBy,
      take: limit,
    });

    return data.map(this.mapToEntity);
  }

  /**
   * 搜索备注（模糊匹配）
   */
  async search(keyword: string, limit: number = 10): Promise<CommonNote[]> {
    const data = await this.prisma.common_notes.findMany({
      where: {
        is_active: true,
        content: {
          contains: keyword,
          mode: 'insensitive',
        },
      },
      orderBy: { usage_count: 'desc' },
      take: limit,
    });

    return data.map(this.mapToEntity);
  }

  /**
   * 创建备注
   */
  async create(note: CreateCommonNoteDTO): Promise<CommonNote> {
    const data = await this.prisma.common_notes.create({
      data: {
        content: note.content,
        usage_count: 1,
        last_used: new Date(),
        is_active: true,
        context_tags: note.context_tags,
        avg_amount: note.avg_amount,
        time_patterns: note.time_patterns,
        category_affinity: note.category_affinity,
        merchant: note.merchant,
        subcategory: note.subcategory,
      },
    });

    return this.mapToEntity(data);
  }

  /**
   * 更新备注
   */
  async update(id: string, note: UpdateCommonNoteDTO): Promise<CommonNote> {
    const updateData: Record<string, unknown> = {};

    if (note.content !== undefined) updateData.content = note.content;
    if (note.usage_count !== undefined) updateData.usage_count = note.usage_count;
    if (note.last_used !== undefined) updateData.last_used = new Date(note.last_used);
    if (note.is_active !== undefined) updateData.is_active = note.is_active;
    if (note.context_tags !== undefined) updateData.context_tags = note.context_tags;
    if (note.avg_amount !== undefined) updateData.avg_amount = note.avg_amount;
    if (note.time_patterns !== undefined) updateData.time_patterns = note.time_patterns;
    if (note.category_affinity !== undefined) updateData.category_affinity = note.category_affinity;
    if (note.merchant !== undefined) updateData.merchant = note.merchant;
    if (note.subcategory !== undefined) updateData.subcategory = note.subcategory;

    const data = await this.prisma.common_notes.update({
      where: { id },
      data: updateData,
    });

    return this.mapToEntity(data);
  }

  /**
   * 删除备注
   */
  async delete(id: string): Promise<void> {
    await this.prisma.common_notes.delete({
      where: { id },
    });
  }

  /**
   * 增加使用次数
   */
  async incrementUsageCount(id: string): Promise<void> {
    await this.prisma.common_notes.update({
      where: { id },
      data: {
        usage_count: { increment: 1 },
        last_used: new Date(),
      },
    });
  }

  /**
   * 更新最后使用时间
   */
  async updateLastUsed(id: string): Promise<void> {
    await this.prisma.common_notes.update({
      where: { id },
      data: { last_used: new Date() },
    });
  }

  /**
   * 创建或更新备注（upsert）
   */
  async upsert(content: string, amount?: number, category?: string): Promise<CommonNote> {
    const existing = await this.findByContent(content);

    if (existing) {
      // 更新现有备注
      const updateData: UpdateCommonNoteDTO = {
        usage_count: existing.usage_count + 1,
        last_used: new Date().toISOString(),
      };

      // 更新平均金额
      if (amount !== undefined && existing.avg_amount !== undefined) {
        const newAvg =
          (existing.avg_amount * existing.usage_count + amount) / (existing.usage_count + 1);
        updateData.avg_amount = newAvg;
      } else if (amount !== undefined) {
        updateData.avg_amount = amount;
      }

      // 更新分类关联
      if (category) {
        updateData.category_affinity = category;
      }

      return this.update(existing.id, updateData);
    } else {
      // 创建新备注
      return this.create({
        content,
        avg_amount: amount,
        category_affinity: category,
      });
    }
  }

  /**
   * 获取最常用的备注
   */
  async findMostUsed(limit: number): Promise<CommonNote[]> {
    const data = await this.prisma.common_notes.findMany({
      where: { is_active: true },
      orderBy: [
        { usage_count: 'desc' },
        { last_used: 'desc' },
      ],
      take: limit,
    });

    return data.map(this.mapToEntity);
  }

  /**
   * 检查备注是否存在
   */
  async exists(content: string): Promise<boolean> {
    const count = await this.prisma.common_notes.count({
      where: {
        content,
        is_active: true,
      },
    });

    return count > 0;
  }

  /**
   * 将数据库记录映射为领域实体
   */
  private mapToEntity(row: any): CommonNote {
    return {
      id: row.id,
      content: row.content,
      usage_count: row.usage_count,
      last_used: row.last_used?.toISOString?.() || row.last_used,
      created_at: row.created_at?.toISOString?.() || row.created_at,
      is_active: row.is_active,
      context_tags: row.context_tags,
      avg_amount: row.avg_amount ? Number(row.avg_amount) : undefined,
      time_patterns: row.time_patterns,
      category_affinity: row.category_affinity,
      merchant: row.merchant,
      subcategory: row.subcategory,
    };
  }
}
