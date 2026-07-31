import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { getDisplayAge } from './formatDateTime';
import { setDictionaries, setLocale } from './intl';
import commonEn from './locales/en/common.json';

// Seed the English catalog so the pluralised age keys resolve to real strings,
// and pin "today" so the derived age is deterministic. Dates are built with the
// local-time constructor (month is 0-indexed) so the calendar arithmetic is
// timezone-independent.
beforeAll(() => {
  setDictionaries({ en: commonEn });
  setLocale('en');
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2025, 9, 1)); // 2025-10-01, local
});

afterAll(() => {
  vi.useRealTimers();
});

describe('getDisplayAge (spec/patients — age display)', () => {
  it('shows whole years once at least one year old', () => {
    expect(getDisplayAge(new Date(2024, 9, 1))).toBe('1 year'); // exactly 1y
    expect(getDisplayAge(new Date(1994, 5, 30))).toBe('31 years');
  });

  it('shows months and days when under one year old', () => {
    expect(getDisplayAge(new Date(2024, 9, 2))).toBe('11 months, 29 days');
    expect(getDisplayAge(new Date(2025, 3, 1))).toBe('6 months, 0 days');
    expect(getDisplayAge(new Date(2025, 8, 1))).toBe('1 month, 0 days');
  });

  it('shows days alone when under one month old', () => {
    expect(getDisplayAge(new Date(2025, 8, 21))).toBe('10 days');
    expect(getDisplayAge(new Date(2025, 8, 30))).toBe('1 day');
  });

  it('is empty for a future date of birth (caller falls back to the date)', () => {
    expect(getDisplayAge(new Date(2026, 0, 1))).toBe('');
  });

  // A stored date of birth is a calendar date (`YYYY-MM-DD`), and read as an
  // INSTANT it lands on UTC midnight — a day early west of Greenwich, and still
  // "the future" through the local morning east of it, where a baby born today
  // would show no age at all. These pass in every timezone only because the
  // string is read as a local calendar date.
  it('reads a calendar-date string as a local date, not a UTC instant', () => {
    expect(getDisplayAge('2025-10-01')).toBe('0 days'); // born today
    expect(getDisplayAge('2025-09-21')).toBe('10 days');
    expect(getDisplayAge('2025-04-01')).toBe('6 months, 0 days');
    expect(getDisplayAge('1994-06-30')).toBe('31 years');
  });
});
