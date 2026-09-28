import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_DECIMAL_PLACES,
  setDecimalPlaces,
} from '../../../intl/numberDisplay';
import {
  dosesEquivalent,
  formatMonthsOfStock,
  monthsOfStockCell,
  shouldShowDoses,
  unitsWithDoses,
} from './itemStats';

// Every figure here follows the configured decimal places (ui-standards §
// display rounding); the cases assume its default of 2 unless they set it.
afterEach(() => setDecimalPlaces(DEFAULT_DECIMAL_PLACES));

describe('itemStats — item statistics display (spec/items S1/S2)', () => {
  // The BAND: PADDED to the configured places, and a zero-AMC item (null on
  // the wire) reads zero — the reference app's behaviour (ui-surface S2 §
  // statistics band). The list cell dashes the same absence; see the next test.
  it('the MOS stat band pads to the configured places, zero at zero AMC', () => {
    expect(formatMonthsOfStock(null)).toEqual({ text: '0.00' });
    expect(formatMonthsOfStock(undefined)).toEqual({ text: '0.00' });
    expect(formatMonthsOfStock(2.5)).toEqual({ text: '2.50' });
    expect(formatMonthsOfStock(0)).toEqual({ text: '0.00' });
  });

  it('the MOS stat band follows a reconfigured number of places', () => {
    setDecimalPlaces(3);
    expect(formatMonthsOfStock(2.5)).toEqual({ text: '2.500' });
    // Rounded away: marked, with the exact figure to hover.
    setDecimalPlaces(0);
    expect(formatMonthsOfStock(2.5)).toEqual({ text: '3*', exact: '2.5' });
  });

  // OMS-REG-CAT-04.34 — the list CELL renders a zero-AMC item as a dash, never
  // `0`. It also takes the numeric-cell rule rather than the band's padding:
  // the configured places, unpadded, with a hover when digits were dropped.
  it('the MOS list cell dashes at zero AMC and rounds (CAT-04.34)', () => {
    expect(monthsOfStockCell(null)).toEqual({ text: '—' });
    // 2.5 reads "2.5" here where the band reads "2.50" — no padding zero
    expect(monthsOfStockCell(2.5)).toEqual({ text: '2.5' });
    expect(monthsOfStockCell(3.3333)).toEqual({
      text: '3.33*',
      exact: '3.3333',
    });
    // zero is a value, not an absence — only null dashes
    expect(monthsOfStockCell(0).text).toBe('0');
  });

  // OMS-REG-CAT-04.35 — doses shown only for vaccine items AND only under the
  // manage-vaccines-in-doses preference; the equivalent is units × doses/unit.
  it('doses gate requires vaccine AND the preference (CAT-04.35)', () => {
    expect(shouldShowDoses(true, true)).toBe(true);
    expect(shouldShowDoses(true, false)).toBe(false);
    expect(shouldShowDoses(false, true)).toBe(false);
    expect(shouldShowDoses(false, false)).toBe(false);
  });

  it('doses equivalent = units × doses per unit (CAT-04.35)', () => {
    expect(dosesEquivalent(10, 20)).toBe(200);
    expect(dosesEquivalent(0, 20)).toBe(0);
  });

  // The numeric-cell rule marks a figure only when digits were actually
  // dropped — never an ellipsis, and never for binary-float dust.
  it('marks a figure only when digits were actually dropped', () => {
    expect(monthsOfStockCell(666.6666666667)).toEqual({
      text: '666.67*',
      exact: '666.6666666667',
    });
    expect(monthsOfStockCell(3000)).toEqual({ text: '3,000' });
    // The user typed 0.3.
    expect(monthsOfStockCell(0.1 + 0.2)).toEqual({ text: '0.3' });
    setDecimalPlaces(4);
    expect(monthsOfStockCell(3.3333)).toEqual({ text: '3.3333' });
  });

  // ITEMS-F1 — the AMC/stock-on-hand cells format through `unitsWithDoses`.
  // The bug: it was wired to a 0-decimal formatter, so a real AMC of 0.33
  // rendered as "0". These pin that the cell uses the numeric-cell rule
  // (ui-surface.md:47). Non-vaccine path (showDoses=false) needs no `t()`.
  it('formats a fractional AMC to the configured places, not a rounded 0 (ITEMS-F1)', () => {
    const row = { isVaccine: false, doses: 0 };
    expect(unitsWithDoses(0.33, row, false).text).toBe('0.33');
    expect(unitsWithDoses(0.3333, row, false).text).toBe('0.33*');
    // integer stock-on-hand is unchanged — no decimals
    expect(unitsWithDoses(12499, row, false).text).toBe('12,499');
  });

  // The other half of the same numeric-cell rule: a ROUNDED cell MUST expose
  // the full value as its hover text, and a cell showing every digit carries no
  // hover at all.
  it('a rounded cell carries the full value as its hover (ITEMS-F1)', () => {
    const row = { isVaccine: false, doses: 0 };
    expect(unitsWithDoses(666.6666666667, row, false)).toEqual({
      text: '666.67*',
      exact: '666.6666666667',
    });
    // Nothing dropped ⇒ nothing to reveal.
    expect(unitsWithDoses(2.5, row, false).exact).toBeUndefined();
    expect(unitsWithDoses(3000, row, false).exact).toBeUndefined();
  });
});
