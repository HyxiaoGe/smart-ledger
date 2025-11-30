/**
 * 日志查询 API
 * 提供日志的查询、过滤和分页功能
 * 使用 Repository 模式，支持 Prisma/Supabase 切换
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSystemLogRepository } from '@/lib/infrastructure/repositories/index.server';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';
import { z } from 'zod';
import type { LogLevel, LogCategory } from '@/lib/services/logging/types';

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
    page: searchParams.get('page') || undefined,
    page_size: searchParams.get('page_size') || undefined,
    level: searchParams.get('level') || undefined,
    category: searchParams.get('category') || undefined,
    start_date: searchParams.get('start_date') || undefined,
    end_date: searchParams.get('end_date') || undefined,
    search: searchParams.get('search') || undefined,
    trace_id: searchParams.get('trace_id') || undefined,
    sort_by: searchParams.get('sort_by') || undefined,
    sort_order: searchParams.get('sort_order') || undefined,
  });

  const repository = getSystemLogRepository();

  // 使用 Repository 查询
  const result = await repository.findMany(
    {
      level: params.level as LogLevel | undefined,
      category: params.category as LogCategory | undefined,
      trace_id: params.trace_id,
      startDate: params.start_date,
      endDate: params.end_date,
      search: params.search,
    },
    {
      page: params.page,
      pageSize: params.page_size,
      sortBy: params.sort_by as 'created_at' | 'level' | 'category',
      sortOrder: params.sort_order,
    }
  );

  // 把 pagination 放入 data 中，让 apiClient 自动解包后仍能获取完整结构
  return NextResponse.json({
    data: {
      data: result.data,
      pagination: {
        page: result.pagination.page,
        page_size: result.pagination.pageSize,
        total: result.pagination.total,
        total_pages: result.pagination.totalPages,
        has_next: result.pagination.hasNext,
        has_prev: result.pagination.hasPrev,
      },
    },
  });
});
