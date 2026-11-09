import {
  decimalPlaces,
  displayNumber,
  exactText,
  type DisplayedNumber,
} from '../../../intl/numberDisplay';
import { t } from '../../../intl';

// Pure display logic for item statistics (spec/items rules "item statistics",
// ui-surface S1 columns + S2 statistics band). Colocated + pure so the
// zero-AMC rule and the doses gate are unit-tested (OMS-REG-CAT-04.34/.35)
// without the screens. The two surfaces present a zero-AMC item differently —
// the list cell dashes, the band shows 0.00 — so each has its own formatter.

const EMPTY_CELL = '—';

// Months of stock for the DETAIL STATS BAND: PADDED to the configured decimal
// places, so the figure reads the same width every time in a band of headline
// numbers (ui-surface S2 § statistics band; ui-standards § display rounding),
// marked and hovered like any rounded figure. The wire value is null when AMC
// is 0 (the figure is undefined, not zero/∞) and the band renders that absence
// as zero, matching the reference app. The LIST CELL renders the same absence
// as a dash and takes the numeric-cell rule instead — see monthsOfStockCell.
export const formatMonthsOfStock = (
  monthsOfStockOnHand: number | null | undefined
): DisplayedNumber =>
  displayNumber(monthsOfStockOnHand ?? 0, decimalPlaces(), true);

// A plain unit statistic (stock on hand, AMC), locale-formatted with thousands
// separators and PADDED to `decimals`. The default is whole units: a count of
// units, doses or packs carries no fraction, and padding one reads as false
// precision. A fractional figure passes decimalPlaces() — the configured
// places (ui-standards § display rounding). A figure the padding rounded is
// marked and hovers its exact value.
export const formatUnits = (value: number, decimals = 0): DisplayedNumber =>
  displayNumber(value, decimals, true);

// The doses equivalent of a unit figure for a vaccine item = units × the item's
// doses-per-unit (display-only; there is no stored doses fact —
// OMS-REG-CAT-04.35).
export const dosesEquivalent = (units: number, dosesPerUnit: number): number =>
  units * dosesPerUnit;

// The doses display gates on BOTH the manage-vaccines-in-doses preference AND
// the row being a vaccine item (OMS-REG-CAT-04.35). Non-vaccine items and the
// preference-off state show plain units.
export const shouldShowDoses = (
  isVaccine: boolean,
  manageVaccinesInDoses: boolean
): boolean => isVaccine && manageVaccinesInDoses;

// Numeric list cells take the shared numeric-cell rule (ui-standards § display
// rounding): the value at the configured places, trailing zeroes unpadded, the
// rounded mark when digits were dropped — and the hover text revealing them.
// (The band above pads instead.)

// A unit figure formatted for a list cell (stock-on-hand, AMC) — so AMC renders
// 0.33, not a rounded 0, and 666.67* still reveals 666.6666666667 on hover.
// The doses equivalent is appended (suffix "ds") when the
// manage-vaccines-in-doses preference is on AND the row is a vaccine
// (OMS-REG-CAT-04.35); the hover then carries both sides at full precision.
// Pure (structural row) so the formatting is unit-tested without a table.
export const unitsWithDoses = (
  units: number,
  row: { isVaccine: boolean; doses: number },
  showDoses: boolean
): DisplayedNumber => {
  const base = displayNumber(units);
  if (!showDoses || !row.isVaccine) return base;

  const doses = dosesEquivalent(units, row.doses);
  const dosesCell = displayNumber(doses);
  const suffix = t('label.doses-short');
  const text = `${base.text} (${dosesCell.text} ${suffix})`;
  // Either side losing precision earns the hover, and it shows BOTH in full
  // so the reading matches the cell it explains.
  return base.exact === undefined && dosesCell.exact === undefined
    ? { text }
    : { text, exact: `${exactText(units)} (${exactText(doses)} ${suffix})` };
};

// Months of stock as a LIST CELL: the numeric-cell rule its neighbours follow,
// NOT the stats band's PADDED figure — a column of figures alongside
// stock-on-hand and AMC must flag dropped precision the same way they do. null
// (zero AMC) is the dash, never 0 (OMS-REG-CAT-04.34).
export const monthsOfStockCell = (
  monthsOfStockOnHand: number | null | undefined
): DisplayedNumber =>
  monthsOfStockOnHand == null
    ? { text: EMPTY_CELL }
    : displayNumber(monthsOfStockOnHand);
