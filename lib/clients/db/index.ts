/**
 * 数据库客户端统一入口
 * 仅使用 Prisma，服务端使用（API 路由、Server Components）
 */

export type DbClient = 'prisma';

export function getDbType(): DbClient {
  return 'prisma';
}

/**
 * 获取 Prisma 客户端
 */
export function getPrismaClient() {
  try {
    const { prisma } = require('./prisma');
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
 * 执行数据库查询
 * 直接执行 Prisma 查询
 */
export async function executeQuery<T>(
  _supabaseQuery: () => Promise<T>,
  prismaQuery: () => Promise<T>
): Promise<T> {
  return prismaQuery();
}
