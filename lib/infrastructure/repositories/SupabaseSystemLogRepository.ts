/**
 * Supabase 系统日志仓储实现
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ISystemLogRepository,
  SystemLog,
  CreateSystemLogDTO,
  SystemLogFilter,
  SystemLogPagination,
  PaginatedLogs,
  LogStats,
  LogLevel,
  LogCategory,
} from '@/lib/domain/repositories/ISystemLogRepository';

export class SupabaseSystemLogRepository implements ISystemLogRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(data: CreateSystemLogDTO): Promise<SystemLog> {
    const { data: result, error } = await this.supabase
      .from('system_logs')
      .insert({
        level: data.level,
        category: data.category,
        message: data.message,
        trace_id: data.trace_id,
        session_id: data.session_id,
        operation_id: data.operation_id,
        method: data.method,
        path: data.path,
        status_code: data.status_code,
        ip_address: data.ip_address,
        user_agent: data.user_agent,
        error_code: data.error_code,
        error_stack: data.error_stack,
        metadata: data.metadata || {},
        duration_ms: data.duration_ms,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`创建日志失败: ${error.message}`);
    }

    return this.mapToEntity(result);
  }

  async createMany(data: CreateSystemLogDTO[]): Promise<void> {
    const { error } = await this.supabase
      .from('system_logs')
      .insert(
        data.map((d) => ({
          level: d.level,
          category: d.category,
          message: d.message,
          trace_id: d.trace_id,
          session_id: d.session_id,
          operation_id: d.operation_id,
          method: d.method,
          path: d.path,
          status_code: d.status_code,
          ip_address: d.ip_address,
          user_agent: d.user_agent,
          error_code: d.error_code,
          error_stack: d.error_stack,
          metadata: d.metadata || {},
          duration_ms: d.duration_ms,
        }))
      );

    if (error) {
      throw new Error(`批量创建日志失败: ${error.message}`);
    }
  }

  async findMany(
    filter?: SystemLogFilter,
    pagination?: SystemLogPagination
  ): Promise<PaginatedLogs> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.supabase
      .from('system_logs')
      .select('*', { count: 'exact' });

    // 应用过滤条件
    if (filter?.level) {
      query = query.eq('level', filter.level);
    }
    if (filter?.category) {
      query = query.eq('category', filter.category);
    }
    if (filter?.trace_id) {
      query = query.eq('trace_id', filter.trace_id);
    }
    if (filter?.startDate) {
      query = query.gte('created_at', filter.startDate);
    }
    if (filter?.endDate) {
      query = query.lte('created_at', filter.endDate);
    }
    if (filter?.search) {
      query = query.or(`message.ilike.%${filter.search}%,path.ilike.%${filter.search}%`);
    }

    // 应用排序
    query = query.order(pagination?.sortBy || 'created_at', {
      ascending: pagination?.sortOrder === 'asc',
    });

    // 应用分页
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`查询日志失败: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize);

    return {
      data: (data || []).map(this.mapToEntity),
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async findByTraceId(traceId: string): Promise<SystemLog[]> {
    const { data, error } = await this.supabase
      .from('system_logs')
      .select('*')
      .eq('trace_id', traceId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data.map(this.mapToEntity);
  }

  async getStats(dateRange?: { start: string; end: string }): Promise<LogStats> {
    let countQuery = this.supabase
      .from('system_logs')
      .select('*', { count: 'exact', head: true });

    if (dateRange) {
      countQuery = countQuery
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end);
    }

    const { count: total } = await countQuery;

    // 按级别统计
    const byLevel: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0,
    };

    for (const level of Object.keys(byLevel) as LogLevel[]) {
      let levelQuery = this.supabase
        .from('system_logs')
        .select('*', { count: 'exact', head: true })
        .eq('level', level);

      if (dateRange) {
        levelQuery = levelQuery
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end);
      }

      const { count } = await levelQuery;
      byLevel[level] = count || 0;
    }

    // 按分类统计
    const byCategory: Record<LogCategory, number> = {
      api_request: 0,
      user_action: 0,
      system: 0,
      error: 0,
      performance: 0,
      security: 0,
      data_sync: 0,
    };

    for (const category of Object.keys(byCategory) as LogCategory[]) {
      let categoryQuery = this.supabase
        .from('system_logs')
        .select('*', { count: 'exact', head: true })
        .eq('category', category);

      if (dateRange) {
        categoryQuery = categoryQuery
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end);
      }

      const { count } = await categoryQuery;
      byCategory[category] = count || 0;
    }

    // 最近错误
    let errorsQuery = this.supabase
      .from('system_logs')
      .select('*')
      .in('level', ['error', 'fatal'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (dateRange) {
      errorsQuery = errorsQuery
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end);
    }

    const { data: recentErrors } = await errorsQuery;

    return {
      total: total || 0,
      byLevel,
      byCategory,
      recentErrors: (recentErrors || []).map(this.mapToEntity),
    };
  }

  async cleanupOldLogs(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Supabase 不直接返回删除数量，先查询再删除
    const { count } = await this.supabase
      .from('system_logs')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', cutoffDate.toISOString());

    const { error } = await this.supabase
      .from('system_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString());

    if (error) {
      throw new Error(`清理日志失败: ${error.message}`);
    }

    return count || 0;
  }

  private mapToEntity(row: any): SystemLog {
    return {
      id: row.id,
      created_at: row.created_at,
      level: row.level,
      category: row.category,
      trace_id: row.trace_id,
      session_id: row.session_id,
      operation_id: row.operation_id,
      method: row.method,
      path: row.path,
      status_code: row.status_code,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      message: row.message,
      error_code: row.error_code,
      error_stack: row.error_stack,
      metadata: row.metadata,
      duration_ms: row.duration_ms,
    };
  }
}
