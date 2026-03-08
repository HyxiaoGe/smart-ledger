import { NextResponse } from 'next/server';
import {
  buildRecurringGenerationResponse,
  recurringExpenseService,
} from '@/lib/services/recurringExpenses.server';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';
import { logger } from '@/lib/services/logging';

export const POST = withErrorHandler(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const includeOverdue = searchParams.get('includeOverdue') === '1';
  const result = buildRecurringGenerationResponse(
    await recurringExpenseService.manualGenerateRecurring({
      includeOverdue,
    })
  );

  // ✅ 记录用户操作日志（异步，不阻塞响应）
  void logger.logUserAction({
    action: 'recurring_expenses_generated',
    metadata: {
      generated_count: result.summary.success,
      error_count: result.summary.failed,
      skipped_count: result.summary.skipped,
      has_errors: result.summary.failed > 0,
      include_overdue: includeOverdue,
    },
  });

  return NextResponse.json(result);
});
