/**
 * 支付方式服务 - 服务端版本
 * 使用 Repository 模式，支持 Prisma/Supabase 切换
 */

import { getPaymentMethodRepository } from '@/lib/infrastructure/repositories/index.server';
import type {
  PaymentMethod,
  PaymentMethodWithStats,
  PaymentMethodUsageDetail,
  CreatePaymentMethodDTO,
  UpdatePaymentMethodDTO,
} from '@/lib/domain/repositories/IPaymentMethodRepository';

// 重新导出类型
export type { PaymentMethod, PaymentMethodWithStats, PaymentMethodUsageDetail };

/**
 * 删除结果
 */
export interface DeletePaymentMethodResult {
  success: boolean;
  message: string;
  transaction_count: number;
}

/**
 * 获取支付方式列表（带统计信息）
 */
export async function getPaymentMethodsWithStats(): Promise<PaymentMethodWithStats[]> {
  const repository = getPaymentMethodRepository();
  return repository.findAllWithStats();
}

/**
 * 获取所有支付方式
 */
export async function getPaymentMethods(activeOnly = true): Promise<PaymentMethod[]> {
  const repository = getPaymentMethodRepository();
  return repository.findAll(activeOnly);
}

/**
 * 根据 ID 获取支付方式
 */
export async function getPaymentMethodById(id: string): Promise<PaymentMethod | null> {
  const repository = getPaymentMethodRepository();
  return repository.findById(id);
}

/**
 * 添加支付方式
 */
export async function addPaymentMethod(params: {
  name: string;
  type: PaymentMethod['type'];
  icon?: string;
  color?: string;
  last4Digits?: string;
}): Promise<string> {
  const repository = getPaymentMethodRepository();
  const dto: CreatePaymentMethodDTO = {
    name: params.name,
    type: params.type,
    icon: params.icon,
    color: params.color,
    last_4_digits: params.last4Digits,
  };
  const created = await repository.create(dto);
  return created.id;
}

/**
 * 更新支付方式
 */
export async function updatePaymentMethod(params: {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  last4Digits?: string;
}): Promise<boolean> {
  const repository = getPaymentMethodRepository();
  const dto: UpdatePaymentMethodDTO = {
    name: params.name,
    icon: params.icon,
    color: params.color,
    last_4_digits: params.last4Digits,
  };
  await repository.update(params.id, dto);
  return true;
}

/**
 * 删除支付方式
 */
export async function deletePaymentMethod(
  id: string,
  migrateToId?: string
): Promise<DeletePaymentMethodResult> {
  const repository = getPaymentMethodRepository();

  let transactionCount = 0;

  // 如果需要迁移交易
  if (migrateToId) {
    transactionCount = await repository.migrateTransactions(id, migrateToId);
  }

  // 删除支付方式（软删除）
  await repository.delete(id);

  return {
    success: true,
    message: migrateToId
      ? `支付方式已删除，${transactionCount} 笔交易已迁移`
      : '支付方式已删除',
    transaction_count: transactionCount,
  };
}

/**
 * 设置默认支付方式
 */
export async function setDefaultPaymentMethod(id: string): Promise<boolean> {
  const repository = getPaymentMethodRepository();
  await repository.setDefault(id);
  return true;
}

/**
 * 获取支付方式使用详情
 */
export async function getPaymentMethodUsageDetail(
  id: string
): Promise<PaymentMethodUsageDetail> {
  const repository = getPaymentMethodRepository();
  return repository.getUsageDetail(id);
}
