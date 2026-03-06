/**
 * 交易恢复 API 路由
 * 恢复已删除（软删除）的交易
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';
import { revalidateTag } from 'next/cache';
import { restoreTransaction } from '@/lib/services/transactions.server';

export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * POST - 恢复已删除的交易
 */
export const POST = withErrorHandler(async (
  request: NextRequest,
  { params }: RouteParams
) => {
  const { id } = await params;
  await restoreTransaction(id);

  // 刷新缓存
  revalidateTag('transactions');

  return NextResponse.json({
    success: true,
    message: '交易已恢复',
  });
});
