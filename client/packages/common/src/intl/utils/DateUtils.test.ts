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
  const hookResult = renderHookWithProvider(() => useFormatDateTime());
  const { getDisplayAge } = hookResult.result.current;
  const today = new Date();

  it('returns age in years when patient is over 1 year or 1 year old', () => {
    const dob = DateUtils.addYears(today, -9);
    const result = getDisplayAge(dob);
    expect(result).toBe('9');
  });

  it('returns age in months and days when patient is less than 1 year old', () => {
    const threeMonthsAgo = DateUtils.addMonths(today, -3);
    const dayOffset =
      DateUtils.getDaysInMonth(today) -
      DateUtils.getDaysInMonth(threeMonthsAgo);
    const dob = DateUtils.addDays(threeMonthsAgo, -2);
    const result = getDisplayAge(dob);
    expect(result).toBe(`3 months, ${2 + dayOffset} days`);
  });

  it('returns age in days when patient is less than 1 month old', () => {
    const dob = DateUtils.addDays(today, -10);
    const result = getDisplayAge(dob);
    expect(result).toBe('10 days');
  });

  it('returns an empty string if dob is not defined', () => {
    const dob = null;
    const result = getDisplayAge(dob);
    expect(result).toBe('');
  });
});
