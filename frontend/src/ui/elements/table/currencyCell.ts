import { formatNumber } from '../../../intl/formatNumber';

// The currency-cell display rules (spec/ui-standards/tables.md § data-type
// alignment), kept JSX-free so vitest can exercise them in the node
// environment; the rendered cell (tooltip span) lives in tableHelpers.

// Symbol + two decimals by default (spec/ui-standards/conventions.md),
// locale-formatted. The currency code is fixed at USD — the current app's
// default store home currency — until store currency preferences are plumbed
// through; narrowSymbol keeps the symbol a bare "$" in the Latin-script
// locales (the current app's pattern) — ar has no CLDR narrow form and falls
// back to "US$".
export const formatCurrency = (
  value: number,
  maximumFractionDigits = 2
): string =>
  formatNumber(value, {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits,
  });

// Floating-point dust is not precision: 4.400000000000006 has no real third
// decimal. Tolerance matches the old app's NumUtils (spec/ui-standards/tables.md
// § data-type alignment — "float dust is not precision").
const isNearlyInteger = (value: number): boolean => {
  const tolerance = Math.max(1e-8, Number.EPSILON * Math.abs(value) * 10);
  return Math.abs(value - Math.round(value)) < tolerance;
};

const hasMoreThanTwoDp = (value: number): boolean => {
  if (!Number.isFinite(value)) return false;
  // Only inspect the fraction: for very large values, value * 100 loses the
  // fractional part to IEEE-754 precision limits.
  const abs = Math.abs(value);
  return !isNearlyInteger((abs - Math.trunc(abs)) * 100);
};

// An amount with real precision beyond 2 dp marks the rounding instead of
// hiding it (spec/ui-standards/tables.md § data-type alignment): below one
// cent → "< $0.01", otherwise the rounded amount + "...".
export const formatCurrencyCell = (
  value: number | null | undefined
): string => {
  if (value == null) return '';
  if (!hasMoreThanTwoDp(value)) return formatCurrency(value);
  return value > 0 && value < 0.01
    ? `< ${formatCurrency(0.01)}`
    : `${formatCurrency(value)}...`;
};
