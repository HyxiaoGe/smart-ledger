/**
 * 月报告详情 API
 * GET - 获取单个月报告
 * DELETE - 删除月报告
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getMonthlyReportById,
  deleteMonthlyReport,
} from '@/lib/services/monthlyReportService.server';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';
import { NotFoundError } from '@/lib/domain/errors/AppError';

/**
 * GET /api/monthly-reports/[id]
 * 获取单个月报告详情
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const { id } = await context.params;

  const report = await getMonthlyReportById(id);

  if (!report) {
    throw new NotFoundError(`月报告 ${id} 不存在`);
  }

  return NextResponse.json({
    success: true,
    data: report,
  });
});

/**
 * DELETE /api/monthly-reports/[id]
 * 删除月报告
 */
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const { id } = await context.params;

  const report = await getMonthlyReportById(id);

  if (!report) {
    throw new NotFoundError(`月报告 ${id} 不存在`);
  }

  await deleteMonthlyReport(id);

  return NextResponse.json({
    success: true,
    message: '月报告已删除',
  });
});
