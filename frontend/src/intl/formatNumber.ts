import { LOCALE_META, type SupportedLocale } from './locales';
import { locale } from './intl';

const MAX_FRACTION_DIGITS = 10;

// Intl.NumberFormat keyed by the locale's number override (so digit systems —
// e.g. Arabic-Indic for `ar` — render correctly rather than defaulting to
// Latin). This is the single place NumberFormat is constructed for the app.
export const intlNumberFormat = (
  locale: SupportedLocale,
  options?: Intl.NumberFormatOptions
): Intl.NumberFormat =>
  new Intl.NumberFormat(LOCALE_META[locale].numberLocale, options);

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
