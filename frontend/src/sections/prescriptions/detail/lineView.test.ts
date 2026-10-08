import { describe, expect, it } from 'vitest';
import {
  issuedUnitsOf,
  recordedDirections,
  recordedPrescribedQuantity,
  type ViewableLine,
} from './lineView';

const line = (over: Partial<ViewableLine> = {}): ViewableLine => ({
  type: 'STOCK_OUT',
  packSize: 10,
  numberOfPacks: 1,
  prescribedQuantity: null,
  note: null,
  ...over,
});

// OMS-REG-DIS-03.73 — what the read-only line view reads off the already-
// loaded prescription lines.
describe('issuedUnitsOf (DIS-03.73)', () => {
  it('sums packs × pack size over the item’s batches', () => {
    expect(
      issuedUnitsOf([
        line({ numberOfPacks: 2, packSize: 10 }),
        line({ numberOfPacks: 3, packSize: 5 }),
      ])
    ).toBe(35);
  });

  // Fractional packs are normal on a prescription (rules § stock effects), so
  // the sum must not leave float dust in the figure the user reads.
  it('rounds the fractional-pack sum', () => {
    expect(issuedUnitsOf([line({ numberOfPacks: 0.1, packSize: 3 })])).toBe(
      0.3
    );
  });

  it('is zero for a line with nothing dispensed', () => {
    expect(issuedUnitsOf([line({ numberOfPacks: 0 })])).toBe(0);
  });
});

describe('recordedPrescribedQuantity (DIS-03.73)', () => {
  // Set-saved across the item's lines: whichever line carries it is the
  // item's figure.
  it('reads the figure off whichever line carries it', () => {
    expect(
      recordedPrescribedQuantity([line(), line({ prescribedQuantity: 30 })])
    ).toBe(30);
  });

  // A prescribed-quantity placeholder line never appears as a BATCH row (it
  // has no batch), so the view must read across every line of the item,
  // placeholders included.
  it('reads it from a placeholder line with nothing dispensed', () => {
    expect(
      recordedPrescribedQuantity([
        line({ type: 'STOCK_OUT', numberOfPacks: 0, prescribedQuantity: 12 }),
      ])
    ).toBe(12);
  });

  it('is undefined when none was recorded', () => {
    expect(recordedPrescribedQuantity([line(), line()])).toBeUndefined();
  });

  // Zero is a recorded figure, not an absent one.
  it('keeps a recorded zero', () => {
    expect(recordedPrescribedQuantity([line({ prescribedQuantity: 0 })])).toBe(
      0
    );
  });
});

describe('recordedDirections (DIS-03.73)', () => {
  it('reads the directions off whichever line carries them', () => {
    expect(
      recordedDirections([line(), line({ note: 'Take TWO tablets' })])
    ).toBe('Take TWO tablets');
  });

  it('is undefined when the item carries none', () => {
    expect(recordedDirections([line({ note: '' }), line()])).toBeUndefined();
  });
});
