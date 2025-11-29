import { NextRequest, NextResponse } from 'next/server';
import { recurringExpenseService } from '@/lib/services/recurringExpenses.server';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';
import { logger } from '@/lib/services/logging';

export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const expense = await recurringExpenseService.getRecurringExpenseById(params.id);
  return NextResponse.json(expense);
});

export const PUT = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const body = await request.json();
  const expense = await recurringExpenseService.updateRecurringExpense(params.id, body);

  // ✅ 记录用户操作日志（异步，不阻塞响应）
  void logger.logUserAction({
    action: 'recurring_expense_updated',
    metadata: {
      expense_id: params.id,
      updated_fields: Object.keys(body),
    },
  });

  return NextResponse.json(expense);
});

export const DELETE = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  await recurringExpenseService.deleteRecurringExpense(params.id);

  // ✅ 记录用户操作日志（异步，不阻塞响应）
  void logger.logUserAction({
    action: 'recurring_expense_deleted',
    metadata: {
      expense_id: params.id,
    },
  });

  return NextResponse.json({ success: true });
});