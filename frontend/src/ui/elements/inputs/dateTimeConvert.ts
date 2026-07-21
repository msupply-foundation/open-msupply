/*
 * Pure conversions shared by DateField / DateTimeField / TimeField. All local
 * arithmetic uses the device timezone (see ui-standards/inputs.md § Dates &
 * times); no date library — plain JS Date, so nothing is added to the bundle.
 */

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

/** Default display/parse format for the date fields (medium, day-first). */
export const DEFAULT_DATE_FORMAT = 'dd MMM yyyy';

const TOKEN = /yyyy|yy|MMMM|MMM|MM|M|dd|d/g;

/** Localised month names for the device locale, `[short, long]` per month. */
const monthNames = (): { short: string; long: string }[] =>
  Array.from({ length: 12 }, (_, i) => ({
    short: new Date(2000, i, 1).toLocaleDateString(undefined, {
      month: 'short',
    }),
    long: new Date(2000, i, 1).toLocaleDateString(undefined, { month: 'long' }),
  }));

/**
 * An ISO date `YYYY-MM-DD` → a display string per a token `format` (`d`, `dd`,
 * `M`, `MM`, `MMM`, `MMMM`, `yy`, `yyyy`; anything else is a literal). Month
 * names are in the device locale. Empty/invalid → ''.
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
