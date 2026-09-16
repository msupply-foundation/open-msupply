import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  customDate,
  exportDate,
  getDisplayAge,
  loadDateFnsLocale,
  localisedDate,
  localisedDateTime,
  localisedTime,
  localisedTimeAgo,
} from './formatDateTime';
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

/*
 * The sync cell's relative-time ladder (spec/chrome § sync status,
 * OMS-REG-FTR-03.23). `now` is passed explicitly rather than read off the fake
 * clock, because the caller ticks its own minutely `now` signal and the
 * formatter must age against THAT — a formatter reading the wall clock would
 * disagree with the re-render that produced it.
 */
describe('localisedTimeAgo — the sync line’s timing half', () => {
  const now = new Date(2025, 9, 1, 12, 0, 0); // 2025-10-01 12:00 local
  const ago = (ms: number) =>
    localisedTimeAgo(new Date(now.getTime() - ms), now);
  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;

  it('says "just now" under a minute — a count of seconds is noise', () => {
    expect(ago(0)).toBe('just now');
    expect(ago(45 * SECOND)).toBe('just now');
    expect(ago(59 * SECOND)).toBe('just now');
  });

  it('counts minutes in the narrow form, not the long one', () => {
    expect(ago(MINUTE)).toBe('1 min ago');
    expect(ago(2 * MINUTE)).toBe('2 min ago');
    // Truncates rather than rounds: a 119-second-old sync has not been 2
    // minutes, and a status line must never overstate the age.
    expect(ago(119 * SECOND)).toBe('1 min ago');
    expect(ago(59 * MINUTE)).toBe('59 min ago');
  });

  it('switches to hours at the hour', () => {
    expect(ago(HOUR)).toBe('1 hr ago');
    expect(ago(3 * HOUR)).toBe('3 hr ago');
    expect(ago(23 * HOUR)).toBe('23 hr ago');
  });

  it('names yesterday as a word, then gives up on relative entirely', () => {
    expect(ago(24 * HOUR)).toBe('yesterday'); // 2025-09-30 12:00
    expect(ago(6 * 24 * HOUR)).toBe('25 Sep');
    expect(ago(48 * HOUR)).toBe('29 Sep');
  });

  it('treats "yesterday" as a CALENDAR day, not a 24-hour window', () => {
    // 30 hours before midday is the previous date, so it IS yesterday…
    expect(
      localisedTimeAgo(new Date(2025, 9, 1, 6, 0), new Date(2025, 9, 2, 12, 0))
    ).toBe('yesterday');
    // …but 30 hours before 06:00 is two dates back, and must not claim to be.
    expect(
      localisedTimeAgo(new Date(2025, 9, 1, 0, 0), new Date(2025, 9, 2, 6, 0))
    ).toBe('yesterday');
    expect(
      localisedTimeAgo(new Date(2025, 8, 30, 20, 0), new Date(2025, 9, 2, 6, 0))
    ).toBe('30 Sep');
  });

  it('reads a clock skewed into the future as the present, never a countdown', () => {
    expect(localisedTimeAgo(new Date(now.getTime() + 5 * MINUTE), now)).toBe(
      'just now'
    );
  });
});

describe('digit systems match the numbers beside them', () => {
  // date-fns emits Latin digits in every language, while the numbers on the
  // same row go through Intl with the locale's own numbering system — so an
  // Arabic row read `٤٠%` battery beside a `06/09/2026` date, two scripts in
  // one line (cold-chain sensors exploratory run, CCS-20260911-F8).
  const AT = new Date(2026, 8, 6, 21, 20);

  afterAll(() => setLocale('en'));

  it('renders an Arabic date and time in Arabic-Indic digits', async () => {
    await loadDateFnsLocale('ar');
    setLocale('ar');
    expect(localisedDate(AT)).toMatch(/[٠-٩]/);
    expect(localisedDate(AT)).not.toMatch(/[0-9]/);
    expect(localisedTime(AT)).not.toMatch(/[0-9]/);
    expect(localisedDateTime(AT)).not.toMatch(/[0-9]/);
  });

  it('leaves a Latin-digit locale exactly as date-fns wrote it', async () => {
    setLocale('en');
    expect(localisedDate(AT)).toBe('06/09/2026');
    // Load French before asserting French: an absent date-fns locale falls
    // back to en-GB, which would pass this without ever formatting in fr.
    await loadDateFnsLocale('fr');
    setLocale('fr');
    expect(localisedDate(AT)).toMatch(/^[0-9]{2}\/[0-9]{2}\/[0-9]{4}$/);
  });

  it('leaves an explicit pattern in Latin digits — it is not for reading', async () => {
    await loadDateFnsLocale('ar');
    setLocale('ar');
    expect(customDate(AT, 'yyyy-MM-dd')).toBe('2026-09-06');
  });

  it('keeps a date bound for a FILE in Latin digits', async () => {
    // The CSV exports: the figures beside the date in the same row are raw
    // values that never went through Intl, and a spreadsheet meeting
    // Arabic-Indic digits in a date column reads the column as text.
    await loadDateFnsLocale('ar');
    setLocale('ar');
    expect(localisedDate(AT)).not.toMatch(/[0-9]/);
    expect(exportDate(AT)).toBe('06/09/2026');
  });

  it('reads one digit system across every rung of “how long ago”', async () => {
    // The rungs come from two different tag tables: INTL_TAGS names a
    // LANGUAGE, and ICU resolves a bare `ar` to Latin digits, while
    // numberLocale pins Arabic to `ar-u-nu-arab`. Unmapped, an Arabic
    // indicator reads `قبل 3 ساعات` for three hours and `١٤ أغسطس` once it
    // ages past a day — one indicator, two digit systems, an hour apart.
    await loadDateFnsLocale('ar');
    setLocale('ar');
    const now = new Date(2026, 8, 6, 21, 20);
    const ago = (ms: number) =>
      localisedTimeAgo(new Date(now.getTime() - ms), now);

    const MIN = 60_000;
    expect(ago(3 * 60 * MIN)).not.toMatch(/[0-9]/); // hours
    expect(ago(45 * MIN)).not.toMatch(/[0-9]/); // minutes
    expect(ago(40 * 24 * 60 * MIN)).not.toMatch(/[0-9]/); // "14 Aug"
    // And a Latin locale is still untouched on every rung.
    setLocale('en');
    expect(ago(3 * 60 * MIN)).toBe('3 hr ago');
  });
});
