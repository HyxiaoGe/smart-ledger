import { NextRequest, NextResponse } from 'next/server';
import { recurringExpenseService } from '@/lib/services/recurringExpenses';

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

    // 验证必填字段
    const requiredFields = ['name', 'amount', 'category', 'frequency', 'frequency_config', 'start_date'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `缺少必填字段: ${field}` },
          { status: 400 }
        );
      }
    }

    // 验证金额
    if (body.amount <= 0) {
      return NextResponse.json(
        { error: '金额必须大于0' },
        { status: 400 }
      );
    }

    // 验证频率
    const validFrequencies = ['daily', 'weekly', 'monthly'];
    if (!validFrequencies.includes(body.frequency)) {
      return NextResponse.json(
        { error: '无效的频率设置' },
        { status: 400 }
      );
    }

    const expense = await recurringExpenseService.createRecurringExpense(body);
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('创建固定支出失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建固定支出失败' },
      { status: 500 }
    );
  }
}