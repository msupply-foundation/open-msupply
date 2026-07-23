import { describe, expect, it } from 'vitest';
import {
  dosesEquivalent,
  formatMonthsOfStock,
  shouldShowDoses,
  truncateToTwoDecimals,
} from './itemStats';

describe('itemStats — item statistics display (spec/items S1/S2)', () => {
  // AC-S2 — months of stock is blank (a dash) at zero AMC, never 0/∞/error;
  // the wire delivers null in that case. A real value shows two decimals.
  it('AC-S2: months of stock is blank (dash) when null, else 2dp', () => {
    expect(formatMonthsOfStock(null)).toBe('—');
    expect(formatMonthsOfStock(undefined)).toBe('—');
    expect(formatMonthsOfStock(2.5)).toBe('2.50');
    // zero is a real months-of-stock value (stock but... ) — only null blanks
    expect(formatMonthsOfStock(0)).toBe('0.00');
  });

  // AC-S3 — doses shown only for vaccine items AND only under the
  // manage-vaccines-in-doses preference; the equivalent is units × doses/unit.
  it('AC-S3: doses gate requires vaccine AND the preference', () => {
    expect(shouldShowDoses(true, true)).toBe(true);
    expect(shouldShowDoses(true, false)).toBe(false);
    expect(shouldShowDoses(false, true)).toBe(false);
    expect(shouldShowDoses(false, false)).toBe(false);
  });

  it('AC-S3: doses equivalent = units × doses per unit', () => {
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
});
