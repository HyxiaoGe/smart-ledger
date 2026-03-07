/**
 * 交易 API 路由
 * 提供交易的 CRUD 操作，使用 Repository 模式支持 Prisma/Supabase 切换
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTransactionRepository } from '@/lib/infrastructure/repositories/index.server';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';
import { z } from 'zod';
import { validateRequest, commonSchemas } from '@/lib/utils/validation';
import type { TransactionType, Currency } from '@/types/domain/transaction';
import { createTransaction } from '@/lib/services/transactions.server';
import { revalidateTransactionWrite } from '@/lib/services/transaction/revalidation.server';
import { formatDateToLocal } from '@/lib/utils/date';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getExclusiveEndDate(dateStr?: string) {
  if (!dateStr) return undefined;

  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return formatDateToLocal(date);
}

// POST 验证 schema - 创建交易
const createTransactionSchema = z.object({
  type: z.enum(['expense', 'income']).default('expense'),
  category: z.string().min(1, '类别不能为空'),
  amount: z.number().positive('金额必须大于0'),
  note: z.string().optional(),
  date: z.string().min(1, '日期不能为空'),
  currency: commonSchemas.currency.optional().default('CNY'),
  payment_method: z.string().nullable().optional(),
  merchant: z.string().nullable().optional(),
  subcategory: z.string().nullable().optional(),
  product: z.string().nullable().optional(),
});

// GET 查询参数 schema
const querySchema = z.object({
  type: z.enum(['expense', 'income']).optional(),
  category: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  currency: commonSchemas.currency.optional(),
  payment_method: z.string().optional(),
  merchant: z.string().optional(),
  min_amount: z.coerce.number().optional(),
  max_amount: z.coerce.number().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  page_size: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort_by: z.enum(['date', 'amount', 'created_at']).optional().default('date'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
  include_deleted: z.coerce.boolean().optional().default(false),
});

/**
 * GET - 查询交易列表
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);

  // 验证查询参数
  const params = querySchema.parse({
    type: searchParams.get('type') || undefined,
    category: searchParams.get('category') || undefined,
    start_date: searchParams.get('start_date') || undefined,
    end_date: searchParams.get('end_date') || undefined,
    currency: searchParams.get('currency') || undefined,
    payment_method: searchParams.get('payment_method') || undefined,
    merchant: searchParams.get('merchant') || undefined,
    min_amount: searchParams.get('min_amount') || undefined,
    max_amount: searchParams.get('max_amount') || undefined,
    page: searchParams.get('page') || undefined,
    page_size: searchParams.get('page_size') || undefined,
    sort_by: searchParams.get('sort_by') || undefined,
    sort_order: searchParams.get('sort_order') || undefined,
    include_deleted: searchParams.get('include_deleted') || undefined,
  });

  const repository = getTransactionRepository();

  const result = await repository.findMany(
    {
      type: params.type as TransactionType | undefined,
      category: params.category,
      startDate: params.start_date,
      endDate: getExclusiveEndDate(params.end_date),
      currency: params.currency as Currency | undefined,
      paymentMethod: params.payment_method,
      merchant: params.merchant,
      minAmount: params.min_amount,
      maxAmount: params.max_amount,
      includeDeleted: params.include_deleted,
    },
    {
      field: params.sort_by,
      order: params.sort_order,
    },
    {
      page: params.page,
      pageSize: params.page_size,
    }
  );

  return NextResponse.json({
    success: true,
    data: result.data,
    pagination: {
      page: result.page,
      page_size: result.pageSize,
      total: result.total,
      has_more: result.hasMore,
    },
  });
});

/**
 * POST - 创建交易
 * 替代 Supabase RPC 函数 upsert_transaction
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  // 验证输入
  const validation = validateRequest(createTransactionSchema, body);
  if (!validation.success) {
    return validation.response;
  }

  const data = validation.data;
  const transaction = await createTransaction({
    type: data.type as TransactionType,
    category: data.category,
    amount: data.amount,
    note: data.note,
    date: data.date,
    currency: data.currency as Currency,
    payment_method: data.payment_method || undefined,
    merchant: data.merchant || undefined,
    subcategory: data.subcategory || undefined,
    product: data.product || undefined,
  });

  revalidateTransactionWrite({ includeCommonNotes: true });

  return NextResponse.json({
    success: true,
    data: transaction,
  });
});
