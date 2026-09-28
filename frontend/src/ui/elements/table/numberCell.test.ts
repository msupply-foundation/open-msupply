import { describe, expect, it } from 'vitest';
import { numericLeafValues } from './tableHelpers';
import { displayTotal } from '../../../intl/numberDisplay';

// The number cell's grouped-row total (spec/ui-standards/tables.md § display
// rounding): summed from the leaves at full precision, never from the rounded
// figures on screen. The rounding decision itself is intl/numberDisplay's.

const row = (values: unknown[]) => ({
  getLeafRows: () => values.map(value => ({ getValue: () => value })),
});

describe('the leaves a grouped total is summed from', () => {
  it('takes every numeric leaf', () => {
    expect(numericLeafValues(row([1, 2.5, 3]), 'qty')).toEqual([1, 2.5, 3]);
  });

  it('skips leaves carrying no figure, a real zero included', () => {
    expect(numericLeafValues(row([1, null, undefined, '4', 0]), 'qty')).toEqual(
      [1, 0]
    );
  });

  it('reports no leaves for a group with nothing numeric — a blank total, not 0', () => {
    expect(numericLeafValues(row([null, 'n/a']), 'qty')).toEqual([]);
  });
});

describe('the total a grouped row shows', () => {
  it('adds the stored values, not the rounded ones on screen', () => {
    // Each leaf displays "0.33"; the visible column adds to 0.99, the data to 1.
    expect(
      displayTotal(numericLeafValues(row([0.334, 0.333, 0.333]), 'qty'))
    ).toEqual({ text: '1' });
  });

  it('marks a total that differs from the full value', () => {
    expect(
      displayTotal(numericLeafValues(row([0.335, 0.333, 0.333]), 'qty'))
    ).toEqual({ text: '1*', exact: '1.001' });
  });
});
