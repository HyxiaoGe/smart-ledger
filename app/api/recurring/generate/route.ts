/**
 * 手动触发固定账单生成 API
 */

import { NextResponse } from 'next/server';
import {
  buildRecurringGenerationResponse,
  recurringExpenseService,
} from '@/lib/services/recurringExpenses.server';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const response = buildRecurringGenerationResponse(
      await recurringExpenseService.manualGenerateRecurring()
    );
    return NextResponse.json(response);
  } catch (error) {
    console.error('手动生成固定账单失败:', error);
    return NextResponse.json(
      { error: '手动生成固定账单失败' },
      { status: 500 }
    );
  }
}
