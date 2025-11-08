import { NextRequest, NextResponse } from 'next/server';
import { recurringExpenseService } from '@/lib/services/recurringExpenses';
import { z } from 'zod';
import { validateRequest, commonSchemas } from '@/lib/utils/validation';

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
  note: z.string().optional(),
  currency: commonSchemas.currency.optional().default('CNY'),
  payment_method: z.string().optional(),
  is_active: z.boolean().optional().default(true)
});

export async function GET(request: NextRequest) {
  try {
    const expenses = await recurringExpenseService.getRecurringExpenses();
    return NextResponse.json(expenses);
  } catch (error) {
    console.error('获取固定支出列表失败:', error);
    return NextResponse.json(
      { error: '获取固定支出列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证输入
    const validation = validateRequest(createRecurringExpenseSchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const expense = await recurringExpenseService.createRecurringExpense(validation.data);
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('创建固定支出失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建固定支出失败' },
      { status: 500 }
    );
  }
}