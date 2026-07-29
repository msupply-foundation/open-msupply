import { formatNumber } from '../../../intl/formatNumber';
import { t } from '../../../intl';

// Pure display logic for item statistics (spec/items rules "item statistics",
// ui-surface S1 columns + S2 statistics band). Colocated + pure so the
// blank-at-zero-AMC rule and the doses gate are unit-tested
// (OMS-REG-CAT-04.34/.35) without the screens.

const EMPTY_CELL = '—';

// Months of stock: the wire value is null when AMC is 0 (the figure is
// undefined, not zero/∞). The list renders that absence as a dash — NEVER 0
// (OMS-REG-CAT-04.34). A real value is locale-formatted to two decimals.
export const formatMonthsOfStock = (
  monthsOfStockOnHand: number | null | undefined
): string =>
  monthsOfStockOnHand == null
    ? EMPTY_CELL
    : formatNumber(monthsOfStockOnHand, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

// A plain unit statistic (stock on hand, AMC), locale-formatted with thousands
// separators. `decimals` lets AMC show two decimals while stock-on-hand rounds.
export const formatUnits = (value: number, decimals = 0): string =>
  formatNumber(value, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

// The doses equivalent of a unit figure for a vaccine item = units × the item's
// doses-per-unit (display-only; there is no stored doses fact — OMS-REG-CAT-04.35).
export const dosesEquivalent = (units: number, dosesPerUnit: number): number =>
  units * dosesPerUnit;

// The doses display gates on BOTH the manage-vaccines-in-doses preference AND
// the row being a vaccine item (OMS-REG-CAT-04.35). Non-vaccine items and the
// preference-off state show plain units.
export const shouldShowDoses = (
  isVaccine: boolean,
  manageVaccinesInDoses: boolean
): boolean => isVaccine && manageVaccinesInDoses;

// Numeric list cells: a value with more than two decimals renders truncated to
// two with a literal trailing "…" (the full-precision value rides the cell's
// hover title). Captured as-is from the reference list (ui-surface S1).
export const truncateToTwoDecimals = (
  value: number
): { text: string; truncated: boolean } => {
  // The reference renders the value ROUNDED to two decimals (666.6666… →
  // 666.67) with a trailing "…" flagging the dropped precision (the full value
  // rides the hover). `truncated` = the value carried more than two decimals.
  const truncated = Math.round(value * 100) / 100 !== value;
  const text =
    formatNumber(value, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }) + (truncated ? '…' : '');
  return { text, truncated };
};

// Every digit of a value, for the hover reading behind a truncated cell —
// locale-formatted (so the decimal separator is the reader's) but never
// rounded.
const fullPrecision = (value: number): string =>
  formatNumber(value, { maximumFractionDigits: 20 });

/** What a truncating numeric cell renders: its text, and the hover reading. */
export type StatCell = {
  /** The cell's text — at most two decimals, "…" when precision was dropped. */
  text: string;
  /**
   * The full-precision reading for the cell's hover title, or undefined when
   * `text` already shows every digit (nothing to reveal).
   */
  title?: string;
};

// A unit figure formatted for a list cell (stock-on-hand, AMC): the
// numeric-cell rule — at most two decimals, a trailing "…" when precision
// drops AND the full-precision value in the cell's hover text (ui-surface S1 §
// numeric cells, ui-surface.md:47) — so AMC renders 0.33, not a rounded 0, and
// 666.67… still reveals 666.6666666667. The doses equivalent is appended
// (suffix "ds") when the manage-vaccines-in-doses preference is on AND the row
// is a vaccine (OMS-REG-CAT-04.35); the hover then carries both sides at full
// precision. Pure (structural row) so the formatting is unit-tested without
// the column/table stack.
export const unitsWithDoses = (
  units: number,
  row: { isVaccine: boolean; doses: number },
  showDoses: boolean
): StatCell => {
  const base = truncateToTwoDecimals(units);
  if (!showDoses || !row.isVaccine)
    return {
      text: base.text,
      title: base.truncated ? fullPrecision(units) : undefined,
    };

  const doses = dosesEquivalent(units, row.doses);
  const dosesCell = truncateToTwoDecimals(doses);
  const suffix = t('label.doses-short');
  return {
    text: `${base.text} (${dosesCell.text} ${suffix})`,
    // Either side losing precision earns the hover, and it shows BOTH in full
    // so the reading matches the cell it explains.
    title:
      base.truncated || dosesCell.truncated
        ? `${fullPrecision(units)} (${fullPrecision(doses)} ${suffix})`
        : undefined,
  };
};
