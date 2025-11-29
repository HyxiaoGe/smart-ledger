/**
 * 分类详情 API 路由
 * PUT/PATCH - 更新分类
 * DELETE - 删除分类
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  updateCategory,
  deleteCategory,
} from '@/lib/services/categoryService.server';
import { z } from 'zod';
import { validateRequest } from '@/lib/utils/validation';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';

export const runtime = 'nodejs';

// PUT/PATCH 验证 schema
const updateCategorySchema = z.object({
  label: z.string().min(1).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().optional(),
});

// DELETE 验证 schema
const deleteCategorySchema = z.object({
  migrateToKey: z.string().optional(),
});

// PUT - 更新分类
export const PUT = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;
    const body = await request.json();

    // 验证输入
    const validation = validateRequest(updateCategorySchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const category = await updateCategory(id, validation.data);

    return NextResponse.json({ data: category });
  }
);

// PATCH - 部分更新分类（与 PUT 相同）
export const PATCH = PUT;

// DELETE - 删除分类
export const DELETE = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;

    // 尝试解析请求体（可能为空）
    let body = {};
    try {
      body = await request.json();
    } catch {
      // 如果没有请求体，使用空对象
    }

    // 验证输入
    const validation = validateRequest(deleteCategorySchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const result = await deleteCategory(id, validation.data.migrateToKey);

    return NextResponse.json({ data: result });
  }
);
