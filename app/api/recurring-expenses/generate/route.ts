import { NextRequest, NextResponse } from 'next/server';
import { recurringExpenseService } from '@/lib/services/recurringExpenses';

export async function POST(request: NextRequest) {
  try {
    const result = await recurringExpenseService.generatePendingExpenses();

    return NextResponse.json({
      success: result.errors.length === 0,
      generated: result.generated,
      errors: result.errors,
      message: `成功生成 ${result.generated} 笔固定支出记录${result.errors.length > 0 ? `，${result.errors.length} 个错误` : ''}`
    });
  } catch (error) {
    console.error('生成固定支出失败:', error);
    return NextResponse.json(
      { error: '生成固定支出失败' },
      { status: 500 }
    );
  }
}