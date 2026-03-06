/**
 * 交易恢复 API 路由
 * 恢复已删除（软删除）的交易
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';
import { restoreTransaction } from '@/lib/services/transactions.server';
import { revalidateTransactions } from '@/lib/services/transaction/revalidation.server';

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
  const transaction = await restoreTransaction(id);

  revalidateTransactions();

  return NextResponse.json({
    success: true,
    data: transaction,
    message: '交易已恢复',
  });
});
