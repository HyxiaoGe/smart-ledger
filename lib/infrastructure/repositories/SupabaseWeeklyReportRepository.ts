/**
 * Supabase 周报告仓储实现
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  IWeeklyReportRepository,
  WeeklyReport,
  CreateWeeklyReportDTO,
  WeeklyReportGenerationResult,
} from '@/lib/domain/repositories/IWeeklyReportRepository';

export class SupabaseWeeklyReportRepository implements IWeeklyReportRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: string): Promise<WeeklyReport | null> {
    const { data, error } = await this.supabase
      .from('weekly_reports')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findAll(): Promise<WeeklyReport[]> {
    const { data, error } = await this.supabase
      .from('weekly_reports')
      .select('*')
      .order('week_start_date', { ascending: false });

    if (error || !data) return [];
    return data.map(this.mapToEntity);
  }

  async findLatest(): Promise<WeeklyReport | null> {
    const { data, error } = await this.supabase
      .from('weekly_reports')
      .select('*')
      .order('week_start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findByDateRange(startDate: string, endDate: string): Promise<WeeklyReport[]> {
    const { data, error } = await this.supabase
      .from('weekly_reports')
      .select('*')
      .gte('week_start_date', startDate)
      .lte('week_start_date', endDate)
      .order('week_start_date', { ascending: false });

    if (error || !data) return [];
    return data.map(this.mapToEntity);
  }

  async existsForWeek(weekStartDate: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('weekly_reports')
      .select('id')
      .eq('week_start_date', weekStartDate)
      .maybeSingle();

    return !error && data !== null;
  }

  async create(dto: CreateWeeklyReportDTO): Promise<WeeklyReport> {
    const { data, error } = await this.supabase
      .from('weekly_reports')
      .insert({
        week_start_date: dto.week_start_date,
        week_end_date: dto.week_end_date,
        total_expenses: dto.total_expenses,
        transaction_count: dto.transaction_count,
        average_transaction: dto.average_transaction,
        category_breakdown: dto.category_breakdown || [],
        top_merchants: dto.top_merchants || [],
        payment_method_stats: dto.payment_method_stats || [],
        week_over_week_change: dto.week_over_week_change,
        week_over_week_percentage: dto.week_over_week_percentage,
        ai_insights: dto.ai_insights,
        generation_type: dto.generation_type || 'manual',
        generated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`创建周报告失败: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('weekly_reports')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`删除周报告失败: ${error.message}`);
    }
  }

  async generate(weekStartDate?: string): Promise<WeeklyReportGenerationResult> {
    try {
      const { data, error } = await this.supabase.rpc('generate_weekly_report');

      if (error) {
        throw new Error(`生成周报告失败: ${error.message}`);
      }

      const result = data?.[0];

      if (!result) {
        return {
          success: false,
          message: '生成周报告失败：无返回数据',
        };
      }

      if (result.message && result.message.includes('已存在')) {
        return {
          success: false,
          message: result.message,
        };
      }

      return {
        success: true,
        message: result.message || '报告生成成功',
      };
    } catch (err) {
      console.error('生成周报告失败:', err);
      throw err;
    }
  }

  private mapToEntity(row: any): WeeklyReport {
    return {
      id: String(row.id),
      user_id: row.user_id,
      week_start_date: row.week_start_date,
      week_end_date: row.week_end_date,
      total_expenses: Number(row.total_expenses),
      transaction_count: row.transaction_count,
      average_transaction: row.average_transaction ? Number(row.average_transaction) : null,
      category_breakdown: row.category_breakdown || [],
      top_merchants: row.top_merchants || [],
      payment_method_stats: row.payment_method_stats || [],
      week_over_week_change: row.week_over_week_change ? Number(row.week_over_week_change) : null,
      week_over_week_percentage: row.week_over_week_percentage ? Number(row.week_over_week_percentage) : null,
      ai_insights: row.ai_insights,
      generated_at: row.generated_at,
      generation_type: row.generation_type || 'auto',
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
