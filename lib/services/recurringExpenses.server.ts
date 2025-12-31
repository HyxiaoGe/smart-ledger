/**
 * 固定支出服务 - 服务端版本
 * 使用 Repository 模式，支持 Prisma/Supabase 切换
 */

import {
  getRecurringExpenseRepository,
  getTransactionRepository
} from '@/lib/infrastructure/repositories/index.server';
import { getPrismaClient } from '@/lib/clients/db';
import type {
  RecurringExpense,
  CreateRecurringExpenseDTO,
  UpdateRecurringExpenseDTO,
  FrequencyConfig
} from '@/lib/domain/repositories/IRecurringExpenseRepository';

// 重新导出类型
export type { RecurringExpense, FrequencyConfig };

const HOLIDAY_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const holidayCache = new Map<number, { map: Map<string, boolean>; fetchedAt: number }>();

function extractHolidayEntries(
  payload: any
): Array<{ date: string; isHoliday: boolean; name?: string | null }> {
  const entries: Array<{ date: string; isHoliday: boolean; name?: string | null }> = [];
  if (!payload || typeof payload !== 'object') return entries;

  const addFromObject = (obj: Record<string, any>) => {
    for (const value of Object.values(obj)) {
      if (!value || typeof value !== 'object') continue;
      const dateValue = typeof value.date === 'string' ? value.date : null;
      const resolvedDate = dateValue && /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? dateValue : null;
      if (!resolvedDate) continue;
      const isHoliday =
        ('holiday' in value && value.holiday === true) ||
        ('isHoliday' in value && value.isHoliday === true) ||
        ('type' in value && value.type === 'holiday');
      entries.push({
        date: resolvedDate,
        isHoliday,
        name: typeof value.name === 'string' ? value.name : null
      });
    }
  };

  if (payload.holiday && typeof payload.holiday === 'object') {
    addFromObject(payload.holiday);
  }
  if (payload.data && typeof payload.data === 'object') {
    addFromObject(payload.data);
  }

  return entries;
}

async function loadHolidayMapFromDb(year: number): Promise<Map<string, boolean>> {
  try {
    const prisma = getPrismaClient();
    const start = new Date(`${year}-01-01`);
    const end = new Date(`${year}-12-31`);
    const rows = await prisma.holidays.findMany({
      where: {
        date: { gte: start, lte: end }
      },
      select: { date: true, is_holiday: true }
    });
    const map = new Map<string, boolean>();
    rows.forEach((row: { date: Date; is_holiday: boolean }) => {
      map.set(row.date.toISOString().split('T')[0], row.is_holiday);
    });
    return map;
  } catch (error) {
    console.warn('Failed to load holiday data from DB:', error);
    return new Map();
  }
}

async function saveHolidayEntriesToDb(
  entries: Array<{ date: string; isHoliday: boolean; name?: string | null }>
): Promise<void> {
  if (entries.length === 0) return;
  try {
    const prisma = getPrismaClient();
    const rows = entries.map((entry) => ({
      date: new Date(entry.date),
      name: entry.name ?? null,
      is_holiday: entry.isHoliday,
      source: 'timor.tech'
    }));
    await prisma.holidays.createMany({
      data: rows,
      skipDuplicates: true
    });
  } catch (error) {
    console.warn('Failed to save holiday data to DB:', error);
  }
}

async function fetchHolidayMap(year: number): Promise<Map<string, boolean>> {
  const cached = holidayCache.get(year);
  const now = Date.now();
  if (cached && now - cached.fetchedAt < HOLIDAY_CACHE_TTL_MS) {
    return cached.map;
  }

  const dbMap = await loadHolidayMapFromDb(year);
  if (dbMap.size > 0) {
    holidayCache.set(year, { map: dbMap, fetchedAt: now });
    return dbMap;
  }

  try {
    const response = await fetch(`https://timor.tech/api/holiday/year/${year}`, {
      headers: {
        'User-Agent': 'smart-ledger/1.0',
        Accept: 'application/json'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Holiday API error: ${response.status}`);
    }

    const payload = await response.json();
    const entries = extractHolidayEntries(payload);
    await saveHolidayEntriesToDb(entries);
    const map = new Map<string, boolean>();
    entries.forEach((entry) => map.set(entry.date, entry.isHoliday));
    holidayCache.set(year, { map, fetchedAt: now });
    return map;
  } catch (error) {
    console.warn('Failed to fetch holiday data:', error);
    return new Map();
  }
}

async function forceFetchHolidayMap(year: number): Promise<Map<string, boolean>> {
  const response = await fetch(`https://timor.tech/api/holiday/year/${year}`, {
    headers: {
      'User-Agent': 'smart-ledger/1.0',
      Accept: 'application/json'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Holiday API error: ${response.status}`);
  }

  const payload = await response.json();
  const entries = extractHolidayEntries(payload);
  await saveHolidayEntriesToDb(entries);
  const map = new Map<string, boolean>();
  entries.forEach((entry) => map.set(entry.date, entry.isHoliday));
  holidayCache.set(year, { map, fetchedAt: Date.now() });
  return map;
}

async function isHolidayDate(dateStr: string): Promise<boolean> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const year = Number(dateStr.slice(0, 4));
  if (!Number.isFinite(year)) return false;
  const map = await fetchHolidayMap(year);
  return map.get(dateStr) === true;
}

async function isWorkingDay(dateStr: string): Promise<boolean> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const year = Number(dateStr.slice(0, 4));
  if (!Number.isFinite(year)) return false;
  const map = await fetchHolidayMap(year);
  if (map.has(dateStr)) {
    return map.get(dateStr) === false;
  }
  const date = new Date(dateStr);
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

export class RecurringExpenseService {
  /**
   * 创建固定支出
   */
  async createRecurringExpense(
    data: Omit<
      RecurringExpense,
      'id' | 'last_generated' | 'next_generate' | 'created_at' | 'updated_at'
    >
  ): Promise<RecurringExpense> {
    const repository = getRecurringExpenseRepository();
    const dto: CreateRecurringExpenseDTO = {
      name: data.name,
      amount: data.amount,
      category: data.category,
      frequency: data.frequency,
      frequency_config: data.frequency_config,
      start_date: data.start_date,
      end_date: data.end_date || undefined,
      skip_holidays: data.skip_holidays,
      is_active: data.is_active
    };
    return repository.create(dto);
  }

  /**
   * 获取所有固定支出
   */
  async getRecurringExpenses(): Promise<RecurringExpense[]> {
    const repository = getRecurringExpenseRepository();
    return repository.findAll();
  }

  /**
   * 更新固定支出
   */
  async updateRecurringExpense(
    id: string,
    data: Partial<RecurringExpense>
  ): Promise<RecurringExpense> {
    const repository = getRecurringExpenseRepository();
    const dto: UpdateRecurringExpenseDTO = {};

    if (data.name !== undefined) dto.name = data.name;
    if (data.amount !== undefined) dto.amount = data.amount;
    if (data.category !== undefined) dto.category = data.category;
    if (data.frequency !== undefined) dto.frequency = data.frequency;
    if (data.frequency_config !== undefined) dto.frequency_config = data.frequency_config;
    if (data.start_date !== undefined) dto.start_date = data.start_date;
    if (data.end_date !== undefined) dto.end_date = data.end_date;
    if (data.skip_holidays !== undefined) dto.skip_holidays = data.skip_holidays;
    if (data.is_active !== undefined) dto.is_active = data.is_active;

    return repository.update(id, dto);
  }

  /**
   * 删除固定支出
   */
  async deleteRecurringExpense(id: string): Promise<void> {
    const repository = getRecurringExpenseRepository();
    await repository.delete(id);
  }

  /**
   * 根据ID获取固定支出
   */
  async getRecurringExpenseById(id: string): Promise<RecurringExpense | null> {
    const repository = getRecurringExpenseRepository();
    return repository.findById(id);
  }

  /**
   * 手动触发生成固定支出
   */
  async generatePendingExpenses(options?: {
    includeOverdue?: boolean;
  }): Promise<{ generated: number; errors: string[] }> {
    const today = new Date().toISOString().split('T')[0];
    const errors: string[] = [];
    let generated = 0;
    const includeOverdue = options?.includeOverdue ?? false;

    try {
      const repository = getRecurringExpenseRepository();
      const pendingExpenses = await repository.findPendingGeneration(today, includeOverdue);

      if (!pendingExpenses || pendingExpenses.length === 0) {
        return { generated, errors };
      }

      for (const expense of pendingExpenses) {
        try {
          await this.generateTransactionForExpense(expense, today);
          generated++;
        } catch (error) {
          errors.push(`生成固定支出 "${expense.name}" 失败: ${error}`);
        }
      }
    } catch (error) {
      errors.push('生成过程中发生错误: ' + error);
    }

    return { generated, errors };
  }

  /**
   * 为单个固定支出生成交易记录
   */
  private async generateTransactionForExpense(
    expense: RecurringExpense,
    today: string
  ): Promise<void> {
    const recurringRepo = getRecurringExpenseRepository();
    const transactionRepo = getTransactionRepository();

    // 检查今天是否已经生成过（避免重复）
    const hasGenerated = await recurringRepo.hasGeneratedToday(expense.id, today);
    if (hasGenerated) {
      return;
    }

    if (expense.skip_holidays) {
      const holiday = await isHolidayDate(today);
      if (holiday) {
        const nextGenerate = await this.calculateNextDateSkippingHolidays(
          expense.frequency,
          expense.frequency_config,
          today
        );
        await recurringRepo.update(expense.id, {
          next_generate: nextGenerate
        });
        await recurringRepo.logGeneration(expense.id, today, null, 'skipped', 'holiday');
        return;
      }
    }

    // 生成交易记录
    const transaction = await transactionRepo.create({
      type: 'expense',
      category: expense.category,
      amount: expense.amount,
      note: `[自动生成] ${expense.name}`,
      date: today,
      currency: 'CNY'
    });

    // 计算下次生成时间
    const nextGenerate = this.calculateNextDateAfterGeneration(
      expense.frequency,
      expense.frequency_config,
      today
    );

    // 更新固定支出的生成时间和下次生成时间
    await recurringRepo.update(expense.id, {
      last_generated: today,
      next_generate: nextGenerate
    });

    // 记录生成日志
    await recurringRepo.logGeneration(expense.id, today, transaction.id, 'success');
  }

  /**
   * 生成后计算下次生成时间
   */
  private calculateNextDateAfterGeneration(
    frequency: string,
    config: FrequencyConfig,
    currentDate: string
  ): string {
    const current = new Date(currentDate);
    const nextDate = new Date(current);

    switch (frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;

      case 'weekly': {
        if (config.days_of_week && config.days_of_week.length > 0) {
          let attempts = 0;
          while (attempts < 7) {
            nextDate.setDate(nextDate.getDate() + 1);
            if (config.days_of_week.includes(nextDate.getDay())) {
              break;
            }
            attempts++;
          }
        } else {
          nextDate.setDate(nextDate.getDate() + 7);
        }
        break;
      }

      case 'monthly': {
        const targetDay = config.day_of_month || current.getDate();
        nextDate.setMonth(nextDate.getMonth() + 1);

        const lastDayOfMonth = new Date(
          nextDate.getFullYear(),
          nextDate.getMonth() + 1,
          0
        ).getDate();
        if (targetDay > lastDayOfMonth) {
          nextDate.setDate(lastDayOfMonth);
        } else {
          nextDate.setDate(targetDay);
        }
        break;
      }
    }

    return nextDate.toISOString().split('T')[0];
  }

  private async calculateNextDateSkippingHolidays(
    frequency: string,
    config: FrequencyConfig,
    currentDate: string
  ): Promise<string> {
    let guard = 0;
    let nextDate = this.calculateNextDateAfterGeneration(frequency, config, currentDate);
    const isWorkdaySchedule =
      frequency === 'weekly' &&
      Array.isArray(config.days_of_week) &&
      config.days_of_week.length === 5 &&
      config.days_of_week.every((day) => day >= 1 && day <= 5);

    if (isWorkdaySchedule) {
      nextDate = currentDate;
      while (guard < 62) {
        const candidate = new Date(nextDate);
        candidate.setDate(candidate.getDate() + 1);
        const candidateStr = candidate.toISOString().split('T')[0];
        if (await isWorkingDay(candidateStr)) {
          return candidateStr;
        }
        nextDate = candidateStr;
        guard += 1;
      }
      return this.calculateNextDateAfterGeneration(frequency, config, currentDate);
    }

    while (guard < 62 && (await isHolidayDate(nextDate))) {
      nextDate = this.calculateNextDateAfterGeneration(frequency, config, nextDate);
      guard += 1;
    }
    return nextDate;
  }
}

// 导出单例实例
export const recurringExpenseService = new RecurringExpenseService();

export async function syncHolidayYear(year: number): Promise<{ year: number; count: number }> {
  const map = await forceFetchHolidayMap(year);
  return { year, count: map.size };
}
