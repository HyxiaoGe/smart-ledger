/**
 * 分类排序 API 路由
 * PUT - 批量更新分类排序
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateCategorySortOrder } from '@/lib/services/categoryService.server';
import { z } from 'zod';
import { validateRequest } from '@/lib/utils/validation';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';

export const runtime = 'nodejs';

// PUT 验证 schema
const updateSortOrderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sort_order: z.number().int().min(0),
    })
  ),
});

// PUT - 批量更新排序
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  // 验证输入
  const validation = validateRequest(updateSortOrderSchema, body);
  if (!validation.success) {
    return validation.response;
  }

  await updateCategorySortOrder(validation.data.items);

  return NextResponse.json({ success: true });
});
