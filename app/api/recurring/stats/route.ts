/**
 * 今日固定账单生成统计 API
 */

import { NextResponse } from 'next/server';
import { recurringExpenseService } from '@/lib/services/recurringExpenses.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await recurringExpenseService.getTodayGenerationStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('获取今日统计失败:', error);
    return NextResponse.json(
      { error: '获取今日统计失败' },
      { status: 500 }
    );
  }
}
