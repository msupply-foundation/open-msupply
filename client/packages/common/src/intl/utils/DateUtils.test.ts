import { renderHookWithProvider } from '@common/utils';
import { DateUtils, useFormatDateTime } from './DateUtils';

describe('useFormatDateTime', () => {
  it('getNaiveDate returns start of day for local timezone regardless of time zone', () => {
    const timeZone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    const date = '2024-02-07';

    expect(
      DateUtils.getNaiveDate(date, undefined, undefined, timeZone)
        ?.toString()
        .slice(0, 24)
    ).toBe('Wed Feb 07 2024 00:00:00');
  });
});

describe('getDisplayAge', () => {
  jest.useFakeTimers().setSystemTime(new Date('2025-10-01'));
  const hookResult = renderHookWithProvider(() => useFormatDateTime());
  const { getDisplayAge } = hookResult.result.current;

  it('returns age in years when patient is over 1 year or 1 year old', () => {
    const dob = new Date('2016-02-01');
    const result = getDisplayAge(dob);
    expect(result).toBe('9 years');
  });

  it('returns age in years when patient is over 1 year or 1 year old', () => {
    const dob = new Date('2024-02-01');
    const result = getDisplayAge(dob);
    expect(result).toBe('1 year');
  });

  it('returns age in months and days when patient is less than 1 year old', () => {
    const dob1 = new Date('2025-09-01');
    expect(getDisplayAge(dob1)).toBe('1 month, 0 days');

    const dob3 = new Date('2024-10-02');
    expect(getDisplayAge(dob3)).toBe('11 months, 29 days');

    const dob4 = new Date('2025-04-01');
    expect(getDisplayAge(dob4)).toBe('6 months, 0 days');
  });

  it('returns age in days when patient is less than 1 month old', () => {
    const dob = new Date('2025-09-21');
    const result = getDisplayAge(dob);
    expect(result).toBe('10 days');

    const dob2 = new Date('2025-09-30');
    expect(getDisplayAge(dob2)).toBe('1 day');
  });

  it('returns an empty string if dob is not defined', () => {
    const dob = null;
    const result = getDisplayAge(dob);
    expect(result).toBe('');
  });

  afterAll(() => {
    jest.useRealTimers();
  });
});

describe('formatDaysFromToday', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-10-01'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const hookResult = renderHookWithProvider(() => useFormatDateTime());
  const { formatDaysFromToday } = hookResult.result.current;

  it('returns today when days is undefined', () => {
    expect(formatDaysFromToday(undefined)).toBe('2025-10-01');
  });

  it('returns today when days is 0', () => {
    expect(formatDaysFromToday(0)).toBe('2025-10-01');
  });

  it('returns (days) after today when days is defined ', () => {
    expect(formatDaysFromToday(5)).toBe('2025-10-06');
  });
});
