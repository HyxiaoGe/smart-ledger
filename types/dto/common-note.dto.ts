/**
 * 常用备注 DTO 类型定义
 * Data Transfer Objects for CommonNote domain
 */

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
