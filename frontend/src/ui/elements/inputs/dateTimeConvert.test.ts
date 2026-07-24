import { describe, expect, it } from 'vitest';
import {
  addDays,
  dateToOffsetIso,
  localDayToUtc,
  localIsoDaysAgo,
  localTodayIso,
  startOfWeek,
  utcBoundsFromLocalDays,
  utcToLocalDay,
} from './dateTimeConvert';

// The shared local-day ↔ UTC conversion (#456; ui-standards/list-views.md §
// Filters): a calendar day means the user's LOCAL day. Expected instants are
// built with the local Date constructor, so every assertion holds in any
// device timezone the suite runs in — asserting literal `...Z` strings would
// pin the suite to one zone and hide exactly the off-by-one this module kills.

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
    // In any zone with a non-zero offset the naive spelling `${day}T00:00:00Z`
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

describe('addDays / startOfWeek', () => {
  it('addDays moves forward and back, crossing month boundaries', () => {
    expect(addDays(new Date(2026, 6, 22), 30).getMonth()).toBe(7); // Jul → Aug
    expect(addDays(new Date(2026, 6, 1), -1).getDate()).toBe(30); // → Jun 30
  });

  it('addDays does not mutate its argument', () => {
    const d = new Date(2026, 6, 22);
    addDays(d, 5);
    expect(d.getDate()).toBe(22);
  });

  it('startOfWeek is the most recent Monday (ISO week); Monday is its own start', () => {
    expect(startOfWeek(new Date(2026, 6, 22)).getDate()).toBe(20); // Wed → Mon 20
    expect(startOfWeek(new Date(2026, 6, 20)).getDate()).toBe(20); // Mon → Mon
    expect(startOfWeek(new Date(2026, 6, 26)).getDate()).toBe(20); // Sun → Mon 20
    expect(startOfWeek(new Date(2026, 6, 22)).getDay()).toBe(1);
  });
});

describe('dateToOffsetIso (offset-preserving serialization)', () => {
  it('names the same instant as the UTC form but shows the LOCAL calendar day', () => {
    const d = new Date(2026, 6, 22, 9, 30, 15, 250);
    const iso = dateToOffsetIso(d);
    // Same instant on the wire...
    expect(new Date(iso).getTime()).toBe(d.getTime());
    // ...but the date on the string's face is the local day, whatever the zone
    // (this is what a wire-local-date server log reads).
    expect(iso.slice(0, 10)).toBe('2026-07-22');
    // The offset field is a well-formed ±HH:MM (or +00:00 under UTC).
    expect(iso).toMatch(/[+-]\d{2}:\d{2}$/);
  });

  it('round-trips through utcToLocalDay to the same local day, even at midnight', () => {
    const midnight = new Date(2026, 0, 1, 0, 0, 0, 0);
    expect(utcToLocalDay(dateToOffsetIso(midnight))).toBe('2026-01-01');
  });
});
