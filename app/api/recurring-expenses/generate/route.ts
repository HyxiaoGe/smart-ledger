import { NextRequest, NextResponse } from 'next/server';
import { recurringExpenseService } from '@/lib/services/recurringExpenses.server';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';
import { logger } from '@/lib/services/logging';

export const POST = withErrorHandler(async (_request: NextRequest) => {
  const result = await recurringExpenseService.generatePendingExpenses();

  // ✅ 记录用户操作日志（异步，不阻塞响应）
  void logger.logUserAction({
    action: 'recurring_expenses_generated',
    metadata: {
      generated_count: result.generated,
      error_count: result.errors.length,
      has_errors: result.errors.length > 0,
    },
  });

  return NextResponse.json({
    success: result.errors.length === 0,
    generated: result.generated,
    errors: result.errors,
    message: `成功生成 ${result.generated} 笔固定支出记录${result.errors.length > 0 ? `，${result.errors.length} 个错误` : ''}`
  });
});