/**
 * Prisma 客户端单例
 * 用于替换 Supabase 客户端，提供本地 PostgreSQL 数据库访问
 */

import { PrismaClient } from '@prisma/client';

// 声明全局变量用于开发环境热重载时保持单例
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * 创建 Prisma 客户端实例
 * - 生产环境：每次创建新实例
 * - 开发环境：使用全局变量保持单例，避免热重载时创建多个连接
 */
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });
}

// 导出单例实例
export const prisma = globalThis.prisma ?? createPrismaClient();

// 开发环境下保存到全局变量
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

/**
 * 断开数据库连接
 * 用于优雅关闭应用或测试清理
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * 检查数据库连接状态
 */
export async function checkConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
