import { DateUtils } from './DateUtils';

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
