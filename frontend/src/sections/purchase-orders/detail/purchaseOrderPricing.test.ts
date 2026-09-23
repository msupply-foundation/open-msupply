import { describe, expect, it } from 'vitest';
import {
  chargesTotal,
  finalCost,
  lineCost,
  linePacks,
  projectedLineCost,
} from './purchaseOrderPricing';

// spec/purchase-orders rules § pricing and totals. The figures in the first
// two cases are the ones the contract confirmed live end to end: 100 units at
// pack size 10 and an after-line-discount price of 6.00 give a subtotal of
// 60.00; a 25% supplier discount gives 45.00 and an amount of 15.00.

const line = (over: Partial<Parameters<typeof projectedLineCost>[0]> = {}) => ({
  requestedNumberOfUnits: 100,
  adjustedNumberOfUnits: null,
  requestedPackSize: 10,
  pricePerPackAfterDiscount: 6,
  ...over,
});

describe('a line’s packs', () => {
  it('divides the expected quantity by the pack size', () => {
    expect(linePacks(line())).toBe(10);
  });

  it('follows the adjusted quantity when there is one', () => {
    expect(linePacks(line({ adjustedNumberOfUnits: 50 }))).toBe(5);
  });

  it('takes an adjusted quantity of zero over the requested one', () => {
    expect(linePacks(line({ adjustedNumberOfUnits: 0 }))).toBe(0);
  });

  it('is zero at a pack size of zero, not an infinity', () => {
    expect(linePacks(line({ requestedPackSize: 0 }))).toBe(0);
  });
});

describe('OMS-FUN-PO-07.3 — a line’s cost is the stored figure', () => {
  // The line's cost is the server's STORED figure, never re-multiplied here:
  // the table, its footer, the order's totals and the shipment raised against
  // the line all read the one number the server wrote (rules § pricing and
  // totals).
  it('is the stored line total, whatever the raw figures would multiply to', () => {
    expect(lineCost({ lineTotal: 60 })).toBe(60);
    // Stored unrounded — the display rounds, this does not.
    expect(lineCost({ lineTotal: 3.015 })).toBe(3.015);
  });

  // The editor's preview of what the server will store for an unsaved draft,
  // on the server's own rule: packs × the after-discount pack price.
  it('projects an unsaved draft’s cost as packs times the after-discount price', () => {
    expect(projectedLineCost(line())).toBe(60);
    expect(projectedLineCost(line({ adjustedNumberOfUnits: 50 }))).toBe(30);
  });

  // A zero-pack-size line contributes NOTHING, whatever its quantity or price
  // (confirmed live: a 50-unit line at price 5 and pack size 0 left the order
  // total unchanged). The server writes its total as 0.
  it('projects nothing at a pack size of zero', () => {
    const zeroPack = line({
      requestedPackSize: 0,
      requestedNumberOfUnits: 50,
      pricePerPackAfterDiscount: 5,
    });
    expect(projectedLineCost(zeroPack)).toBe(0);
  });
});

describe('the additional charges', () => {
  const charges = {
    agentCommission: 1,
    documentCharge: 2,
    communicationsCharge: 4,
    insuranceCharge: 8,
    freightCharge: 16,
  };

  it('sums all five', () => {
    expect(chargesTotal(charges)).toBe(31);
  });

  it('counts an absent charge as zero', () => {
    expect(
      chargesTotal({
        agentCommission: null,
        documentCharge: 2,
        communicationsCharge: null,
        insuranceCharge: null,
        freightCharge: null,
      })
    ).toBe(2);
  });

  // The charges reach NEITHER stored total: the final cost is the discounted
  // total plus them, and exists only where it is shown.
  it('adds to the DISCOUNTED total to give the final cost', () => {
    expect(finalCost({ ...charges, orderTotalAfterDiscount: 45 })).toBe(76);
  });

  it('gives a line-less order a final cost of its charges alone', () => {
    // Every figure on an order with no lines reads as zero rather than absent.
    expect(finalCost({ ...charges, orderTotalAfterDiscount: 0 })).toBe(31);
  });
});
