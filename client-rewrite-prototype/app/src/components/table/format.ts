/*
 * Number/date formatting for table cells — browser `Intl` only (zero bundle),
 * per Decision #3 (formatting is app-level, library-independent).
 */

/** Value shown for null/undefined cells — the app's UNDEFINED_STRING_VALUE. */
export const EMPTY = '—';

const EPSILON = 1e-9;

/** Does `value` carry more decimal places than `dp`? Drives the "…" more-precision hint. */
export const hasMoreThanDp = (value: number, dp: number): boolean => {
  const factor = 10 ** dp;
  return Math.abs(value * factor - Math.round(value * factor)) > EPSILON;
};

const numFmt = (max: number) =>
  new Intl.NumberFormat(undefined, {
    maximumFractionDigits: max,
    minimumFractionDigits: 0,
  });

/** Locale number with thousands separators, capped at `dp` decimals. */
export const formatNumber = (value: number, dp = 2): string =>
  numFmt(dp).format(value);

/** Full-precision (10 dp) form for the hover tooltip. */
export const formatNumberFull = (value: number): string => numFmt(10).format(value);

// Demo currency. The real app reads the store currency via useCurrency().
const currency = (max: number, min: number) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: max,
    minimumFractionDigits: min,
  });

export const formatCurrency = (value: number): string => currency(2, 2).format(value);
export const formatCurrencyFull = (value: number): string =>
  currency(10, 2).format(value);

/** Locale date (day-month-year in most locales), or empty for a bad/absent date. */
export const formatDate = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
};
