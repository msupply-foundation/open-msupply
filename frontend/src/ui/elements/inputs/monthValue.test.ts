import { describe, expect, it } from 'vitest';
import {
  addMonths,
  formatMonth,
  isMonthOutside,
  monthDateRange,
  monthOfDate,
  parseMonthValue,
  toMonthValue,
} from './monthValue';

describe('parseMonthValue', () => {
  it('reads a YYYY-MM month with a 0-based month', () => {
    expect(parseMonthValue('2026-08')).toEqual({ year: 2026, month: 7 });
    expect(parseMonthValue('2026-01')).toEqual({ year: 2026, month: 0 });
  });

  it('rejects anything else', () => {
    for (const bad of [
      '2026-13',
      '2026-00',
      '2026-8',
      '2026-08-01',
      '',
      null,
      undefined,
    ])
      expect(parseMonthValue(bad)).toBeNull();
  });
});

describe('toMonthValue / monthOfDate', () => {
  it('pads the month', () => {
    expect(toMonthValue(2026, 0)).toBe('2026-01');
    expect(toMonthValue(2026, 11)).toBe('2026-12');
  });

  it('takes the local month of a date', () => {
    expect(monthOfDate(new Date(2026, 7, 31, 23, 59))).toBe('2026-08');
  });
});

describe('addMonths', () => {
  it('crosses year boundaries both ways', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });
});

describe('monthDateRange', () => {
  it('gives the first and last day of the month', () => {
    expect(monthDateRange('2026-08')).toEqual({
      start: '2026-08-01',
      end: '2026-08-31',
    });
    expect(monthDateRange('2026-02')).toEqual({
      start: '2026-02-01',
      end: '2026-02-28',
    });
  });

  it('knows leap years', () => {
    expect(monthDateRange('2028-02')?.end).toBe('2028-02-29');
  });

  it('is null for a non-month', () => {
    expect(monthDateRange(null)).toBeNull();
  });
});

describe('isMonthOutside', () => {
  it('treats min and max as inclusive', () => {
    expect(isMonthOutside('2026-08', '2026-08', '2026-08')).toBe(false);
    expect(isMonthOutside('2026-07', '2026-08')).toBe(true);
    expect(isMonthOutside('2026-09', undefined, '2026-08')).toBe(true);
    expect(isMonthOutside('2026-09')).toBe(false);
  });
});

describe('formatMonth', () => {
  it('writes the month and year in words', () => {
    expect(formatMonth('2026-08', 'en')).toBe('August 2026');
  });

  it('is empty for a non-month', () => {
    expect(formatMonth(undefined, 'en')).toBe('');
  });
});
