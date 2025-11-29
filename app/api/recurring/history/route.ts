/**
 * 固定账单生成历史 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGenerationHistory } from '@/lib/services/recurringService.server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');

    const history = await getGenerationHistory(limit);

    return NextResponse.json(history);
  } catch (error) {
    console.error('获取生成历史失败:', error);
    return NextResponse.json(
      { error: '获取生成历史失败' },
      { status: 500 }
    );
  }
}
