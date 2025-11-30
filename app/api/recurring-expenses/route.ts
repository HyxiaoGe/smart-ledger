import { NextRequest, NextResponse } from 'next/server';
import { recurringExpenseService } from '@/lib/services/recurringExpenses.server';
import { z } from 'zod';
import { validateRequest, commonSchemas } from '@/lib/utils/validation';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';
import { logger } from '@/lib/services/logging';

// POST 验证 schema
const createRecurringExpenseSchema = z.object({
  name: commonSchemas.nonEmptyString,
  amount: commonSchemas.amount,
  category: commonSchemas.nonEmptyString,
  frequency: z.enum(['daily', 'weekly', 'monthly'], {
    message: 'Frequency must be daily, weekly, or monthly'
  }),
  frequency_config: z.record(z.string(), z.any()),
  start_date: commonSchemas.date,
  end_date: z.string().nullable().optional().default(null),
  note: z.string().optional(),
  currency: commonSchemas.currency.optional().default('CNY'),
  payment_method: z.string().optional(),
  is_active: z.boolean().optional().default(true)
});

export const GET = withErrorHandler(async () => {
  const expenses = await recurringExpenseService.getRecurringExpenses();
  return NextResponse.json(expenses);
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  // 验证输入
  const validation = validateRequest(createRecurringExpenseSchema, body);
  if (!validation.success) {
    return validation.response;
  }

  const expense = await recurringExpenseService.createRecurringExpense(validation.data);

  // ✅ 记录用户操作日志（异步，不阻塞响应）
  void logger.logUserAction({
    action: 'recurring_expense_created',
    metadata: {
      expense_id: expense.id,
      name: validation.data.name,
      amount: validation.data.amount,
      category: validation.data.category,
      frequency: validation.data.frequency,
      currency: validation.data.currency,
    },
  });

  return NextResponse.json(expense, { status: 201 });
});