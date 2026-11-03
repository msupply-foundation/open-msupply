import { addDays } from 'date-fns';

/*
 * Two kinds of date value cross the wire, and they must never be mixed up:
 *
 * - A CALENDAR DATE is a day with no time and no zone: `YYYY-MM-DD`, the
 *   GraphQL `NaiveDate` scalar (a date of birth, a batch expiry, a dose's
 *   suggested date) and what a DateField holds. 1 October is 1 October
 *   wherever it is read, so it is never converted, only read and written as
 *   the LOCAL day.
 * - An INSTANT is one moment, the same everywhere: an RFC 3339 timestamp in
 *   UTC, the GraphQL `DateTime` scalar (created, received, sent). It is shown
 *   in the user's own zone.
 *
 * This module is the one place that converts between them and a JS `Date`.
 * The names say which kind goes in and which comes out (`calendarDateTo…`,
 * `instantTo…`, `…ToCalendarDate`), and "local" always means the device's
 * timezone.
 *
 * The trap it exists to close: `new Date('2025-10-01')` reads a calendar date
 * as an instant, UTC MIDNIGHT (ES spec), which is the evening of 30 September
 * anywhere west of Greenwich, so it shows as the day before (#1500). The
 * mirror trap on the way out is `date.toISOString().slice(0, 10)`, which
 * writes the UTC day: the day before for a local midnight east of Greenwich.
 * Never do either — go through {@link calendarDateToDate} and
 * {@link dateToCalendarDate}.
 *
 * No locale and no formatting here (that's formatDateTime.ts), and no Solid:
 * plain functions any layer can import.
 */

/** A calendar date, `YYYY-MM-DD`: GraphQL `NaiveDate`. No time, no zone. */
export type CalendarDate = string;

/** An instant, an RFC 3339 timestamp: GraphQL `DateTime`. */
export type Instant = string;

const pad = (n: number): string => String(n).padStart(2, '0');

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Whether `value` is a calendar date, `YYYY-MM-DD` (no time, no zone). */
export const isCalendarDate = (value: unknown): value is CalendarDate =>
  typeof value === 'string' && CALENDAR_DATE.test(value);

/**
 * A calendar date → a Date at its LOCAL midnight, or null for an empty,
 * malformed or impossible day (`2026-02-30` is refused rather than rolled
 * over into March).
 */
export const calendarDateToDate = (
  day: CalendarDate | null | undefined
): Date | null => {
  const parts = day ? CALENDAR_DATE.exec(day) : null;
  if (!parts) return null;
  const [y, m, d] = parts.slice(1).map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
    ? date
    : null;
};

/** A Date → the calendar date it falls on LOCALLY (device tz). */
export const dateToCalendarDate = (d: Date): CalendarDate =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * A value that may be either kind → a Date, for code that formats or compares
 * whatever it is given (the formatters, the expiry cell, the charts). A
 * calendar date is read as its LOCAL midnight; anything else (an instant,
 * epoch ms, a Date) is read as the moment it names. So a `NaiveDate` shows the
 * day it names and a `DateTime` shows the user's own day and time.
 */
export const calendarDateOrInstantToDate = (
  value: Date | CalendarDate | Instant | number
): Date =>
  value instanceof Date
    ? value
    : (calendarDateToDate(typeof value === 'string' ? value : null) ??
      new Date(value));

/**
 * Today's LOCAL calendar date (device tz) — what day comparisons and date-field
 * bounds measure against, so a store off UTC never misclassifies its own
 * today. Impure (reads the clock).
 */
export const todayCalendarDate = (): CalendarDate =>
  dateToCalendarDate(new Date());

/** The LOCAL calendar date `days` before today (device tz). */
export const calendarDateDaysAgo = (days: number): CalendarDate =>
  dateToCalendarDate(addDays(new Date(), -days));

/**
 * The calendar date before `day`. Used to turn an EXCLUSIVE "expires before X"
 * cut-off into the INCLUSIVE `beforeOrEqualTo` the stock-line/item filters
 * take. An unparseable value passes through unchanged.
 */
export const previousCalendarDate = (day: CalendarDate): CalendarDate => {
  const date = calendarDateToDate(day);
  return date ? dateToCalendarDate(addDays(date, -1)) : day;
};

/**
 * A calendar date → the instant its LOCAL day starts (or, with
 * `{ endOfDay: true }`, its inclusive last instant, 23:59:59.999), in UTC
 * (#456; ui-standards/list-views.md § Filters). For filtering a `DateTime`
 * field by a picked day. The zoneless string parses as local, so
 * `toISOString()` gives the right instant — appending `Z` would read the day
 * in UTC, a day off for any device off UTC.
 */
export const calendarDateToInstant = (
  day: CalendarDate,
  opts?: { endOfDay?: boolean }
): Instant =>
  new Date(
    `${day}T${opts?.endOfDay ? '23:59:59.999' : '00:00:00'}`
  ).toISOString();

/**
 * The inverse: an instant → the calendar date it falls on LOCALLY, so pick →
 * store → display round-trips to the same day. Never `.slice(0, 10)`: that
 * reads the UTC day, off by one once the instant crosses the date line.
 * Empty/invalid → null.
 */
export const instantToCalendarDate = (
  instant: Instant | null | undefined
): CalendarDate | null => {
  if (!instant) return null;
  const d = new Date(instant);
  return Number.isNaN(d.getTime()) ? null : dateToCalendarDate(d);
};

/** Inclusive UTC bounds: the day-range slice of a `DatetimeFilterInput`. */
export interface InstantBounds {
  afterOrEqualTo?: Instant | null;
  beforeOrEqualTo?: Instant | null;
}

/**
 * A picked range of calendar dates → inclusive instant bounds (from = start of
 * day, to = end of day), either side optional; both empty → null (the "added
 * but empty" marker).
 */
export const instantBoundsFromCalendarDates = (
  start: CalendarDate | null,
  end: CalendarDate | null
): InstantBounds | null =>
  start || end
    ? {
        ...(start ? { afterOrEqualTo: calendarDateToInstant(start) } : {}),
        ...(end
          ? { beforeOrEqualTo: calendarDateToInstant(end, { endOfDay: true }) }
          : {}),
      }
    : null;

/**
 * A Date → an instant written with the device's local offset (e.g.
 * `…09:30:15+13:00`) instead of `Z`, at SECONDS precision (no milliseconds) —
 * byte-for-byte the current app's `Formatter.localIsoString`. Same moment as
 * `calendarDateToInstant`, but the string shows the local calendar date on its
 * face. Use for a wire field whose input preserves the offset AND whose server
 * records the wire-local date — the inbound received-date write (input
 * `DateTime<FixedOffset>`; its `INVOICE_DATE_BACKDATED` log formats in the wire
 * offset, so a `Z` value logs the day before off UTC — server-verified).
 * Elsewhere (filters, `DateTime<Utc>` inputs) only the moment matters, so use
 * `calendarDateToInstant`.
 */
export const dateToOffsetInstant = (d: Date): Instant => {
  const offsetMinutes = -d.getTimezoneOffset(); // minutes east of UTC
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  return (
    `${dateToCalendarDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
};
