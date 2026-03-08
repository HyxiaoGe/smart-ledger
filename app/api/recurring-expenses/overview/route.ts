import { NextRequest, NextResponse } from 'next/server';
import { recurringExpenseService } from '@/lib/services/recurringExpenses.server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const limit = Number(req.nextUrl.searchParams.get('limit') || '20');
    const overview = await recurringExpenseService.getManagementOverview(limit);
    return NextResponse.json({ success: true, data: overview });
  } catch (error) {
    console.error('获取固定支出管理总览失败:', error);
    return NextResponse.json({ error: '获取固定支出管理总览失败' }, { status: 500 });
  }
}
