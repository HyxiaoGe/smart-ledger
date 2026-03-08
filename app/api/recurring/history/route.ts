/**
 * 固定账单生成历史 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { recurringExpenseService } from '@/lib/services/recurringExpenses.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');

    const history = await recurringExpenseService.getGenerationHistory(limit);

    return NextResponse.json(history);
  } catch (error) {
    console.error('获取生成历史失败:', error);
    return NextResponse.json(
      { error: '获取生成历史失败' },
      { status: 500 }
    );
  }
}
