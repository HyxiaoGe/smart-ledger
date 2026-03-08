import { NextResponse } from 'next/server';
import { recurringExpenseService } from '@/lib/services/recurringExpenses.server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const stats = await recurringExpenseService.getTodayGenerationStats();
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('获取固定支出生成统计失败:', error);
    return NextResponse.json({ error: '获取固定支出生成统计失败' }, { status: 500 });
  }
}
