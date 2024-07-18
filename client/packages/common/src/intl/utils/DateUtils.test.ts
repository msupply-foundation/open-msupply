import { renderHookWithProvider } from '../../utils/testing';
import { useFormatDateTime } from './DateUtils';

describe('useFormatDateTime', () => {
  it('getLocalDateTime returns start of day for local timezone regardless of time zone', () => {
    const { result } = renderHookWithProvider(useFormatDateTime);
    const timeZone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    const date = '2024-02-07';

    expect(
      result.current
        .getLocalDate(date, undefined, undefined, timeZone)
        ?.toString()
        .slice(0, 24)
    ).toBe('Wed Feb 07 2024 00:00:00');
  });
});
