/**
 * 数据库客户端统一入口
 * 根据 USE_PRISMA 环境变量自动选择 Supabase 或 Prisma
 * 仅在服务端使用（API 路由、Server Components）
 */

const USE_PRISMA = process.env.USE_PRISMA === 'true';

export type DbClient = 'prisma' | 'supabase';

export function getDbType(): DbClient {
  return USE_PRISMA ? 'prisma' : 'supabase';
}

/**
 * 获取 Prisma 客户端（仅当 USE_PRISMA=true 时可用）
 */
export function getPrismaClient() {
  if (!USE_PRISMA) {
    throw new Error('Prisma is not enabled. Set USE_PRISMA=true to use Prisma.');
  }
  const { prisma } = require('@/lib/clients/db/prisma');
  return prisma;
}

/**
 * 获取 Supabase 客户端
 */
export function getSupabaseClient() {
  const { supabase } = require('@/lib/clients/supabase/client');
  return supabase;
}

/**
 * 执行数据库查询的辅助函数
 * 根据 USE_PRISMA 自动选择执行方式
 */
export async function executeQuery<T>(
  supabaseQuery: () => Promise<T>,
  prismaQuery: () => Promise<T>
): Promise<T> {
  if (USE_PRISMA) {
    return prismaQuery();
  }
  return supabaseQuery();
}
