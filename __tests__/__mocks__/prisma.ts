/**
 * Prisma Client Mock
 * 使用 vitest-mock-extended 创建深度 Mock
 */

import { vi } from 'vitest';
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended';
import type { PrismaClient } from '@/generated/prisma/client';

// 创建 Prisma Client 的深度 Mock
export const prismaMock = mockDeep<PrismaClient>();

// 重置 Mock 的辅助函数
export function resetPrismaMock() {
  mockReset(prismaMock);
}

// 导出类型
export type MockPrismaClient = DeepMockProxy<PrismaClient>;

// Mock getPrismaClient 函数
vi.mock('@/lib/clients/db', () => ({
  getPrismaClient: () => prismaMock,
}));

vi.mock('@/lib/clients/db/prisma', () => ({
  prisma: prismaMock,
  getPrismaClient: () => prismaMock,
}));
