/**
 * 设置或更新预算 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentYearMonth, setBudget } from '@/lib/services/budgetService.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { year: currentYear, month: currentMonth } = getCurrentYearMonth();

    const year = Number(body.year ?? currentYear);
    const month = Number(body.month ?? currentMonth);
    const amount = Number(body.amount);
    const alertThreshold =
      body.alertThreshold !== undefined ? Number(body.alertThreshold) : undefined;
    const categoryKey = body.categoryKey ?? null;

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(amount)) {
      return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
    }

    const id = await setBudget({
      year,
      month,
      categoryKey,
      amount,
      alertThreshold
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('设置预算失败:', error);
    return NextResponse.json({ error: '设置预算失败' }, { status: 500 });
  }
}
