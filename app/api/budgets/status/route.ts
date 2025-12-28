/**
 * 获取月度预算执行状态 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMonthlyBudgetStatus, getCurrentYearMonth } from '@/lib/services/budgetService.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const { year: currentYear, month: currentMonth } = getCurrentYearMonth();

    const year = parseInt(searchParams.get('year') || String(currentYear));
    const month = parseInt(searchParams.get('month') || String(currentMonth));

    const statuses = await getMonthlyBudgetStatus(year, month);

    return NextResponse.json(statuses);
  } catch (error) {
    console.error('获取预算执行状态失败:', error);
    return NextResponse.json(
      { error: '获取预算执行状态失败' },
      { status: 500 }
    );
  }
}
