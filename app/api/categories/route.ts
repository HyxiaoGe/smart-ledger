/**
 * 分类管理 API 路由
 * GET - 获取分类列表
 * POST - 创建新分类
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getCategoriesWithStats,
  addCustomCategory,
} from '@/lib/services/categoryService.server';
import { z } from 'zod';
import { validateRequest, commonSchemas } from '@/lib/utils/validation';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';

export const runtime = 'nodejs';

// POST 验证 schema
const createCategorySchema = z.object({
  key: commonSchemas.nonEmptyString,
  label: commonSchemas.nonEmptyString,
  icon: z.string().optional().default('📁'),
  color: z.string().optional().default('#6B7280'),
  type: z.enum(['expense', 'income', 'both']).optional().default('expense'),
});

// GET - 获取分类列表（含统计）
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);

  // 构建过滤条件
  const filter: any = {};

  const type = searchParams.get('type');
  if (type) filter.type = type;

  const isActive = searchParams.get('is_active');
  if (isActive !== null) filter.is_active = isActive === 'true';

  const isSystem = searchParams.get('is_system');
  if (isSystem !== null) filter.is_system = isSystem === 'true';

  const categories = await getCategoriesWithStats(filter);

  return NextResponse.json({ data: categories });
});

// POST - 创建新分类
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  // 验证输入
  const validation = validateRequest(createCategorySchema, body);
  if (!validation.success) {
    return validation.response;
  }

  const category = await addCustomCategory(validation.data);

  return NextResponse.json({ data: category }, { status: 201 });
});
