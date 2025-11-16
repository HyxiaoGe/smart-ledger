/**
 * 日志统计 API
 * 提供日志的统计信息和趋势分析
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/clients/supabase/server';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';

export const runtime = 'nodejs';

/**
 * GET - 获取日志统计信息
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const supabase = supabaseServerClient;

  // 按级别统计
  const { data: levelStats, error: levelError } = await supabase
    .rpc('get_log_level_stats');

  let processedLevelStats: Array<{ level: string; count: number }> = [];

  if (levelError && levelError.code !== 'PGRST116') { // 忽略函数不存在的错误
    // 如果 RPC 函数不存在，使用原始查询
    const { data: fallbackLevelStats } = await supabase
      .from('system_logs')
      .select('level');

    const levelCounts = (fallbackLevelStats || []).reduce((acc: Record<string, number>, log: any) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {});

    processedLevelStats = Object.entries(levelCounts).map(([level, count]) => ({ level, count: count as number }));
  } else {
    processedLevelStats = levelStats || [];
  }

  // 按类别统计
  const { data: categoryStats, error: categoryError } = await supabase
    .rpc('get_log_category_stats');

  let processedCategoryStats: Array<{ category: string; count: number }> = [];

  if (categoryError && categoryError.code !== 'PGRST116') {
    const { data: fallbackCategoryStats } = await supabase
      .from('system_logs')
      .select('category');

    const categoryCounts = (fallbackCategoryStats || []).reduce((acc: Record<string, number>, log: any) => {
      acc[log.category] = (acc[log.category] || 0) + 1;
      return acc;
    }, {});

    processedCategoryStats = Object.entries(categoryCounts).map(([category, count]) => ({ category, count: count as number }));
  } else {
    processedCategoryStats = categoryStats || [];
  }

  // 最近 24 小时内的日志数量
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recent24hCount } = await supabase
    .from('system_logs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', oneDayAgo);

  // 最近 1 小时内的日志数量
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recent1hCount } = await supabase
    .from('system_logs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', oneHourAgo);

  // 总日志数量
  const { count: totalCount } = await supabase
    .from('system_logs')
    .select('*', { count: 'exact', head: true });

  // 错误日志数量（error 和 fatal 级别）
  const { count: errorCount } = await supabase
    .from('system_logs')
    .select('*', { count: 'exact', head: true })
    .in('level', ['error', 'fatal']);

  // 最近的错误日志（最多 5 条）
  const { data: recentErrors } = await supabase
    .from('system_logs')
    .select('*')
    .in('level', ['error', 'fatal'])
    .order('created_at', { ascending: false })
    .limit(5);

  // API 请求统计（最近 24 小时）
  const { data: apiRequestStats } = await supabase
    .from('system_logs')
    .select('status_code, duration_ms')
    .eq('category', 'api_request')
    .gte('created_at', oneDayAgo)
    .not('status_code', 'is', null);

  // 计算 API 请求的统计信息
  const apiStats = (apiRequestStats || []).reduce(
    (acc, log) => {
      acc.total++;
      if (log.status_code >= 200 && log.status_code < 300) {
        acc.success++;
      } else if (log.status_code >= 400 && log.status_code < 500) {
        acc.client_error++;
      } else if (log.status_code >= 500) {
        acc.server_error++;
      }

      if (log.duration_ms !== null) {
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

  return NextResponse.json({
    success: true,
    data: {
      overview: {
        total_logs: totalCount || 0,
        error_logs: errorCount || 0,
        recent_24h: recent24hCount || 0,
        recent_1h: recent1hCount || 0,
      },
      level_stats: processedLevelStats,
      category_stats: processedCategoryStats,
      api_stats: {
        total_requests: apiStats.total,
        success_requests: apiStats.success,
        client_errors: apiStats.client_error,
        server_errors: apiStats.server_error,
        success_rate: apiStats.total > 0 ? Math.round((apiStats.success / apiStats.total) * 100) : 0,
        avg_response_time: avgResponseTime,
      },
      recent_errors: recentErrors || [],
    },
  });
});
