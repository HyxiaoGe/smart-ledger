/**
 * 周报告 API 路由
 * GET - 获取所有周报告列表
 */

import { NextResponse } from 'next/server';
import { getAllWeeklyReports } from '@/lib/services/weeklyReportService.server';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';

export const runtime = 'nodejs';

// GET - 获取所有周报告列表
export const GET = withErrorHandler(async () => {
  const reports = await getAllWeeklyReports();
  return NextResponse.json({ data: reports });
});
