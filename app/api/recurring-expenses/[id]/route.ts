import { NextRequest, NextResponse } from 'next/server';
import { recurringExpenseService } from '@/lib/services/recurringExpenses';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const expense = await recurringExpenseService.getRecurringExpenseById(params.id);
    return NextResponse.json(expense);
  } catch (error) {
    console.error('获取固定支出详情失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取固定支出详情失败' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const expense = await recurringExpenseService.updateRecurringExpense(params.id, body);
    return NextResponse.json(expense);
  } catch (error) {
    console.error('更新固定支出失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新固定支出失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await recurringExpenseService.deleteRecurringExpense(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除固定支出失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除固定支出失败' },
      { status: 500 }
    );
  }
}