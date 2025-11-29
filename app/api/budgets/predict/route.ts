/**
 * 预测月底支出 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { predictMonthEndSpending, getCurrentYearMonth } from '@/lib/services/budgetService.server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { year: currentYear, month: currentMonth } = getCurrentYearMonth();

    const {
      categoryKey,
      year = currentYear,
      month = currentMonth,
      budgetAmount,
      currency = 'CNY'
    } = body;

    if (!categoryKey || budgetAmount === undefined) {
      return NextResponse.json(
        { error: '缺少必要参数: categoryKey, budgetAmount' },
        { status: 400 }
      );
    }

    const prediction = await predictMonthEndSpending(
      categoryKey,
      year,
      month,
      budgetAmount,
      currency
    );

    if (!prediction) {
      return NextResponse.json(
        { error: '无法预测支出' },
        { status: 404 }
      );
    }

    return NextResponse.json(prediction);
  } catch (error) {
    console.error('预测月底支出失败:', error);
    return NextResponse.json(
      { error: '预测月底支出失败' },
      { status: 500 }
    );
  }
}
