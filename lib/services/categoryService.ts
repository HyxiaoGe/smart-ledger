import { supabase } from '@/lib/clients/supabase/client';

/**
 * 类别定义
 */
export interface Category {
  id: string;
  key: string;
  label: string;
  icon: string | null;
  color: string | null;
  type: 'income' | 'expense' | 'both';
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
  usage_count?: number;
  last_used?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 类别使用详情
 */
export interface CategoryUsageDetail {
  total_transactions: number;
  total_amount: number;
  avg_amount: number;
  first_used: string | null;
  last_used: string | null;
  this_month_count: number;
  this_month_amount: number;
}

/**
 * 删除类别结果
 */
export interface DeleteCategoryResult {
  success: boolean;
  message: string;
  affected_transactions: number;
}

/**
 * 获取所有类别（包含使用统计）
 */
export async function getCategoriesWithStats(): Promise<Category[]> {
  const { data, error } = await supabase.rpc('get_categories_with_stats');

  if (error) {
    console.error('获取类别列表失败:', error);
    throw error;
  }

  return data || [];
}

/**
 * 添加自定义类别
 */
export async function addCustomCategory(params: {
  key: string;
  label: string;
  icon?: string;
  color?: string;
  type?: 'income' | 'expense' | 'both';
}): Promise<string> {
  const { data, error } = await supabase.rpc('add_custom_category', {
    p_key: params.key,
    p_label: params.label,
    p_icon: params.icon || '📁',
    p_color: params.color || '#6B7280',
    p_type: params.type || 'expense',
  });

  if (error) {
    console.error('添加类别失败:', error);
    throw error;
  }

  return data;
}

/**
 * 更新类别
 */
export async function updateCategory(params: {
  id: string;
  label?: string;
  icon?: string;
  color?: string;
  is_active?: boolean;
  sort_order?: number;
}): Promise<boolean> {
  const { data, error } = await supabase.rpc('update_category', {
    p_id: params.id,
    p_label: params.label || null,
    p_icon: params.icon || null,
    p_color: params.color || null,
    p_is_active: params.is_active !== undefined ? params.is_active : null,
    p_sort_order: params.sort_order !== undefined ? params.sort_order : null,
  });

  if (error) {
    console.error('更新类别失败:', error);
    throw error;
  }

  return data;
}

/**
 * 删除类别
 */
export async function deleteCategory(params: {
  id: string;
  migrateToKey?: string;
}): Promise<DeleteCategoryResult> {
  const { data, error } = await supabase.rpc('delete_category', {
    p_id: params.id,
    p_migrate_to_key: params.migrateToKey || null,
  });

  if (error) {
    console.error('删除类别失败:', error);
    throw error;
  }

  return data[0];
}

/**
 * 获取类别使用详情
 */
export async function getCategoryUsageDetail(
  key: string
): Promise<CategoryUsageDetail> {
  const { data, error } = await supabase.rpc('get_category_usage_detail', {
    p_key: key,
  });

  if (error) {
    console.error('获取类别使用详情失败:', error);
    throw error;
  }

  return data[0];
}

/**
 * 常用 Emoji 图标列表
 */
export const EMOJI_ICONS = [
  // 食物饮料
  '🍜', '🍕', '🍔', '🍟', '🌮', '🍱', '🍝', '🥗', '🍖', '🍗',
  '🥤', '☕', '🍵', '🧃', '🥛', '🍺', '🍷', '🍹', '🧋',
  // 交通
  '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
  '🚛', '🚚', '🚜', '🛴', '🚲', '🛵', '🏍️', '✈️', '🚁', '⛵',
  '🚂', '🚆', '🚇', '🚈', '🚝', '🚄', '🚅', '🚞',
  // 娱乐
  '🎮', '🎯', '🎲', '🎰', '🎳', '🎪', '🎭', '🎨', '🎬', '🎤',
  '🎧', '🎼', '🎹', '🎸', '🥁', '🎺', '🎷', '📻', '📺', '📷',
  // 生活
  '🏠', '🏡', '🏢', '🏬', '🏪', '🏥', '🏦', '💡', '🔌', '🔋',
  '🛏️', '🛋️', '🚪', '🪟', '🚿', '🛁', '🚽', '🧹', '🧺', '🧼',
  // 购物
  '🛒', '🛍️', '💳', '💰', '💵', '💴', '💶', '💷', '💸', '💎',
  '👔', '👕', '👖', '👗', '👘', '👚', '👙', '👠', '👡', '👢',
  // 健康
  '💊', '💉', '🩺', '🩹', '🩼', '⚕️', '🏥', '🧘', '🏋️', '🚴',
  // 工作学习
  '💼', '📝', '📚', '📖', '📕', '📗', '📘', '📙', '📓', '📔',
  '✏️', '✒️', '🖊️', '🖋️', '🖍️', '📌', '📍', '📎', '📏', '📐',
  // 其他
  '📦', '📫', '📪', '📬', '📭', '📮', '📁', '🗂️', '🗃️', '🗄️',
  '🎁', '🎈', '🎊', '🎉', '🎀', '🪅', '🎐', '🧧', '💌', '❤️',
];

/**
 * 预设颜色列表
 */
export const PRESET_COLORS = [
  '#F97316', // 橙色
  '#22C55E', // 绿色
  '#06B6D4', // 青色
  '#A855F7', // 紫色
  '#3B82F6', // 蓝色
  '#0EA5E9', // 天蓝
  '#F59E0B', // 黄色
  '#EF4444', // 红色
  '#6B7280', // 灰色
  '#EC4899', // 粉色
  '#8B5CF6', // 靛紫
  '#10B981', // 翠绿
  '#F472B6', // 玫红
  '#14B8A6', // 蓝绿
  '#F97316', // 橘红
  '#6366F1', // 靛蓝
];

/**
 * 生成类别键（从 label 转换）
 */
export function generateCategoryKey(label: string): string {
  // 移除特殊字符，转为拼音或英文
  // 简化版本：使用时间戳 + 随机数
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 5);
  return `custom_${timestamp}_${random}`;
}
