import { LOCALE_META, type SupportedLocale } from './locales';
import { locale } from './intl';

const MAX_FRACTION_DIGITS = 10;

/*
 * Constructed formatters, keyed by locale + options — because `new
 * Intl.NumberFormat(...)` is expensive (it resolves the locale's numbering
 * data), and every caller below builds one per *value formatted*. Measured on
 * a Lenovo tablet (2026-08-04, the location-dropdown trace): 2.24s of a 30s
 * blocked frame was this constructor alone — ~0.45ms × ~5,000 calls, one per
 * option in a single dropdown. Reuse is safe: an Intl.NumberFormat is
 * immutable and `.format()` holds no state.
 *
 * Keyed on the options sorted by name, so callers spreading options in
 * different orders still share an entry. Cardinality is bounded by the code,
 * not the data — option shapes come from call sites (a few fraction-digit and
 * currency combinations), so the map settles at a few dozen entries.
 * `plural.ts` caches Intl.PluralRules the same way.
 */
const formatCache = new Map<string, Intl.NumberFormat>();

const cacheKey = (
  numberLocale: string,
  options?: Intl.NumberFormatOptions
): string => {
  if (!options) return numberLocale;
  // Undefined values are dropped rather than stringified: Intl treats an
  // explicit `undefined` as absent, so `{minimumFractionDigits: undefined}`
  // must hit the same entry as `{}` — otherwise `formatNumber`, which always
  // passes the key through, would miss the cache on every call.
  const parts = Object.entries(options)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([name, value]) => `${name}=${String(value)}`);
  return `${numberLocale}|${parts.join('|')}`;
};

// Intl.NumberFormat keyed by the locale's number override (so digit systems —
// e.g. Arabic-Indic for `ar` — render correctly rather than defaulting to
// Latin). This is the single place NumberFormat is constructed for the app.
export const intlNumberFormat = (
  locale: SupportedLocale,
  options?: Intl.NumberFormatOptions
): Intl.NumberFormat => {
  const numberLocale = LOCALE_META[locale].numberLocale;
  const key = cacheKey(numberLocale, options);
  const cached = formatCache.get(key);
  if (cached) return cached;
  const format = new Intl.NumberFormat(numberLocale, options);
  formatCache.set(key, format);
  return format;
};

/**
 * Number formatting bound to the current locale (reactive). Returns plain
 * functions rather than a hook object, matching the app's direct-call style;
 * read `locale()` inside each so callers used within an effect stay reactive.
 */
export const formatNumber = (
  value: number | undefined | null,
  options?: Intl.NumberFormatOptions & { locale?: SupportedLocale }
): string => {
  if (value === undefined || value === null) return '';
  const active = options?.locale ?? locale();

  const {
    maximumFractionDigits = MAX_FRACTION_DIGITS,
    minimumFractionDigits,
    locale: _ignored,
    ...rest
  } = options ?? {};

  return intlNumberFormat(active, {
    ...rest,
    minimumFractionDigits,
    // The browser throws if max < min; raise max to min when needed.
    maximumFractionDigits:
      minimumFractionDigits !== undefined &&
      maximumFractionDigits < minimumFractionDigits
        ? minimumFractionDigits
        : maximumFractionDigits,
  }).format(value);
};

export const round = (value: number | undefined | null, dp = 0): string => {
  if (value === undefined || value === null) return '';
  return intlNumberFormat(locale(), {
    maximumFractionDigits: Math.max(0, Math.min(dp, MAX_FRACTION_DIGITS)),
  }).format(value);
};

/**
 * Round to `decimals` places and return a NUMBER — for arithmetic, where
 * `round` above returns a formatted string for display.
 *
 * Needed wherever a derived money figure is stored or compared rather than just
 * shown: binary floats make `1.56 - 2` land on 0.43999999999999995, and storing
 * that (or testing it for equality) is a defect the display layer hides.
 * `Math.round` is half-away-from-zero, matching the reference client's NumUtils.
 */
export const roundTo = (value: number, decimals: number): number => {
  const factor = 10 ** Math.max(0, Math.min(decimals, MAX_FRACTION_DIGITS));
  const rounded = Math.round(value * factor) / factor;
  // Normalise negative zero: rounding a tiny negative residue yields -0, which
  // stores as "-0" and formats as "-0.00".
  return rounded === 0 ? 0 : rounded;
};

/**
 * The characters a locale uses to write a number — what NumberField (and the
 * coming Currency field) needs to gate keystrokes and parse user text. Derived
 * from formatToParts rather than hard-coded per locale, so adding a locale to
 * LOCALE_META can't silently desync the input layer.
 */
export type NumberSymbols = {
  decimal: string;
  group: string;
  minusSign: string;
};

const symbolsCache = new Map<string, NumberSymbols>();

export const getNumberSymbols = (locale: SupportedLocale): NumberSymbols => {
  const key = LOCALE_META[locale].numberLocale;
  const cached = symbolsCache.get(key);
  if (cached) return cached;
  const parts = intlNumberFormat(locale, {
    useGrouping: true,
  }).formatToParts(-12345.6);
  const part = (type: Intl.NumberFormatPartTypes, fallback: string) =>
    parts.find(p => p.type === type)?.value ?? fallback;
  const symbols: NumberSymbols = {
    decimal: part('decimal', '.'),
    group: part('group', ','),
    minusSign: part('minusSign', '-'),
  };
  symbolsCache.set(key, symbols);
  return symbols;
};

// Parse a locale-formatted number string back to a Number. Strips grouping
// separators, normalises the decimal char, converts non-Latin digits to Latin,
// and drops anything else. Returns NaN on empty input.
const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
// The extended (Eastern) set Dari and Pashto render — a different code block
// from the Arabic-Indic digits above, so both need converting.
const EXTENDED_ARABIC_INDIC = '۰۱۲۳۴۵۶۷۸۹';
const toLatinDigits = (s: string): string =>
  s
    .replace(/[٠-٩]/g, d => String(ARABIC_INDIC.indexOf(d)))
    .replace(/[۰-۹]/g, d => String(EXTENDED_ARABIC_INDIC.indexOf(d)));

export const parseNumber = (
  numberString: string,
  decimalChar = '.'
): number => {
  const negative = numberString.trimStart().startsWith('-') ? -1 : 1;
  const latin = toLatinDigits(numberString);
  // Where the locale's decimal separator isn't `.`, a `.` can only be a
  // grouping separator (Spanish and Portuguese group with it) — drop it before
  // normalising, or "1.234,5" parses as NaN.
  const grouped = decimalChar === '.' ? latin : latin.split('.').join('');
  const cleaned = grouped
    .replace(new RegExp(`\\${decimalChar}`, 'g'), '.')
    .replace(/[^\d.]/g, '');
  if (cleaned === '') return NaN;
  return Number(cleaned) * negative;
};
