import { describe, expect, it } from 'vitest';
import { formatCurrency, formatCurrencyCell } from './currencyCell';

// spec/ui-standards/tables.md § data-type alignment — a currency cell marks,
// not hides, real precision beyond 2 decimals (issue #743: the old app's
// outbound line table renders "< $0.01" / "$1.01..." where we showed plain
// rounded amounts).
describe('formatCurrencyCell', () => {
  it('renders symbol + two decimals for plain amounts', () => {
    expect(formatCurrencyCell(0.3)).toBe('$0.30');
    expect(formatCurrencyCell(0)).toBe('$0.00');
    expect(formatCurrencyCell(1234.5)).toBe('$1,234.50');
  });

  it('renders blank for a missing amount', () => {
    expect(formatCurrencyCell(null)).toBe('');
    expect(formatCurrencyCell(undefined)).toBe('');
  });

  it('marks a positive amount below one cent as "< $0.01"', () => {
    expect(formatCurrencyCell(0.0003)).toBe('< $0.01');
    expect(formatCurrencyCell(0.0099)).toBe('< $0.01');
  });

  it('appends an ellipsis when real precision extends past 2 dp', () => {
    expect(formatCurrencyCell(1.008)).toBe('$1.01...');
    expect(formatCurrencyCell(0.0227)).toBe('$0.02...');
    expect(formatCurrencyCell(-1.008)).toBe('-$1.01...');
  });

  it('treats float dust as exact, not as extra precision', () => {
    expect(formatCurrencyCell(4.400000000000006)).toBe('$4.40');
    expect(formatCurrencyCell(2.05 * 100)).toBe('$205.00');
  });

  it('inspects only the fraction, so huge amounts do not overflow the check', () => {
    // 1e15 + 0.12 is stored as ….125 — a real third decimal, so it IS marked;
    // the point is that value × 100 overflowing IEEE-754 doesn't crash or
    // misclassify an exact huge amount.
    expect(formatCurrencyCell(1e15 + 0.12)).toContain('...');
    expect(formatCurrencyCell(1e15)).not.toContain('...');
  });
});

describe('formatCurrency', () => {
  it('reveals full precision for the hover value', () => {
    expect(formatCurrency(0.0003, 10)).toBe('$0.0003');
    expect(formatCurrency(0.3, 10)).toBe('$0.30');
  });
});
