/**
 * 生成周报告 API 路由
 * POST - 手动生成周报告
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateWeeklyReport } from '@/lib/services/weeklyReportService.server';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';

export const runtime = 'nodejs';

// POST - 生成周报告
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}));
  const weekStartDate = body.weekStartDate as string | undefined;

  const result = await generateWeeklyReport(weekStartDate);

  return NextResponse.json({ data: result }, { status: result.success ? 201 : 200 });
});
