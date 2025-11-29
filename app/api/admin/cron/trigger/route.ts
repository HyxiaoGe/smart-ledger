import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';
import { ValidationError } from '@/lib/domain/errors/AppError';
import { prisma } from '@/lib/clients/db/prisma';

// 任务名称到 SQL 函数的映射
const JOB_FUNCTION_MAP: Record<string, string> = {
  'generate-recurring-transactions': 'generate_recurring_transactions',
  'aggregate-ai-performance-stats': 'aggregate_ai_performance_stats',
  'cleanup-old-sessions': 'cleanup_old_sessions',
  'extract-daily-features': 'extract_ai_features_daily',
  'annotate-patterns': 'annotate_consumption_patterns',
  'export-training-snapshot': 'snapshot_training_data',
  'check-data-quality': 'check_data_quality',
  'refresh-budget-suggestions-daily': 'refresh_budget_suggestions',
  'generate-weekly-report': 'generate_weekly_report',
  'cleanup-old-logs': 'cleanup_old_logs',
};

/**
 * POST /api/admin/cron/trigger - 手动触发 Cron 任务
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { jobName } = body;

  if (!jobName) {
    throw new ValidationError('缺少任务名称');
  }

  const functionName = JOB_FUNCTION_MAP[jobName];

  if (!functionName) {
    throw new ValidationError(`未知的任务: ${jobName}`);
  }

  try {
    // 尝试调用数据库函数
    await prisma.$queryRawUnsafe(`SELECT ${functionName}()`);

    return NextResponse.json({
      success: true,
      message: `任务 ${jobName} 已触发`,
    });
  } catch (error: any) {
    // 如果函数不存在，返回友好提示
    if (error.message?.includes('does not exist')) {
      return NextResponse.json({
        success: false,
        error: `数据库函数 ${functionName} 不存在，请先创建对应的存储过程`,
      }, { status: 400 });
    }
    throw error;
  }
});
