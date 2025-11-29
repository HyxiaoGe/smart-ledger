/**
 * 数据库客户端统一入口
 * 使用 Prisma ORM
 */

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
 * @deprecated 直接使用 getPrismaClient() 代替
 */
export async function executeQuery<T>(
  _legacyQuery: () => Promise<T>,
  prismaQuery: () => Promise<T>
): Promise<T> {
  return prismaQuery();
}
