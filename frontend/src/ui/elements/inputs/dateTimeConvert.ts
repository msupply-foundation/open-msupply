/*
 * Pure conversions shared by DateField / DateTimeField / TimeField. All local
 * arithmetic uses the device timezone (see ui-standards/inputs.md § Dates &
 * times); no date library — plain JS Date, so nothing is added to the bundle.
 * Month names follow the APP language (`locale()`, an accepted src/intl
 * boundary import like NumberField's — src/ui/CLAUDE.md), not the device
 * locale: a French UI shows "juil.", whatever the OS is set to.
 */

import { locale } from '../../../intl';

const pad = (n: number): string => String(n).padStart(2, '0');

/** ISO calendar date `YYYY-MM-DD` → a local Date at midnight, or null. */
export const isoDateToDate = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** A local Date → ISO calendar date `YYYY-MM-DD` (device tz). */
export const dateToIsoDate = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * A stored UTC instant → the local `{ date: 'YYYY-MM-DD', time: 'HH:mm' }` the
 * combined field edits (device tz). Empty/invalid → null.
 */
export const utcToLocalParts = (
  utc: string | null | undefined
): { date: string; time: string } | null => {
  if (!utc) return null;
  const d = new Date(utc);
  if (Number.isNaN(d.getTime())) return null;
  return {
    date: dateToIsoDate(d),
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
};

/**
 * Local date `YYYY-MM-DD` + time `HH:mm` (device tz) → UTC ISO instant. A
 * datetime string with no zone is parsed as local (ES spec), so `toISOString()`
 * gives the right UTC instant. No date → null (an instant needs a day); a blank
 * time defaults to midnight.
 */
export const localPartsToUtc = (
  dateIso: string,
  timeHHmm: string
): string | null => {
  if (!dateIso) return null;
  const d = new Date(`${dateIso}T${timeHHmm || '00:00'}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
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
export const utcToLocalDay = (utc: string | null | undefined): string | null =>
  utcToLocalParts(utc)?.date ?? null;

/** The day-range slice of a GraphQL `DatetimeFilterInput` — inclusive UTC bounds. */
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
 * `…+13:00`) instead of `Z`. Same instant as `localDayToUtc`, but the wire
 * string shows the local calendar day on its face. Use for a wire field whose
 * input preserves the offset AND whose server records the wire-local date —
 * the inbound received-date write (input `DateTime<FixedOffset>`; its
 * `INVOICE_DATE_BACKDATED` log formats in the wire offset, so a `Z` value logs
 * the day before off UTC — server-verified). Elsewhere (filters, `DateTime<Utc>`
 * inputs) only the instant matters, so use `localDayToUtc`.
 */
export const dateToOffsetIso = (d: Date): string => {
  const offsetMinutes = -d.getTimezoneOffset(); // minutes east of UTC
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return (
    `${dateToIsoDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${ms}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
};

/**
 * The user's LOCAL calendar day right now, ISO `YYYY-MM-DD` (device tz) — the
 * "today" day-comparisons and date-input bounds measure against, so a store
 * off UTC never misclassifies its own today. Impure (reads the clock).
 */
export const localTodayIso = (): string => dateToIsoDate(new Date());

/** The LOCAL calendar day `days` before today, ISO `YYYY-MM-DD` (device tz). */
export const localIsoDaysAgo = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return dateToIsoDate(d);
};

/** A new `Date` `days` after `d` (negative goes back); device-local. */
export const addDays = (d: Date, days: number): Date => {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
};

/** The most recent Monday on or before `d` (ISO week start), as a new Date. */
export const startOfWeek = (d: Date): Date =>
  addDays(d, -((d.getDay() + 6) % 7)); // getDay(): 0 Sun … 6 Sat

/** Default display/parse format for the date fields (medium, day-first). */
export const DEFAULT_DATE_FORMAT = 'dd MMM yyyy';

const TOKEN = /yyyy|yy|MMMM|MMM|MM|M|dd|d/g;

/** Localised month names for the app language, `[short, long]` per month. */
const monthNames = (): { short: string; long: string }[] =>
  Array.from({ length: 12 }, (_, i) => ({
    short: new Date(2000, i, 1).toLocaleDateString(locale(), {
      month: 'short',
    }),
    long: new Date(2000, i, 1).toLocaleDateString(locale(), { month: 'long' }),
  }));

// Placeholder token letters per language — only the letters that differ from
// English (day/year initials): French jour/année → J/A; M (mois) coincides.
// Languages absent here (en, ar — the MUI convention keeps Latin tokens for
// ar) fall through to the English letters.
const PLACEHOLDER_LETTERS: Record<string, Record<string, string>> = {
  fr: { d: 'J', y: 'A' },
};

/**
 * A token `format` → the empty-field HINT the user sees (ui-standards/inputs.md
 * § Dates & times): the format's token letters localised to the app language
 * and presented UPPERCASE (`dd MMM yyyy` → `DD MMM YYYY`, French `JJ MMM
 * AAAA`) — never the raw format string, whose lowercase English mnemonics mean
 * nothing in French. Display-only: typed parsing still follows the format.
 */
export const formatPlaceholder = (format: string): string => {
  const language = locale().split('-')[0];
  const letters = PLACEHOLDER_LETTERS[language] ?? {};
  return format.replace(TOKEN, tok => {
    const letter = letters[tok[0]] ?? tok[0].toUpperCase();
    return letter.repeat(tok.length);
  });
};

/**
 * An ISO date `YYYY-MM-DD` → a display string per a token `format` (`d`, `dd`,
 * `M`, `MM`, `MMM`, `MMMM`, `yy`, `yyyy`; anything else is a literal). Month
 * names are in the app language. Empty/invalid → ''.
 */
export const formatIsoDate = (
  iso: string | null | undefined,
  format = DEFAULT_DATE_FORMAT
): string => {
  const d = isoDateToDate(iso);
  if (!d) return '';
  const names = monthNames();
  return format.replace(TOKEN, tok => {
    switch (tok) {
      case 'yyyy':
        return String(d.getFullYear());
      case 'yy':
        return pad(d.getFullYear() % 100);
      case 'MMMM':
        return names[d.getMonth()].long;
      case 'MMM':
        return names[d.getMonth()].short;
      case 'MM':
        return pad(d.getMonth() + 1);
      case 'M':
        return String(d.getMonth() + 1);
      case 'dd':
        return pad(d.getDate());
      case 'd':
        return String(d.getDate());
      default:
        return tok;
    }
  });
};

/**
 * Typed date text → ISO `YYYY-MM-DD`, interpreting the day/month/year ORDER
 * from `format`. Lenient about separators (`/ - .`, spaces) and month form
 * (numeric or a localised name). '' → null (cleared); anything unparseable or
 * out-of-range → undefined (invalid — the caller keeps the text for a fix).
 */
export const parseDateInput = (
  text: string,
  format = DEFAULT_DATE_FORMAT
): string | null | undefined => {
  const s = text.trim();
  if (!s) return null;

  // The order the three components appear in the format.
  const order: ('d' | 'M' | 'y')[] = [];
  format.replace(TOKEN, tok => {
    const kind = tok[0] === 'd' ? 'd' : tok[0] === 'M' ? 'M' : 'y';
    if (!order.includes(kind)) order.push(kind);
    return tok;
  });
  if (order.length !== 3) return undefined;

  // Parts: runs of digits or letters, in order (month names have letters).
  const parts = s.match(/\p{L}+|\d+/gu);
  if (!parts || parts.length !== 3) return undefined;

  const names = monthNames();
  let day = 0;
  let month = 0;
  let year = 0;
  for (let i = 0; i < 3; i++) {
    const part = parts[i];
    const kind = order[i];
    if (kind === 'M' && /\D/.test(part)) {
      const p = part.toLowerCase();
      const idx = names.findIndex(
        n =>
          n.short.toLowerCase() === p ||
          n.long.toLowerCase() === p ||
          n.long.toLowerCase().startsWith(p)
      );
      if (idx === -1) return undefined;
      month = idx + 1;
    } else if (/^\d+$/.test(part)) {
      const n = Number(part);
      if (kind === 'd') day = n;
      else if (kind === 'M') month = n;
      else year = n;
    } else {
      return undefined;
    }
  }

  if (year < 100) year += year < 70 ? 2000 : 1900; // 2-digit year
  const date = new Date(year, month - 1, day);
  // Reject overflow (e.g. 31 Feb) — the constructed date must match the parts.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  )
    return undefined;
  return dateToIsoDate(date);
};

/** A `{ hour, minute }` time value (Kobalte TimeField's shape). */
export interface TimeValue {
  hour?: number;
  minute?: number;
}

/** `HH:mm` → `{ hour, minute }` (Kobalte's value), or undefined when empty. */
export const hhmmToTime = (
  hhmm: string | null | undefined
): TimeValue | undefined => {
  if (!hhmm) return undefined;
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return undefined;
  return { hour: h, minute: m };
};

/** A `{ hour, minute }` time → `HH:mm`, or null when either part is missing. */
export const timeToHhmm = (t: TimeValue | null | undefined): string | null => {
  if (!t || t.hour == null || t.minute == null) return null;
  return `${pad(t.hour)}:${pad(t.minute)}`;
};
