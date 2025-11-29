/**
 * 交易恢复 API 路由
 * 恢复已删除（软删除）的交易
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTransactionRepository } from '@/lib/infrastructure/repositories/index.server';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';
import { revalidateTag } from 'next/cache';
import { NotFoundError } from '@/lib/domain/errors/AppError';

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
  const repository = getTransactionRepository();

  // 检查交易是否存在（包括已删除的）
  const exists = await repository.exists(id);
  if (!exists) {
    throw new NotFoundError(`交易不存在: ${id}`);
  }

  // 恢复交易
  await repository.restore(id);

  // 刷新缓存
  revalidateTag('transactions');

  return NextResponse.json({
    success: true,
    message: '交易已恢复',
  });
});
