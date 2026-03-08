import { NextRequest, NextResponse } from 'next/server';
import { recurringExpenseService } from '@/lib/services/recurringExpenses.server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const limit = Number(req.nextUrl.searchParams.get('limit') || '20');
    const history = await recurringExpenseService.getGenerationHistory(limit);
    return NextResponse.json({ success: true, data: history });
  } catch (error) {
    console.error('获取固定支出生成历史失败:', error);
    return NextResponse.json({ error: '获取固定支出生成历史失败' }, { status: 500 });
  }
}
