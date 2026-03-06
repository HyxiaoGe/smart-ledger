/**
 * 交易详情 API 路由
 * 提供单个交易的查询、更新和删除操作
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';
import { z } from 'zod';
import { validateRequest, commonSchemas } from '@/lib/utils/validation';
import { NotFoundError } from '@/lib/domain/errors/AppError';
import type { TransactionType, Currency } from '@/types/domain/transaction';
import {
  deleteTransaction,
  getTransactionById,
  updateTransaction,
} from '@/lib/services/transactions.server';
import { revalidateTransactions } from '@/lib/services/transaction/revalidation.server';

export const runtime = 'nodejs';

// PUT/PATCH 验证 schema - 更新交易
const updateTransactionSchema = z.object({
  type: z.enum(['expense', 'income']).optional(),
  category: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  note: z.string().optional(),
  date: z.string().optional(),
  currency: commonSchemas.currency.optional(),
  payment_method: z.string().nullable().optional(),
  merchant: z.string().nullable().optional(),
  subcategory: z.string().nullable().optional(),
  product: z.string().nullable().optional(),
});

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET - 获取单个交易详情
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: RouteParams
) => {
  const { id } = await params;
  const transaction = await getTransactionById(id);

  if (!transaction) {
    throw new NotFoundError(`交易不存在: ${id}`);
  }

  return NextResponse.json({
    success: true,
    data: transaction,
  });
});

/**
 * PUT - 更新交易
 */
export const PUT = withErrorHandler(async (
  request: NextRequest,
  { params }: RouteParams
) => {
  const { id } = await params;
  const body = await request.json();

  // 验证输入
  const validation = validateRequest(updateTransactionSchema, body);
  if (!validation.success) {
    return validation.response;
  }

  const data = validation.data;
  const transaction = await updateTransaction(id, {
    type: data.type as TransactionType | undefined,
    category: data.category,
    amount: data.amount,
    note: data.note,
    date: data.date,
    currency: data.currency as Currency | undefined,
    payment_method: data.payment_method ?? undefined,
    merchant: data.merchant ?? undefined,
    subcategory: data.subcategory ?? undefined,
    product: data.product ?? undefined,
  });

  revalidateTransactions();

  return NextResponse.json({
    success: true,
    data: transaction,
  });
});

/**
 * PATCH - 部分更新交易 (同 PUT)
 */
export const PATCH = PUT;

/**
 * DELETE - 删除交易 (软删除)
 */
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  { params }: RouteParams
) => {
  const { id } = await params;
  await deleteTransaction(id);

  revalidateTransactions();

  return NextResponse.json({
    success: true,
    message: '交易已删除',
  });
});
