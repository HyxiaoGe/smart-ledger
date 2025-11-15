/**
 * 常用备注仓储接口
 * 定义所有常用备注数据访问的标准接口
 */

import type { CommonNote } from '@/types/transaction';

/**
 * 创建常用备注 DTO
 */
export interface CreateCommonNoteDTO {
  content: string;
  context_tags?: string[];
  avg_amount?: number;
  time_patterns?: string[];
  category_affinity?: string;
  merchant?: string;
  subcategory?: string;
}

/**
 * 更新常用备注 DTO
 */
export interface UpdateCommonNoteDTO {
  content?: string;
  usage_count?: number;
  last_used?: string;
  is_active?: boolean;
  context_tags?: string[];
  avg_amount?: number;
  time_patterns?: string[];
  category_affinity?: string;
  merchant?: string;
  subcategory?: string;
}

/**
 * 常用备注查询过滤条件
 */
export interface CommonNoteQueryFilter {
  search?: string;
  category_affinity?: string;
  merchant?: string;
  subcategory?: string;
  is_active?: boolean;
  minUsageCount?: number;
}

/**
 * 排序选项
 */
export interface CommonNoteSortOptions {
  field: 'usage_count' | 'last_used' | 'created_at';
  order: 'asc' | 'desc';
}

/**
 * 常用备注仓储接口
 */
export interface ICommonNoteRepository {
  /**
   * 根据 ID 查找备注
   */
  findById(id: string): Promise<CommonNote | null>;

  /**
   * 根据内容查找备注
   */
  findByContent(content: string): Promise<CommonNote | null>;

  /**
   * 根据条件查找备注列表
   */
  findMany(
    filter: CommonNoteQueryFilter,
    sort?: CommonNoteSortOptions,
    limit?: number
  ): Promise<CommonNote[]>;

  /**
   * 搜索备注（模糊匹配）
   */
  search(keyword: string, limit?: number): Promise<CommonNote[]>;

  /**
   * 创建备注
   */
  create(note: CreateCommonNoteDTO): Promise<CommonNote>;

  /**
   * 更新备注
   */
  update(id: string, note: UpdateCommonNoteDTO): Promise<CommonNote>;

  /**
   * 删除备注
   */
  delete(id: string): Promise<void>;

  /**
   * 增加使用次数
   */
  incrementUsageCount(id: string): Promise<void>;

  /**
   * 更新最后使用时间
   */
  updateLastUsed(id: string): Promise<void>;

  /**
   * 创建或更新备注（upsert）
   */
  upsert(content: string, amount?: number, category?: string): Promise<CommonNote>;

  /**
   * 获取最常用的备注
   */
  findMostUsed(limit: number): Promise<CommonNote[]>;

  /**
   * 检查备注是否存在
   */
  exists(content: string): Promise<boolean>;
}
