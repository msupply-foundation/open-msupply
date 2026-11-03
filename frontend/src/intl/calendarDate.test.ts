import { describe, expect, it } from 'vitest';
import {
  dateToIsoDate,
  dateToOffsetIso,
  dayBefore,
  isIsoDate,
  isoDateToDate,
  localDayToUtc,
  localIsoDaysAgo,
  localTodayIso,
  utcBoundsFromLocalDays,
  utcToLocalDay,
  wireToDate,
} from './calendarDate';

// A calendar day means the user's LOCAL day. Expected values are built with the
// local Date constructor, so every assertion holds in any device timezone the
// suite runs in — asserting literal `...Z` strings would pin the suite to one
// zone and hide exactly the off-by-one this module kills. The suite runs west
// of UTC by default (vitest.config.ts), where reading a day as UTC midnight
// lands on the day before, so a regression fails on every machine.

describe('isIsoDate', () => {
  it('is a bare YYYY-MM-DD and nothing else', () => {
    expect(isIsoDate('2025-10-01')).toBe(true);
    expect(isIsoDate('2025-10-01T00:00:00')).toBe(false);
    expect(isIsoDate('2025-10-01T00:00:00Z')).toBe(false);
    expect(isIsoDate('2025-1-1')).toBe(false);
    expect(isIsoDate('')).toBe(false);
    expect(isIsoDate(null)).toBe(false);
    expect(isIsoDate(20251001)).toBe(false);
  });
});

describe('isoDateToDate', () => {
  it('reads a day as its LOCAL midnight, never UTC midnight (#1500)', () => {
    const d = isoDateToDate('2025-10-01');
    expect(d?.getFullYear()).toBe(2025);
    expect(d?.getMonth()).toBe(9);
    expect(d?.getDate()).toBe(1);
    expect(d?.getHours()).toBe(0);
  });

  it('refuses an impossible day rather than rolling it over', () => {
    expect(isoDateToDate('2026-02-30')).toBeNull();
    expect(isoDateToDate('2026-13-01')).toBeNull();
    expect(isoDateToDate('2024-02-29')).not.toBeNull(); // leap year
  });

  it('empty, malformed or a timestamp → null', () => {
    expect(isoDateToDate(null)).toBeNull();
    expect(isoDateToDate(undefined)).toBeNull();
    expect(isoDateToDate('')).toBeNull();
    expect(isoDateToDate('not-a-date')).toBeNull();
    expect(isoDateToDate('2025-10-01T10:00:00Z')).toBeNull();
  });

  it('round-trips through dateToIsoDate', () => {
    for (const day of ['2025-10-01', '2026-01-01', '2025-12-31', '2024-02-29'])
      expect(dateToIsoDate(isoDateToDate(day)!)).toBe(day);
  });
});

describe('wireToDate', () => {
  it('reads a bare day as the local day it names (#1500)', () => {
    expect(dateToIsoDate(wireToDate('2025-10-01'))).toBe('2025-10-01');
    expect(wireToDate('2025-10-01').getTime()).toBe(
      new Date(2025, 9, 1).getTime()
    );
  });

  it('reads a timestamp as the instant it names', () => {
    const instant = '2025-10-01T03:15:00Z';
    expect(wireToDate(instant).getTime()).toBe(Date.parse(instant));
    expect(wireToDate('2025-10-01T03:15:00+00:00').getTime()).toBe(
      Date.parse(instant)
    );
  });

  it('passes a Date through and reads epoch milliseconds as an instant', () => {
    const d = new Date(2025, 9, 1, 15, 30);
    expect(wireToDate(d)).toBe(d);
    expect(wireToDate(d.getTime()).getTime()).toBe(d.getTime());
  });
});

describe('dateToIsoDate', () => {
  it('formats a local Date as zero-padded YYYY-MM-DD (its local calendar day)', () => {
    // Local components, so the day is the device's day whatever the zone — a
    // mid-day time can never slip to an adjacent UTC day.
    expect(dateToIsoDate(new Date(2026, 0, 5, 12, 0, 0))).toBe('2026-01-05');
    expect(dateToIsoDate(new Date(2026, 6, 22, 9, 30, 0))).toBe('2026-07-22');
  });
});

describe('localDayToUtc', () => {
  it('widens a day to its first LOCAL instant as a UTC instant', () => {
    expect(localDayToUtc('2026-07-15')).toBe(
      new Date(2026, 6, 15, 0, 0, 0, 0).toISOString()
    );
  });

  it('endOfDay widens to the inclusive LOCAL last instant (23:59:59.999)', () => {
    expect(localDayToUtc('2026-07-15', { endOfDay: true })).toBe(
      new Date(2026, 6, 15, 23, 59, 59, 999).toISOString()
    );
  });

  it('is the local day, not the UTC day (they differ off UTC)', () => {
    // In any zone with a non-zero offset the naive string `${day}T00:00:00Z`
    // names a different instant than the local start of day. Guard the
    // relationship rather than a zone-specific literal.
    const naive = '2026-07-15T00:00:00.000Z';
    const local = localDayToUtc('2026-07-15');
    const offsetMinutes = new Date(2026, 6, 15).getTimezoneOffset();
    if (offsetMinutes === 0) expect(local).toBe(naive);
    else expect(local).not.toBe(naive);
    // Whatever the zone, the emitted instant is exactly the naive one shifted
    // by the local offset.
    expect(new Date(local).getTime() - new Date(naive).getTime()).toBe(
      offsetMinutes * 60_000
    );
  });
});

describe('utcToLocalDay', () => {
  it('reads a stored instant back as the LOCAL calendar day', () => {
    expect(utcToLocalDay(new Date(2026, 6, 15, 12, 30).toISOString())).toBe(
      '2026-07-15'
    );
  });

  it('round-trips pick → store → display to the same day, both bounds', () => {
    expect(utcToLocalDay(localDayToUtc('2026-07-15'))).toBe('2026-07-15');
    expect(utcToLocalDay(localDayToUtc('2026-07-15', { endOfDay: true }))).toBe(
      '2026-07-15'
    );
    // Year boundary — the widened instants most likely to cross the date line.
    expect(utcToLocalDay(localDayToUtc('2026-01-01'))).toBe('2026-01-01');
    expect(utcToLocalDay(localDayToUtc('2025-12-31', { endOfDay: true }))).toBe(
      '2025-12-31'
    );
  });

  it('empty or invalid → null', () => {
    expect(utcToLocalDay(null)).toBeNull();
    expect(utcToLocalDay(undefined)).toBeNull();
    expect(utcToLocalDay('')).toBeNull();
    expect(utcToLocalDay('not-a-date')).toBeNull();
  });
});

describe('utcBoundsFromLocalDays (the whole widening policy)', () => {
  it('widens from → local day start, to → local day end', () => {
    expect(utcBoundsFromLocalDays('2026-07-15', '2026-07-16')).toEqual({
      afterOrEqualTo: new Date(2026, 6, 15).toISOString(),
      beforeOrEqualTo: new Date(2026, 6, 16, 23, 59, 59, 999).toISOString(),
    });
  });

  it('either side may be open', () => {
    expect(utcBoundsFromLocalDays('2026-07-15', null)).toEqual({
      afterOrEqualTo: new Date(2026, 6, 15).toISOString(),
    });
    expect(utcBoundsFromLocalDays(null, '2026-07-16')).toEqual({
      beforeOrEqualTo: new Date(2026, 6, 16, 23, 59, 59, 999).toISOString(),
    });
  });

  it('both empty → null (the added-but-empty chip marker)', () => {
    expect(utcBoundsFromLocalDays(null, null)).toBeNull();
  });

  it('round-trips through utcToLocalDay to the picked days', () => {
    const bounds = utcBoundsFromLocalDays('2025-12-31', '2026-01-01');
    expect(utcToLocalDay(bounds?.afterOrEqualTo)).toBe('2025-12-31');
    expect(utcToLocalDay(bounds?.beforeOrEqualTo)).toBe('2026-01-01');
  });
});

describe('local today', () => {
  it('localTodayIso / localIsoDaysAgo are ISO calendar days', () => {
    expect(localTodayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(localIsoDaysAgo(30)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('localIsoDaysAgo(N) is earlier than today', () => {
    expect(localIsoDaysAgo(1) < localTodayIso()).toBe(true);
  });
});

describe('dateToOffsetIso (offset-preserving serialization)', () => {
  it('serializes to SECONDS precision with the local offset — no milliseconds (matches OMS localIsoString)', () => {
    const d = new Date(2026, 6, 22, 9, 30, 15, 250);
    const iso = dateToOffsetIso(d);
    // Local date + time to the second, then a ±HH:MM offset — no `.mmm`.
    // (Local components come from the Date's own fields, so this holds in any
    // device zone; only the offset varies.)
    expect(iso).toMatch(/^2026-07-22T09:30:15[+-]\d{2}:\d{2}$/);
    // The date on the string's face is the local day a wire-local server log
    // reads.
    expect(iso.slice(0, 10)).toBe('2026-07-22');
    // Same instant, to the second (sub-second dropped, like OMS).
    expect(Math.floor(new Date(iso).getTime() / 1000)).toBe(
      Math.floor(d.getTime() / 1000)
    );
  });

  it('round-trips through utcToLocalDay to the same local day, even at midnight', () => {
    const midnight = new Date(2026, 0, 1, 0, 0, 0, 0);
    expect(utcToLocalDay(dateToOffsetIso(midnight))).toBe('2026-01-01');
  });
});

// Pure calendar-date arithmetic on ISO strings (no time, no zone) — assertions
// are literal, and hold in any device timezone because the shared conversion
// parses and formats the LOCAL calendar day symmetrically.
describe('dayBefore', () => {
  it('is the previous calendar day', () => {
    expect(dayBefore('2026-07-15')).toBe('2026-07-14');
  });

  it('rolls back across month and year boundaries', () => {
    expect(dayBefore('2026-03-01')).toBe('2026-02-28');
    expect(dayBefore('2024-03-01')).toBe('2024-02-29'); // leap year
    expect(dayBefore('2026-01-01')).toBe('2025-12-31');
  });

  it('passes an unparseable date through unchanged', () => {
    expect(dayBefore('not-a-date')).toBe('not-a-date');
  });
});
