/**
 * 分类常用商家 API 路由
 * GET - 获取常用商家列表
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getFrequentMerchants,
  getAllFrequentMerchants,
} from '@/lib/services/categoryService.server';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';

export const runtime = 'nodejs';

// GET - 获取常用商家列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const categoryKey = searchParams.get('category');
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 10;

  if (categoryKey) {
    // 获取指定分类的常用商家
    const merchants = await getFrequentMerchants(categoryKey, limit);
    return NextResponse.json({ data: merchants });
  } else {
    // 获取所有分类的常用商家
    const allMerchants = await getAllFrequentMerchants(limit);
    return NextResponse.json({ data: allMerchants });
  }
});
