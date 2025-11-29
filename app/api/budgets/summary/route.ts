/**
 * 获取总预算汇总 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTotalBudgetSummary, getCurrentYearMonth } from '@/lib/services/budgetService.server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const { year: currentYear, month: currentMonth } = getCurrentYearMonth();

    const year = parseInt(searchParams.get('year') || String(currentYear));
    const month = parseInt(searchParams.get('month') || String(currentMonth));
    const currency = searchParams.get('currency') || 'CNY';

    const summary = await getTotalBudgetSummary(year, month, currency);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('获取总预算汇总失败:', error);
    return NextResponse.json(
      { error: '获取总预算汇总失败' },
      { status: 500 }
    );
  }
}
