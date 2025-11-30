/**
 * 月报告 API
 * GET - 获取月报告列表
 * POST - 生成月报告
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getAllMonthlyReports,
  getMonthlyReportByYearMonth,
  getMonthlyReportsByYear,
  generateMonthlyReport,
} from '@/lib/services/monthlyReportService.server';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';

// GET 查询参数验证
const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

// POST 请求体验证
const generateSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

/**
 * GET /api/monthly-reports
 * 获取月报告列表
 *
 * Query params:
 * - year: 年份（可选，指定后返回该年所有月报告）
 * - month: 月份（可选，配合 year 返回特定月报告）
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);

  const params = querySchema.parse({
    year: searchParams.get('year') || undefined,
    month: searchParams.get('month') || undefined,
  });

  // 指定年月，返回单个报告
  if (params.year && params.month) {
    const report = await getMonthlyReportByYearMonth(params.year, params.month);
    return NextResponse.json({
      success: true,
      data: report,
    });
  }

  // 指定年份，返回该年所有报告
  if (params.year) {
    const reports = await getMonthlyReportsByYear(params.year);
    return NextResponse.json({
      success: true,
      data: reports,
    });
  }

  // 返回所有报告
  const reports = await getAllMonthlyReports();
  return NextResponse.json({
    success: true,
    data: reports,
  });
});

/**
 * POST /api/monthly-reports
 * 生成月报告
 *
 * Body:
 * - year: 年份
 * - month: 月份
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { year, month } = generateSchema.parse(body);

  const result = await generateMonthlyReport(year, month);

  return NextResponse.json({
    success: result.success,
    message: result.message,
    data: result.report,
  });
});
