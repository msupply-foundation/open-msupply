import { describe, expect, it } from 'vitest';
import {
  dosesEquivalent,
  formatMonthsOfStock,
  monthsOfStockCell,
  shouldShowDoses,
  truncateToTwoDecimals,
  unitsWithDoses,
} from './itemStats';

describe('itemStats — item statistics display (spec/items S1/S2)', () => {
  // OMS-REG-CAT-04.34 — months of stock is blank (a dash) at zero AMC, never
  // 0/∞/error; the wire delivers null in that case. A real value shows two
  // decimals.
  it('months of stock is blank (dash) when null, else 2dp (CAT-04.34)', () => {
    expect(formatMonthsOfStock(null)).toBe('—');
    expect(formatMonthsOfStock(undefined)).toBe('—');
    expect(formatMonthsOfStock(2.5)).toBe('2.50');
    // zero is a real months-of-stock value (stock but... ) — only null blanks
    expect(formatMonthsOfStock(0)).toBe('0.00');
  });

  // The list CELL takes the numeric-cell rule, NOT the band's fixed 2dp: at most
  // two decimals, "…" + hover when precision drops. Same dash at zero AMC.
  it('the MOS list cell follows the numeric-cell rule, not the band 2dp', () => {
    expect(monthsOfStockCell(null)).toEqual({ text: '—' });
    // 2.5 reads "2.5" here where the band reads "2.50" — no padding zero
    expect(monthsOfStockCell(2.5)).toEqual({ text: '2.5', title: undefined });
    expect(monthsOfStockCell(3.3333)).toEqual({
      text: '3.33…',
      title: '3.3333',
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

  // Numeric cell truncation — >2 decimals truncates to two with a trailing "…"
  // (captured as-is from the reference list); the full value rides the hover.
  it('truncates >2-decimal values to two with a trailing ellipsis', () => {
    expect(truncateToTwoDecimals(666.6666666667)).toEqual({
      text: '666.67…',
      truncated: true,
    });
    expect(truncateToTwoDecimals(3000)).toEqual({
      text: '3,000',
      truncated: false,
    });
    expect(truncateToTwoDecimals(2.5)).toEqual({
      text: '2.5',
      truncated: false,
    });
  });

  // ITEMS-F1 — the AMC/stock-on-hand cells format through `unitsWithDoses`.
  // The bug: it was wired to a 0-decimal formatter, so a real AMC of 0.33
  // rendered as "0". These pin that the cell uses the numeric-cell rule
  // (ui-surface.md:47). Non-vaccine path (showDoses=false) needs no `t()`.
  it('formats a fractional AMC to 2dp, not a rounded 0 (ITEMS-F1)', () => {
    const row = { isVaccine: false, doses: 0 };
    expect(unitsWithDoses(0.33, row, false).text).toBe('0.33');
    expect(unitsWithDoses(0.3333, row, false).text).toBe('0.33…');
    // integer stock-on-hand is unchanged — no decimals, no ellipsis
    expect(unitsWithDoses(12499, row, false).text).toBe('12,499');
  });

  // The other half of the same numeric-cell rule (ui-surface.md:47): a
  // truncated cell MUST expose the full-precision value as its hover text, and
  // a cell showing every digit carries no hover at all.
  it('a truncated cell carries the full value as its hover (ITEMS-F1)', () => {
    const row = { isVaccine: false, doses: 0 };
    expect(unitsWithDoses(666.6666666667, row, false)).toEqual({
      text: '666.67…',
      title: '666.6666666667',
    });
    // Nothing dropped ⇒ nothing to reveal.
    expect(unitsWithDoses(2.5, row, false).title).toBeUndefined();
    expect(unitsWithDoses(3000, row, false).title).toBeUndefined();
  });
});
