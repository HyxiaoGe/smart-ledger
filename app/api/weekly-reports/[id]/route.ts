/**
 * 单个周报告 API 路由
 * GET - 根据 ID 获取周报告详情
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWeeklyReportById } from '@/lib/services/weeklyReportService.server';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';

export const runtime = 'nodejs';

// GET - 获取单个周报告
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const report = await getWeeklyReportById(params.id);

  if (!report) {
    return NextResponse.json(
      { error: '报告不存在' },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: report });
});
