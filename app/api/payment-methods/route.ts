/**
 * 支付方式 API 路由
 * GET - 获取支付方式列表
 * POST - 创建支付方式
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getPaymentMethodsWithStats,
  addPaymentMethod,
} from '@/lib/services/paymentMethodService.server';
import { z } from 'zod';
import { validateRequest } from '@/lib/utils/validation';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';

export const runtime = 'nodejs';

// POST 验证 schema
const createPaymentMethodSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['credit_card', 'debit_card', 'alipay', 'wechat', 'cash', 'other']),
  icon: z.string().optional(),
  color: z.string().optional(),
  last4Digits: z.string().max(4).optional(),
});

// GET - 获取支付方式列表
export const GET = withErrorHandler(async () => {
  const paymentMethods = await getPaymentMethodsWithStats();
  return NextResponse.json({ data: paymentMethods });
});

// POST - 创建支付方式
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  const validation = validateRequest(createPaymentMethodSchema, body);
  if (!validation.success) {
    return validation.response;
  }

  const id = await addPaymentMethod(validation.data);

  return NextResponse.json({ data: { id } }, { status: 201 });
});
