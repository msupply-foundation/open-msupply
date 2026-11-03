import { describe, expect, it } from 'vitest';
import { setLocale, type SupportedLocale } from '../../../intl';
import {
  DATE_FNS_LOADERS,
  loadDateFnsLocale,
} from '../../../intl/formatDateTime';
import {
  addDays,
  defaultDateFormat,
  formatIsoDate,
  formatPlaceholder,
  parseDateInput,
  startOfWeek,
} from './dateTimeConvert';

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

// The fields' default format is NUMERIC (#774; ui-standards/inputs.md § Dates &
// times): a spelled-out month (`19 Sep 2026`) is not what a date field shows or
// hints, and the English default is the day-first `dd/MM/yyyy`. The app
// language is English here (the intl module's default), so these pin the
// English shape; the per-language pattern is formatDateTime's test.
describe('default date format (numeric, #774)', () => {
  it('is dd/MM/yyyy in English', () => {
    expect(defaultDateFormat()).toBe('dd/MM/yyyy');
  });

  it('renders a value as digits only, zero-padded', () => {
    expect(formatIsoDate('2026-09-19')).toBe('19/09/2026');
    expect(formatIsoDate('2026-01-05')).toBe('05/01/2026');
  });

  it('hints the empty field as DD/MM/YYYY', () => {
    expect(formatPlaceholder(defaultDateFormat())).toBe('DD/MM/YYYY');
  });

  it('parses the numeric form it shows, leniently about separators and padding', () => {
    expect(parseDateInput('19/09/2026')).toBe('2026-09-19');
    expect(parseDateInput('19-09-2026')).toBe('2026-09-19');
    expect(parseDateInput('19.9.26')).toBe('2026-09-19');
    expect(parseDateInput('5/1/2026')).toBe('2026-01-05');
  });

  it('still understands a typed month name, and rejects an impossible day', () => {
    expect(parseDateInput('19 Sep 2026')).toBe('2026-09-19');
    expect(parseDateInput('31/02/2026')).toBeUndefined();
  });

  it('an explicit format still wins over the default', () => {
    expect(formatIsoDate('2026-09-19', 'dd MMM yyyy')).toBe('19 Sep 2026');
    expect(formatIsoDate('2026-09-19', 'MM/dd/yyyy')).toBe('09/19/2026');
    expect(parseDateInput('09/19/2026', 'MM/dd/yyyy')).toBe('2026-09-19');
  });

  // Every language the app can be read in, so a date-fns locale added later is
  // covered too: its default must be one day, one month and one year token
  // between separators, and a date shown in it must read back as that day.
  it('round-trips the default of every language', async () => {
    const tokens = /yyyy|yy|MM|M|dd|d/g;
    try {
      for (const language of Object.keys(
        DATE_FNS_LOADERS
      ) as SupportedLocale[]) {
        await loadDateFnsLocale(language);
        setLocale(language);
        const pattern = defaultDateFormat();
        const kinds = (pattern.match(tokens) ?? []).map(token => token[0]);
        expect(kinds.sort(), `${language}: ${pattern}`).toEqual([
          'M',
          'd',
          'y',
        ]);
        expect(pattern.replace(tokens, ''), `${language}: ${pattern}`).toMatch(
          /^[^\p{L}]+$/u
        );
        const shown = formatIsoDate('2026-09-14');
        expect(parseDateInput(shown), `${language}: "${shown}"`).toBe(
          '2026-09-14'
        );
      }
    } finally {
      setLocale('en');
    }
  });
});
