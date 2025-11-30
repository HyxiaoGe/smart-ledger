/**
 * Prisma 系统日志仓储实现
 */

import type { PrismaClient, Prisma } from '@prisma/client';
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

export class PrismaSystemLogRepository implements ISystemLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateSystemLogDTO): Promise<SystemLog> {
    const result = await this.prisma.system_logs.create({
      data: {
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
        metadata: data.metadata as any || {},
        duration_ms: data.duration_ms,
      },
    });

    return this.mapToEntity(result);
  }

  async createMany(data: CreateSystemLogDTO[]): Promise<void> {
    await this.prisma.system_logs.createMany({
      data: data.map((d) => ({
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
        metadata: d.metadata as any || {},
        duration_ms: d.duration_ms,
      })),
    });
  }

  async findMany(
    filter?: SystemLogFilter,
    pagination?: SystemLogPagination
  ): Promise<PaginatedLogs> {
    const where = this.buildWhereClause(filter);

    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const orderBy: Prisma.system_logsOrderByWithRelationInput = {
      [pagination?.sortBy || 'created_at']: pagination?.sortOrder || 'desc',
    };

    const [data, total] = await Promise.all([
      this.prisma.system_logs.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
      }),
      this.prisma.system_logs.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: data.map(this.mapToEntity),
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
    const data = await this.prisma.system_logs.findMany({
      where: { trace_id: traceId },
      orderBy: { created_at: 'asc' },
    });

    return data.map(this.mapToEntity);
  }

  async getStats(dateRange?: { start: string; end: string }): Promise<LogStats> {
    const where: any = {};

    if (dateRange) {
      where.created_at = {
        gte: new Date(dateRange.start),
        lte: new Date(dateRange.end),
      };
    }

    // 总数
    const total = await this.prisma.system_logs.count({ where });

    // 按级别统计
    const byLevelResult = await this.prisma.system_logs.groupBy({
      by: ['level'],
      where,
      _count: true,
    });

    const byLevel: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0,
    };

    byLevelResult.forEach((item: { level: string; _count: number }) => {
      byLevel[item.level as LogLevel] = item._count;
    });

    // 按分类统计
    const byCategoryResult = await this.prisma.system_logs.groupBy({
      by: ['category'],
      where,
      _count: true,
    });

    const byCategory: Record<LogCategory, number> = {
      api_request: 0,
      user_action: 0,
      system: 0,
      error: 0,
      performance: 0,
      security: 0,
      data_sync: 0,
    };

    byCategoryResult.forEach((item: { category: string; _count: number }) => {
      byCategory[item.category as LogCategory] = item._count;
    });

    // 最近错误
    const recentErrors = await this.prisma.system_logs.findMany({
      where: {
        ...where,
        level: { in: ['error', 'fatal'] },
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    return {
      total,
      byLevel,
      byCategory,
      recentErrors: recentErrors.map(this.mapToEntity),
    };
  }

  async cleanupOldLogs(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.prisma.system_logs.deleteMany({
      where: {
        created_at: { lt: cutoffDate },
      },
    });

    return result.count;
  }

  private buildWhereClause(filter?: SystemLogFilter): Prisma.system_logsWhereInput {
    const where: Prisma.system_logsWhereInput = {};

    if (filter?.level) {
      where.level = filter.level;
    }

    if (filter?.category) {
      where.category = filter.category;
    }

    if (filter?.trace_id) {
      where.trace_id = filter.trace_id;
    }

    if (filter?.startDate || filter?.endDate) {
      where.created_at = {};
      if (filter.startDate) {
        where.created_at.gte = new Date(filter.startDate);
      }
      if (filter.endDate) {
        where.created_at.lte = new Date(filter.endDate);
      }
    }

    if (filter?.search) {
      where.OR = [
        { message: { contains: filter.search, mode: 'insensitive' } },
        { path: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private mapToEntity(row: any): SystemLog {
    return {
      id: row.id,
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
      level: row.level as LogLevel,
      category: row.category as LogCategory,
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
      metadata: row.metadata as any,
      duration_ms: row.duration_ms,
    };
  }
}
