import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { setDictionaries, setLocale } from '../../intl/intl';
import commonEn from '../../intl/locales/en/common.json';
import { dateOfBirthWithAge, displayAge } from './age';

// A date of birth as the Simple dispensing screen states a chosen patient
// (spec/prescriptions ui-surface S9, OMS-REG-DIS-12.39): the date, then the
// age it gives in brackets by the patients age rule. "Today" is pinned so the
// age is deterministic.
beforeAll(() => {
  setDictionaries({ en: commonEn });
  setLocale('en');
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2025, 9, 1)); // 2025-10-01, local
});

afterAll(() => {
  vi.useRealTimers();
  setDictionaries({});
});

describe('dateOfBirthWithAge', () => {
  it('gives whole years in brackets after the date', () => {
    expect(dateOfBirthWithAge('1988-06-15')).toBe('15/06/1988 (37 years)');
  });

  it('gives months and days for a patient under a year old', () => {
    expect(dateOfBirthWithAge('2025-06-12')).toBe(
      '12/06/2025 (3 months, 19 days)'
    );
  });

  it('gives the date alone for a date of birth in the future', () => {
    expect(dateOfBirthWithAge('2026-01-01')).toBe('01/01/2026');
  });
});

// The search results' Age column (OMS-REG-DIS-01.81): the header's rule, not
// whole years, so a patient under a year old doesn't read 0.
describe('displayAge', () => {
  it('gives whole years from a year old', () => {
    expect(displayAge('1988-06-15')).toBe('37 years');
  });

  it('gives months and days for a patient under a year old', () => {
    expect(displayAge('2025-06-12')).toBe('3 months, 19 days');
    expect(displayAge('2025-09-21')).toBe('10 days');
  });

  it('is empty with no date of birth, or one in the future', () => {
    expect(displayAge(null)).toBe('');
    expect(displayAge('2026-01-01')).toBe('');
  });
});
