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

// Parse a locale-formatted number string back to a Number. Strips grouping
// separators, normalises the decimal char, converts Arabic-Indic digits to
// Latin, and drops anything else. Returns NaN on empty input.
const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const toLatinDigits = (s: string): string =>
  s.replace(/[٠-٩]/g, d => String(ARABIC_INDIC.indexOf(d)));

export const parseNumber = (
  numberString: string,
  decimalChar = '.'
): number => {
  const negative = numberString.trimStart().startsWith('-') ? -1 : 1;
  const cleaned = toLatinDigits(numberString)
    .replace(new RegExp(`\\${decimalChar}`, 'g'), '.')
    .replace(/[^\d.]/g, '');
  if (cleaned === '') return NaN;
  return Number(cleaned) * negative;
};
