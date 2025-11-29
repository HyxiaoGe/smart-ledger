/**
 * 获取最新周报告 API 路由
 * GET - 获取最新的周报告
 */

import { NextResponse } from 'next/server';
import { getLatestWeeklyReport } from '@/lib/services/weeklyReportService.server';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';

export const runtime = 'nodejs';

// GET - 获取最新周报告
export const GET = withErrorHandler(async () => {
  const report = await getLatestWeeklyReport();
  return NextResponse.json({ data: report });
});
