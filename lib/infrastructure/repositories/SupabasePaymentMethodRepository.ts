/**
 * Supabase 支付方式仓储实现
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  IPaymentMethodRepository,
  PaymentMethod,
  PaymentMethodWithStats,
  PaymentMethodUsageDetail,
  CreatePaymentMethodDTO,
  UpdatePaymentMethodDTO,
} from '@/lib/domain/repositories/IPaymentMethodRepository';

export class SupabasePaymentMethodRepository implements IPaymentMethodRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: string): Promise<PaymentMethod | null> {
    const { data, error } = await this.supabase
      .from('payment_methods')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findAll(activeOnly = true): Promise<PaymentMethod[]> {
    let query = this.supabase
      .from('payment_methods')
      .select('*')
      .order('is_default', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(this.mapToEntity);
  }

  async findAllWithStats(): Promise<PaymentMethodWithStats[]> {
    const { data, error } = await this.supabase.rpc('get_payment_methods_with_stats');

    if (error || !data) {
      // 降级到普通查询
      const methods = await this.findAll(true);
      return methods.map((m) => ({ ...m, usage_count: 0, last_used: null }));
    }

    return data.map((row: any) => ({
      ...this.mapToEntity(row),
      usage_count: row.usage_count || 0,
      last_used: row.last_used || null,
    }));
  }

  async findDefault(): Promise<PaymentMethod | null> {
    const { data, error } = await this.supabase
      .from('payment_methods')
      .select('*')
      .eq('is_default', true)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async create(dto: CreatePaymentMethodDTO): Promise<PaymentMethod> {
    const { data, error } = await this.supabase.rpc('add_payment_method', {
      p_name: dto.name,
      p_type: dto.type,
      p_icon: dto.icon || null,
      p_color: dto.color || null,
      p_last_4_digits: dto.last_4_digits || null,
    });

    if (error) {
      throw new Error(`创建支付方式失败: ${error.message}`);
    }

    // RPC 返回 ID，需要查询完整数据
    const created = await this.findById(data);
    if (!created) {
      throw new Error('创建支付方式失败：无法获取创建的记录');
    }
    return created;
  }

  async update(id: string, dto: UpdatePaymentMethodDTO): Promise<PaymentMethod> {
    const { data, error } = await this.supabase.rpc('update_payment_method', {
      p_id: id,
      p_name: dto.name || '',
      p_icon: dto.icon || null,
      p_color: dto.color || null,
      p_last_4_digits: dto.last_4_digits || null,
    });

    if (error) {
      throw new Error(`更新支付方式失败: ${error.message}`);
    }

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('更新支付方式失败：无法获取更新的记录');
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('payment_methods')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      throw new Error(`删除支付方式失败: ${error.message}`);
    }
  }

  async setDefault(id: string): Promise<void> {
    const { error } = await this.supabase.rpc('set_default_payment_method', {
      p_id: id,
    });

    if (error) {
      throw new Error(`设置默认支付方式失败: ${error.message}`);
    }
  }

  async getUsageDetail(id: string): Promise<PaymentMethodUsageDetail> {
    const { data, error } = await this.supabase.rpc('get_payment_method_usage_detail', {
      p_id: id,
    });

    if (error || !data || data.length === 0) {
      return {
        total_transactions: 0,
        total_amount: 0,
        avg_amount: 0,
        last_used: null,
        most_used_category: null,
        most_used_category_count: 0,
      };
    }

    return data[0];
  }

  async migrateTransactions(fromId: string, toId: string): Promise<number> {
    const { data, error } = await this.supabase.rpc('delete_payment_method', {
      p_id: fromId,
      p_migrate_to_id: toId,
    });

    if (error) {
      throw new Error(`迁移交易失败: ${error.message}`);
    }

    return data?.[0]?.transaction_count || 0;
  }

  private mapToEntity(row: any): PaymentMethod {
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      type: row.type,
      icon: row.icon,
      color: row.color,
      last_4_digits: row.last_4_digits,
      is_default: row.is_default,
      is_active: row.is_active,
      sort_order: row.sort_order || 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
