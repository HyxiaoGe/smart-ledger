/**
 * 数据库客户端统一入口
 * 根据 USE_PRISMA 环境变量自动选择 Supabase 或 Prisma
 * 仅在服务端使用（API 路由、Server Components）
 */

// 在运行时检查环境变量，避免构建时缓存
function isUsePrisma(): boolean {
  return process.env.USE_PRISMA === 'true';
}

export type DbClient = 'prisma' | 'supabase';

export function getDbType(): DbClient {
  return isUsePrisma() ? 'prisma' : 'supabase';
}

/**
 * 获取 Prisma 客户端（仅当 USE_PRISMA=true 时可用）
 */
export function getPrismaClient() {
  if (!isUsePrisma()) {
    throw new Error('Prisma is not enabled. Set USE_PRISMA=true to use Prisma.');
  }
  try {
    const { prisma } = require('@/lib/clients/db/prisma');
    if (!prisma) {
      throw new Error('Prisma client is undefined. Run `npx prisma generate` first.');
    }
    return prisma;
  } catch (error) {
    console.error('Failed to load Prisma client:', error);
    throw new Error('Failed to load Prisma client. Ensure Prisma is properly configured.');
  }
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
  if (isUsePrisma()) {
    return prismaQuery();
  }
  return supabaseQuery();
}
