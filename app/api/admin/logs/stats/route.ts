/**
 * 日志统计 API
 * 提供日志的统计信息和趋势分析
 * 使用 Repository 模式，支持 Prisma/Supabase 切换
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSystemLogRepository } from '@/lib/infrastructure/repositories/index.server';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';

export const runtime = 'nodejs';

/**
 * GET - 获取日志统计信息
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const repository = getSystemLogRepository();

  // 获取基础统计数据
  const stats = await repository.getStats();

  // 最近 24 小时的日志
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recent24h = await repository.findMany(
    { startDate: oneDayAgo },
    { page: 1, pageSize: 1 }
  );

  // 最近 1 小时的日志
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recent1h = await repository.findMany(
    { startDate: oneHourAgo },
    { page: 1, pageSize: 1 }
  );

  // 获取 API 请求日志用于统计
  const apiLogs = await repository.findMany(
    {
      category: 'api_request',
      startDate: oneDayAgo,
    },
    { page: 1, pageSize: 1000 }
  );

  // 计算 API 请求的统计信息
  const apiStats = apiLogs.data.reduce(
    (acc, log) => {
      acc.total++;
      if (log.status_code !== undefined && log.status_code !== null) {
        if (log.status_code >= 200 && log.status_code < 300) {
          acc.success++;
        } else if (log.status_code >= 400 && log.status_code < 500) {
          acc.client_error++;
        } else if (log.status_code >= 500) {
          acc.server_error++;
        }
      }

      if (log.duration_ms !== undefined && log.duration_ms !== null) {
        acc.total_duration += log.duration_ms;
        acc.duration_count++;
      }

      return acc;
    },
    {
      total: 0,
      success: 0,
      client_error: 0,
      server_error: 0,
      total_duration: 0,
      duration_count: 0,
    }
  );

  const avgResponseTime = apiStats.duration_count > 0
    ? Math.round(apiStats.total_duration / apiStats.duration_count)
    : 0;

  // 转换 level stats 格式
  const levelStats = Object.entries(stats.byLevel).map(([level, count]) => ({
    level,
    count,
  }));

  // 转换 category stats 格式
  const categoryStats = Object.entries(stats.byCategory).map(([category, count]) => ({
    category,
    count,
  }));

  // 计算错误日志数量
  const errorCount = (stats.byLevel.error || 0) + (stats.byLevel.fatal || 0);

  return NextResponse.json({
    success: true,
    data: {
      overview: {
        total_logs: stats.total,
        error_logs: errorCount,
        recent_24h: recent24h.pagination.total,
        recent_1h: recent1h.pagination.total,
      },
      level_stats: levelStats,
      category_stats: categoryStats,
      api_stats: {
        total_requests: apiStats.total,
        success_requests: apiStats.success,
        client_errors: apiStats.client_error,
        server_errors: apiStats.server_error,
        success_rate: apiStats.total > 0 ? Math.round((apiStats.success / apiStats.total) * 100) : 0,
        avg_response_time: avgResponseTime,
      },
      recent_errors: stats.recentErrors,
    },
  });
});
