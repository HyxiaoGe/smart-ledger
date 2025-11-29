/**
 * AI 反馈 API 路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { AIFeedbackService } from '@/lib/services/ai/AIFeedbackService.server';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';

export const runtime = 'nodejs';

const aiFeedbackService = AIFeedbackService.getInstance();

// POST /api/ai-feedback - 提交反馈
export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json();
  const { featureType, feedbackType, data } = body;

  if (!featureType) {
    return NextResponse.json({ error: '缺少 featureType 参数' }, { status: 400 });
  }

  const feedbackId = await aiFeedbackService.collectFeedback(
    featureType,
    feedbackType || 'composite',
    data || {}
  );

  return NextResponse.json({ success: true, feedbackId });
});

// GET /api/ai-feedback/stats - 获取统计数据
export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const featureType = searchParams.get('featureType') as any;
  const period = searchParams.get('period') as any || '7d';

  const stats = await aiFeedbackService.getFeedbackStats(featureType, period);

  return NextResponse.json({ data: stats });
});
