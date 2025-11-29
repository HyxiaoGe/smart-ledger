/**
 * 预算建议 API
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getBudgetSuggestions,
  refreshBudgetSuggestions,
  getCurrentYearMonth
} from '@/lib/services/budgetService.server';

export const runtime = 'nodejs';

/**
 * 获取预算建议
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const { year: currentYear, month: currentMonth } = getCurrentYearMonth();

    const year = parseInt(searchParams.get('year') || String(currentYear));
    const month = parseInt(searchParams.get('month') || String(currentMonth));

    const suggestions = await getBudgetSuggestions(year, month);

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('获取预算建议失败:', error);
    return NextResponse.json(
      { error: '获取预算建议失败' },
      { status: 500 }
    );
  }
}

/**
 * 刷新预算建议
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { year: currentYear, month: currentMonth } = getCurrentYearMonth();

    const year = body.year || currentYear;
    const month = body.month || currentMonth;

    const count = await refreshBudgetSuggestions(year, month);

    return NextResponse.json({
      success: true,
      message: `已刷新 ${count} 个分类的预算建议`,
      count
    });
  } catch (error) {
    console.error('刷新预算建议失败:', error);
    return NextResponse.json(
      { error: '刷新预算建议失败' },
      { status: 500 }
    );
  }
}
