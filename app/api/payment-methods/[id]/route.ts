/**
 * 支付方式详情 API 路由
 * GET - 获取支付方式使用详情
 * PUT - 更新支付方式
 * DELETE - 删除支付方式
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getPaymentMethodUsageDetail,
  updatePaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
} from '@/lib/services/paymentMethodService.server';
import { z } from 'zod';
import { validateRequest } from '@/lib/utils/validation';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';

export const runtime = 'nodejs';

// PUT 验证 schema
const updatePaymentMethodSchema = z.object({
  name: z.string().min(1).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  last4Digits: z.string().max(4).optional(),
  setDefault: z.boolean().optional(),
});

// DELETE 验证 schema
const deletePaymentMethodSchema = z.object({
  migrateToId: z.string().uuid().optional(),
});

// GET - 获取使用详情
export const GET = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;
    const detail = await getPaymentMethodUsageDetail(id);
    return NextResponse.json({ data: detail });
  }
);

// PUT - 更新支付方式
export const PUT = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;
    const body = await request.json();

    const validation = validateRequest(updatePaymentMethodSchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const { setDefault, ...updateData } = validation.data;

    // 如果需要设置为默认
    if (setDefault) {
      await setDefaultPaymentMethod(id);
    }

    // 如果有其他更新数据
    if (updateData.name) {
      await updatePaymentMethod({
        id,
        name: updateData.name,
        icon: updateData.icon,
        color: updateData.color,
        last4Digits: updateData.last4Digits,
      });
    }

    return NextResponse.json({ success: true });
  }
);

// DELETE - 删除支付方式
export const DELETE = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;

    let body = {};
    try {
      body = await request.json();
    } catch {
      // 无请求体
    }

    const validation = validateRequest(deletePaymentMethodSchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const result = await deletePaymentMethod(id, validation.data.migrateToId);

    return NextResponse.json({ data: result });
  }
);
