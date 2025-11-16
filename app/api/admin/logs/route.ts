/**
 * 日志查询 API
 * 提供日志的查询、过滤和分页功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/clients/supabase/server';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';
import { z } from 'zod';
import { LogLevel, LogCategory } from '@/lib/services/logging/types';

export const runtime = 'nodejs';

// 查询参数验证 schema
const querySchema = z.object({
  // 分页参数
  page: z.coerce.number().int().min(1).optional().default(1),
  page_size: z.coerce.number().int().min(1).max(100).optional().default(20),

  // 过滤参数
  level: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).optional(),
  category: z.enum(['api_request', 'user_action', 'system', 'error', 'performance', 'security', 'data_sync']).optional(),

  // 时间范围过滤
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),

  // 关键字搜索
  search: z.string().optional(),

  // 追踪 ID
  trace_id: z.string().optional(),

  // 排序
  sort_by: z.enum(['created_at', 'level', 'category']).optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * GET - 查询日志列表
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);

  // 验证查询参数
  const params = querySchema.parse({
    page: searchParams.get('page'),
    page_size: searchParams.get('page_size'),
    level: searchParams.get('level'),
    category: searchParams.get('category'),
    start_date: searchParams.get('start_date'),
    end_date: searchParams.get('end_date'),
    search: searchParams.get('search'),
    trace_id: searchParams.get('trace_id'),
    sort_by: searchParams.get('sort_by'),
    sort_order: searchParams.get('sort_order'),
  });

  const supabase = supabaseServerClient;

  // 构建查询
  let query = supabase
    .from('system_logs')
    .select('*', { count: 'exact' });

  // 应用过滤条件
  if (params.level) {
    query = query.eq('level', params.level);
  }

  if (params.category) {
    query = query.eq('category', params.category);
  }

  if (params.trace_id) {
    query = query.eq('trace_id', params.trace_id);
  }

  if (params.start_date) {
    query = query.gte('created_at', params.start_date);
  }

  if (params.end_date) {
    query = query.lte('created_at', params.end_date);
  }

  if (params.search) {
    query = query.or(`message.ilike.%${params.search}%,path.ilike.%${params.search}%`);
  }

  // 应用排序
  query = query.order(params.sort_by, { ascending: params.sort_order === 'asc' });

  // 应用分页
  const from = (params.page - 1) * params.page_size;
  const to = from + params.page_size - 1;
  query = query.range(from, to);

  // 执行查询
  const { data: logs, error, count } = await query;

  if (error) {
    throw error;
  }

  // 计算分页信息
  const total = count || 0;
  const total_pages = Math.ceil(total / params.page_size);

  return NextResponse.json({
    success: true,
    data: logs,
    pagination: {
      page: params.page,
      page_size: params.page_size,
      total,
      total_pages,
      has_next: params.page < total_pages,
      has_prev: params.page > 1,
    },
  });
});
