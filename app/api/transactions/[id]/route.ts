/**
 * 交易详情 API 路由
 * 提供单个交易的查询、更新和删除操作
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTransactionRepository } from '@/lib/infrastructure/repositories/index.server';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';
import { z } from 'zod';
import { validateRequest, commonSchemas } from '@/lib/utils/validation';
import { revalidateTag } from 'next/cache';
import { NotFoundError } from '@/lib/domain/errors/AppError';
import type { TransactionType, Currency } from '@/types/domain/transaction';

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
  const repository = getTransactionRepository();

  const transaction = await repository.findById(id);

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
  const repository = getTransactionRepository();

  // 检查交易是否存在
  const exists = await repository.exists(id);
  if (!exists) {
    throw new NotFoundError(`交易不存在: ${id}`);
  }

  // 更新交易
  const transaction = await repository.update(id, {
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

  // 刷新缓存
  revalidateTag('transactions');

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
  const repository = getTransactionRepository();

  // 检查交易是否存在
  const exists = await repository.exists(id);
  if (!exists) {
    throw new NotFoundError(`交易不存在: ${id}`);
  }

  // 软删除交易
  await repository.softDelete(id);

  // 刷新缓存
  revalidateTag('transactions');

  return NextResponse.json({
    success: true,
    message: '交易已删除',
  });
});
