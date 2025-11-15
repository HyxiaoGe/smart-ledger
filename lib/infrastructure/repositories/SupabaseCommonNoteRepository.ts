/**
 * Supabase 常用备注仓储实现
 * 实现 ICommonNoteRepository 接口，提供基于 Supabase 的常用备注数据访问
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CommonNote } from '@/types/transaction';
import type {
  ICommonNoteRepository,
  CreateCommonNoteDTO,
  UpdateCommonNoteDTO,
  CommonNoteQueryFilter,
  CommonNoteSortOptions
} from '@/lib/domain/repositories/ICommonNoteRepository';

/**
 * Supabase 常用备注仓储实现
 */
export class SupabaseCommonNoteRepository implements ICommonNoteRepository {
  private readonly tableName = 'common_notes';

  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * 根据 ID 查找备注
   */
  async findById(id: string): Promise<CommonNote | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find common note by id: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  /**
   * 根据内容查找备注
   */
  async findByContent(content: string): Promise<CommonNote | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('content', content)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find common note by content: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  /**
   * 根据条件查找备注列表
   */
  async findMany(
    filter: CommonNoteQueryFilter,
    sort?: CommonNoteSortOptions,
    limit?: number
  ): Promise<CommonNote[]> {
    let query = this.supabase.from(this.tableName).select('*');

    // 应用过滤条件
    if (filter.search) {
      query = query.ilike('content', `%${filter.search}%`);
    }

    if (filter.category_affinity) {
      query = query.eq('category_affinity', filter.category_affinity);
    }

    if (filter.merchant) {
      query = query.eq('merchant', filter.merchant);
    }

    if (filter.subcategory) {
      query = query.eq('subcategory', filter.subcategory);
    }

    if (filter.is_active !== undefined) {
      query = query.eq('is_active', filter.is_active);
    }

    if (filter.minUsageCount !== undefined) {
      query = query.gte('usage_count', filter.minUsageCount);
    }

    // 应用排序
    if (sort) {
      query = query.order(sort.field, { ascending: sort.order === 'asc' });
    } else {
      query = query.order('usage_count', { ascending: false });
    }

    // 应用限制
    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to find common notes: ${error.message}`);
    }

    return (data || []).map(this.mapToEntity);
  }

  /**
   * 搜索备注（模糊匹配）
   */
  async search(keyword: string, limit: number = 10): Promise<CommonNote[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('is_active', true)
      .ilike('content', `%${keyword}%`)
      .order('usage_count', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to search common notes: ${error.message}`);
    }

    return (data || []).map(this.mapToEntity);
  }

  /**
   * 创建备注
   */
  async create(note: CreateCommonNoteDTO): Promise<CommonNote> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert({
        content: note.content,
        usage_count: 1,
        last_used: new Date().toISOString(),
        is_active: true,
        context_tags: note.context_tags,
        avg_amount: note.avg_amount,
        time_patterns: note.time_patterns,
        category_affinity: note.category_affinity,
        merchant: note.merchant,
        subcategory: note.subcategory
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create common note: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  /**
   * 更新备注
   */
  async update(id: string, note: UpdateCommonNoteDTO): Promise<CommonNote> {
    const updateData: any = {};

    if (note.content !== undefined) updateData.content = note.content;
    if (note.usage_count !== undefined) updateData.usage_count = note.usage_count;
    if (note.last_used !== undefined) updateData.last_used = note.last_used;
    if (note.is_active !== undefined) updateData.is_active = note.is_active;
    if (note.context_tags !== undefined) updateData.context_tags = note.context_tags;
    if (note.avg_amount !== undefined) updateData.avg_amount = note.avg_amount;
    if (note.time_patterns !== undefined) updateData.time_patterns = note.time_patterns;
    if (note.category_affinity !== undefined)
      updateData.category_affinity = note.category_affinity;
    if (note.merchant !== undefined) updateData.merchant = note.merchant;
    if (note.subcategory !== undefined) updateData.subcategory = note.subcategory;

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update common note: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  /**
   * 删除备注
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from(this.tableName).delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete common note: ${error.message}`);
    }
  }

  /**
   * 增加使用次数
   */
  async incrementUsageCount(id: string): Promise<void> {
    const { error } = await this.supabase.rpc('increment_note_usage_count', {
      note_id: id
    });

    if (error) {
      // 如果存储过程不存在，使用手动更新
      const note = await this.findById(id);
      if (note) {
        await this.update(id, {
          usage_count: note.usage_count + 1,
          last_used: new Date().toISOString()
        });
      }
    }
  }

  /**
   * 更新最后使用时间
   */
  async updateLastUsed(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .update({ last_used: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update last used: ${error.message}`);
    }
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
        last_used: new Date().toISOString()
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
        category_affinity: category
      });
    }
  }

  /**
   * 获取最常用的备注
   */
  async findMostUsed(limit: number): Promise<CommonNote[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('is_active', true)
      .order('usage_count', { ascending: false })
      .order('last_used', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to find most used notes: ${error.message}`);
    }

    return (data || []).map(this.mapToEntity);
  }

  /**
   * 检查备注是否存在
   */
  async exists(content: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('id')
      .eq('content', content)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to check note existence: ${error.message}`);
    }

    return !!data;
  }

  /**
   * 将数据库记录映射为领域实体
   */
  private mapToEntity(row: any): CommonNote {
    return {
      id: row.id,
      content: row.content,
      usage_count: row.usage_count,
      last_used: row.last_used,
      created_at: row.created_at,
      is_active: row.is_active,
      context_tags: row.context_tags,
      avg_amount: row.avg_amount ? Number(row.avg_amount) : undefined,
      time_patterns: row.time_patterns,
      category_affinity: row.category_affinity,
      merchant: row.merchant,
      subcategory: row.subcategory
    };
  }
}
