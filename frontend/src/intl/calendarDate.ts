import { addDays } from 'date-fns';

/*
 * Calendar days — the `YYYY-MM-DD` values the server sends as `NaiveDate`
 * (a date of birth, a batch expiry, a dose's suggested date) and the date
 * fields exchange. A calendar day has no time and no zone: 1 October is
 * 1 October wherever it is read. This module is the one place that converts
 * between that string and a JS `Date`, and every conversion reads and writes
 * the LOCAL day (device timezone), so the two directions are symmetric.
 *
 * The trap it exists to close: `new Date('2025-10-01')` parses a bare day as
 * UTC MIDNIGHT (ES spec), which is the evening of 30 September anywhere west
 * of Greenwich. Formatting that Date shows the day before. Never hand a bare
 * day to `new Date(...)` or `Date.parse` — go through {@link isoDateToDate} or
 * {@link wireToDate}.
 *
 * No locale and no formatting here (that's formatDateTime.ts), and no Solid:
 * plain functions any layer can import.
 */

const pad = (n: number): string => String(n).padStart(2, '0');

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Whether `value` is a bare calendar day, `YYYY-MM-DD` (no time, no zone). */
export const isIsoDate = (value: unknown): value is string =>
  typeof value === 'string' && ISO_DATE.test(value);

/**
 * ISO calendar date `YYYY-MM-DD` → a local Date at midnight, or null for an
 * empty, malformed or impossible day (`2026-02-30` is refused rather than
 * rolled over into March).
 */
export const isoDateToDate = (iso: string | null | undefined): Date | null => {
  const parts = iso ? ISO_DATE.exec(iso) : null;
  if (!parts) return null;
  const [y, m, d] = parts.slice(1).map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
    ? date
    : null;
};

/** A local Date → ISO calendar date `YYYY-MM-DD` (its day in the device tz). */
export const dateToIsoDate = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Any date value from the server or a caller → a Date. A bare calendar day is
 * read as its LOCAL midnight; anything else (a timestamp, epoch ms, a Date) is
 * an instant and is read as one. The formatters all go through this, so a
 * `NaiveDate` shows the day it names and a `DateTime` shows the user's own
 * day and time.
 */
export const wireToDate = (value: Date | string | number): Date =>
  value instanceof Date
    ? value
    : (isoDateToDate(typeof value === 'string' ? value : null) ??
      new Date(value));

/**
 * The user's LOCAL calendar day right now, ISO `YYYY-MM-DD` (device tz) — the
 * "today" day-comparisons and date-input bounds measure against, so a store
 * off UTC never misclassifies its own today. Impure (reads the clock).
 */
export const localTodayIso = (): string => dateToIsoDate(new Date());

/** The LOCAL calendar day `days` before today, ISO `YYYY-MM-DD` (device tz). */
export const localIsoDaysAgo = (days: number): string =>
  dateToIsoDate(addDays(new Date(), -days));

/**
 * The calendar date one day before the given ISO date (YYYY-MM-DD →
 * YYYY-MM-DD). Used to turn an EXCLUSIVE "expires before X" cut-off into the
 * INCLUSIVE `beforeOrEqualTo` the stock-line/item filters take. An unparseable
 * date passes through unchanged.
 */
export const dayBefore = (isoDate: string): string => {
  const date = isoDateToDate(isoDate);
  return date ? dateToIsoDate(addDays(date, -1)) : isoDate;
};

/**
 * A local calendar day `YYYY-MM-DD` → its first instant (or inclusive last,
 * 23:59:59.999, with `{ endOfDay: true }`) as a UTC ISO instant, in the device
 * timezone (#456; ui-standards/list-views.md § Filters). The zoneless string
 * parses as local, so `toISOString()` gives the right instant — appending `Z`
 * to a bare day would read it in UTC, a day off for any device off UTC.
 */
export const localDayToUtc = (
  isoDate: string,
  opts?: { endOfDay?: boolean }
): string =>
  new Date(
    `${isoDate}T${opts?.endOfDay ? '23:59:59.999' : '00:00:00'}`
  ).toISOString();

/**
 * The inverse read-back: a stored UTC instant → the LOCAL calendar day it fell
 * on (device tz), so pick → store → display round-trips to the same day.
 * Never `.slice(0, 10)`: that reads the UTC day, off by one once the widened
 * instant crosses the date line. Empty/invalid → null.
 */
export const utcToLocalDay = (
  utc: string | null | undefined
): string | null => {
  if (!utc) return null;
  const d = new Date(utc);
  return Number.isNaN(d.getTime()) ? null : dateToIsoDate(d);
};

/**
 * The day-range slice of a GraphQL `DatetimeFilterInput` — inclusive UTC
 * bounds.
 */
export interface UtcDayBounds {
  afterOrEqualTo?: string | null;
  beforeOrEqualTo?: string | null;
}

/**
 * A picked local-day range → inclusive wire bounds (from = day start, to = day
 * end), either side optional; both empty → null (the "added but empty" marker).
 */
export const utcBoundsFromLocalDays = (
  start: string | null,
  end: string | null
): UtcDayBounds | null =>
  start || end
    ? {
        ...(start ? { afterOrEqualTo: localDayToUtc(start) } : {}),
        ...(end
          ? { beforeOrEqualTo: localDayToUtc(end, { endOfDay: true }) }
          : {}),
      }
    : null;

/**
 * A `Date` → an RFC3339 instant keeping the device's local offset (e.g.
 * `…09:30:15+13:00`) instead of `Z`, at SECONDS precision (no milliseconds) —
 * byte-for-byte the current app's `Formatter.localIsoString`. Same instant as
 * `localDayToUtc`, but the wire string shows the local calendar day on its
 * face. Use for a wire field whose input preserves the offset AND whose server
 * records the wire-local date — the inbound received-date write (input
 * `DateTime<FixedOffset>`; its `INVOICE_DATE_BACKDATED` log formats in the wire
 * offset, so a `Z` value logs the day before off UTC — server-verified).
 * Elsewhere (filters, `DateTime<Utc>` inputs) only the instant matters, so use
 * `localDayToUtc`.
 */
export const dateToOffsetIso = (d: Date): string => {
  const offsetMinutes = -d.getTimezoneOffset(); // minutes east of UTC
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  return (
    `${dateToIsoDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
};
