import { NextRequest, NextResponse } from 'next/server';
import { getBudgetOverview, getCurrentYearMonth } from '@/lib/services/budgetService.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const { year: currentYear, month: currentMonth } = getCurrentYearMonth();

    const year = parseInt(searchParams.get('year') || String(currentYear));
    const month = parseInt(searchParams.get('month') || String(currentMonth));
    const currency = searchParams.get('currency') || 'CNY';

    const overview = await getBudgetOverview(year, month, currency);
    return NextResponse.json(overview);
  } catch (error) {
    console.error('获取预算总览失败:', error);
    return NextResponse.json({ error: '获取预算总览失败' }, { status: 500 });
  }
}
