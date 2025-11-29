/**
 * 子分类 API 路由
 * GET - 获取子分类列表
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getSubcategories,
  getAllSubcategories,
} from '@/lib/services/categoryService.server';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';

export const runtime = 'nodejs';

// GET - 获取子分类列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const categoryKey = searchParams.get('category');

  if (categoryKey) {
    // 获取指定分类的子分类
    const subcategories = await getSubcategories(categoryKey);
    return NextResponse.json({ data: subcategories });
  } else {
    // 获取所有分类的子分类映射
    const allSubcategories = await getAllSubcategories();
    return NextResponse.json({ data: allSubcategories });
  }
});
