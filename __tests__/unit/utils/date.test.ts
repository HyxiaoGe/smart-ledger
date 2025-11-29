/**
 * 日期工具函数测试
 * @module lib/utils/date
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  monthRange,
  parseMonthStr,
  formatMonth,
  shiftMonth,
  todayISO,
  formatDateToLocal,
  dayRange,
  yesterdayRange,
  lastNDaysRange,
  getQuickRange,
} from '@/lib/utils/date';

describe('date utilities', () => {
  // 固定时间以确保测试稳定性
  const fixedDate = new Date('2024-06-15T10:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('monthRange', () => {
    it('should return correct month range for given date', () => {
      const date = new Date(2024, 5, 15); // June 2024
      const result = monthRange(date);

      expect(result.start).toBe('2024-06-01');
      expect(result.end).toBe('2024-07-01');
      expect(result.prevStart).toBe('2024-05-01');
      expect(result.prevEnd).toBe('2024-06-01');
    });

    it('should handle year boundary correctly (January)', () => {
      const date = new Date(2024, 0, 15); // January 2024
      const result = monthRange(date);

      expect(result.start).toBe('2024-01-01');
      expect(result.end).toBe('2024-02-01');
      expect(result.prevStart).toBe('2023-12-01');
      expect(result.prevEnd).toBe('2024-01-01');
    });

    it('should handle December correctly', () => {
      const date = new Date(2024, 11, 15); // December 2024
      const result = monthRange(date);

      expect(result.start).toBe('2024-12-01');
      expect(result.end).toBe('2025-01-01');
      expect(result.prevStart).toBe('2024-11-01');
      expect(result.prevEnd).toBe('2024-12-01');
    });

    it('should default to current date when no argument', () => {
      const result = monthRange();
      // 注意：fixedDate 是 UTC 时间，本地时间可能不同
      expect(result.start).toMatch(/^\d{4}-\d{2}-01$/);
      expect(result.end).toMatch(/^\d{4}-\d{2}-01$/);
    });
  });

  describe('parseMonthStr', () => {
    it('should parse valid YYYY-MM string', () => {
      const result = parseMonthStr('2024-06');
      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(5); // June is month 5 (0-indexed)
    });

    it('should parse January correctly', () => {
      const result = parseMonthStr('2024-01');
      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0);
    });

    it('should parse December correctly', () => {
      const result = parseMonthStr('2024-12');
      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(11);
    });

    it('should return null for invalid format', () => {
      expect(parseMonthStr('2024/06')).toBeNull();
      expect(parseMonthStr('2024-6')).toBeNull();
      expect(parseMonthStr('24-06')).toBeNull();
      expect(parseMonthStr('2024-06-01')).toBeNull();
    });

    it('should return null for invalid month values', () => {
      expect(parseMonthStr('2024-00')).toBeNull();
      expect(parseMonthStr('2024-13')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(parseMonthStr('')).toBeNull();
    });

    it('should return null for undefined', () => {
      expect(parseMonthStr(undefined)).toBeNull();
    });
  });

  describe('formatMonth', () => {
    it('should format date to YYYY-MM string', () => {
      const date = new Date(2024, 5, 15); // June 2024
      expect(formatMonth(date)).toBe('2024-06');
    });

    it('should pad single digit months with zero', () => {
      const date = new Date(2024, 0, 15); // January
      expect(formatMonth(date)).toBe('2024-01');
    });

    it('should handle December correctly', () => {
      const date = new Date(2024, 11, 15); // December
      expect(formatMonth(date)).toBe('2024-12');
    });
  });

  describe('shiftMonth', () => {
    it('should shift month forward correctly', () => {
      const date = new Date(2024, 5, 15); // June 2024
      const result = shiftMonth(date, 1);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(6); // July
    });

    it('should shift month backward correctly', () => {
      const date = new Date(2024, 5, 15); // June 2024
      const result = shiftMonth(date, -1);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(4); // May
    });

    it('should handle year boundary forward', () => {
      const date = new Date(2024, 11, 15); // December 2024
      const result = shiftMonth(date, 1);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0); // January
    });

    it('should handle year boundary backward', () => {
      const date = new Date(2024, 0, 15); // January 2024
      const result = shiftMonth(date, -1);
      expect(result.getFullYear()).toBe(2023);
      expect(result.getMonth()).toBe(11); // December
    });

    it('should shift multiple months', () => {
      const date = new Date(2024, 5, 15); // June 2024
      const result = shiftMonth(date, 6);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(11); // December
    });

    it('should shift multiple months backward across years', () => {
      const date = new Date(2024, 2, 15); // March 2024
      const result = shiftMonth(date, -6);
      expect(result.getFullYear()).toBe(2023);
      expect(result.getMonth()).toBe(8); // September
    });
  });

  describe('todayISO', () => {
    it('should return today in YYYY-MM-DD format', () => {
      const result = todayISO();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should use provided date', () => {
      const date = new Date(2024, 5, 15);
      const result = todayISO(date);
      expect(result).toBe('2024-06-15');
    });

    it('should pad single digit day and month', () => {
      const date = new Date(2024, 0, 5); // January 5
      const result = todayISO(date);
      expect(result).toBe('2024-01-05');
    });
  });

  describe('formatDateToLocal', () => {
    it('should format date to YYYY-MM-DD using local timezone', () => {
      const date = new Date(2024, 5, 15);
      const result = formatDateToLocal(date);
      expect(result).toBe('2024-06-15');
    });

    it('should pad single digit values', () => {
      const date = new Date(2024, 0, 5);
      const result = formatDateToLocal(date);
      expect(result).toBe('2024-01-05');
    });
  });

  describe('dayRange', () => {
    it('should return start and end of day', () => {
      const date = new Date(2024, 5, 15);
      const result = dayRange(date);
      expect(result.start).toBe('2024-06-15');
      expect(result.end).toBe('2024-06-16');
    });

    it('should handle month boundary', () => {
      const date = new Date(2024, 5, 30); // June 30
      const result = dayRange(date);
      expect(result.start).toBe('2024-06-30');
      expect(result.end).toBe('2024-07-01');
    });
  });

  describe('yesterdayRange', () => {
    it('should return yesterday date range', () => {
      const today = new Date(2024, 5, 15);
      const result = yesterdayRange(today);
      expect(result.start).toBe('2024-06-14');
      expect(result.end).toBe('2024-06-15');
    });

    it('should handle first day of month', () => {
      const today = new Date(2024, 5, 1); // June 1
      const result = yesterdayRange(today);
      expect(result.start).toBe('2024-05-31');
      expect(result.end).toBe('2024-06-01');
    });

    it('should handle first day of year', () => {
      const today = new Date(2024, 0, 1); // January 1
      const result = yesterdayRange(today);
      expect(result.start).toBe('2023-12-31');
      expect(result.end).toBe('2024-01-01');
    });
  });

  describe('lastNDaysRange', () => {
    it('should return correct range for last 7 days', () => {
      const today = new Date(2024, 5, 15);
      const result = lastNDaysRange(7, today);
      expect(result.start).toBe('2024-06-09');
      expect(result.end).toBe('2024-06-16');
    });

    it('should return correct range for last 30 days', () => {
      const today = new Date(2024, 5, 15);
      const result = lastNDaysRange(30, today);
      expect(result.start).toBe('2024-05-17');
      expect(result.end).toBe('2024-06-16');
    });

    it('should handle month boundaries', () => {
      const today = new Date(2024, 5, 5); // June 5
      const result = lastNDaysRange(7, today);
      expect(result.start).toBe('2024-05-30');
      expect(result.end).toBe('2024-06-06');
    });

    it('should return single day for n=1', () => {
      const today = new Date(2024, 5, 15);
      const result = lastNDaysRange(1, today);
      expect(result.start).toBe('2024-06-15');
      expect(result.end).toBe('2024-06-16');
    });
  });

  describe('getQuickRange', () => {
    it('should return today range', () => {
      const result = getQuickRange('today');
      expect(result.label).toBe('今日');
      expect(result.start).toBeDefined();
      expect(result.end).toBeDefined();
    });

    it('should return yesterday range', () => {
      const result = getQuickRange('yesterday');
      expect(result.label).toBe('昨日');
      expect(result.start).toBeDefined();
      expect(result.end).toBeDefined();
    });

    it('should return last 7 days range', () => {
      const result = getQuickRange('last7');
      expect(result.label).toBe('近7日');
      expect(result.start).toBeDefined();
      expect(result.end).toBeDefined();
    });

    it('should return month range', () => {
      const result = getQuickRange('month', '2024-06');
      expect(result.label).toBe('2024-06');
      expect(result.start).toBe('2024-06-01');
      expect(result.end).toBe('2024-07-01');
    });

    it('should default to current month when no month specified', () => {
      const result = getQuickRange('month');
      expect(result.label).toMatch(/^\d{4}-\d{2}$/);
      expect(result.start).toMatch(/^\d{4}-\d{2}-01$/);
    });
  });
});
