/**
 * Prisma 查询条件工具
 * 封装常用的交易过滤条件，避免重复代码
 */

/**
 * 排除固定支出的查询条件
 * 用于预算计算、周报、统计等场景，只关注用户可控的日常消费
 *
 * 条件说明：
 * - recurring_expense_id: null - 不关联固定支出
 * - is_auto_generated: false 或 null - 非自动生成
 */
export const EXCLUDE_RECURRING_CONDITIONS = {
  recurring_expense_id: null,
  OR: [{ is_auto_generated: false }, { is_auto_generated: null }]
} as const;

/**
 * 只查询固定支出的条件
 * 用于固定支出统计场景
 */
export const ONLY_RECURRING_CONDITIONS = {
  OR: [{ recurring_expense_id: { not: null } }, { is_auto_generated: true }]
} as const;

/**
 * 获取排除固定支出的 Prisma where 条件
 * 可与其他条件合并使用
 */
export function getVariableExpenseFilter() {
  return { ...EXCLUDE_RECURRING_CONDITIONS };
}

/**
 * 获取只包含固定支出的 Prisma where 条件
 */
export function getFixedExpenseFilter() {
  return { ...ONLY_RECURRING_CONDITIONS };
}
