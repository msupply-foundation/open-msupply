import { describe, expect, it } from 'vitest';
import {
  chargesTotal,
  finalCost,
  linePacks,
  projectedLineCost,
  supplierDiscountFactor,
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

const undiscounted = { supplierDiscountPercentage: null };

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

  it('keeps a fractional pack count rather than rounding it up', () => {
    expect(
      linePacks(line({ requestedNumberOfUnits: 1500, requestedPackSize: 7 }))
    ).toBeCloseTo(214.2857143, 6);
    expect(linePacks(line({ requestedNumberOfUnits: 2 }))).toBe(0.2);
  });
});

describe('OMS-FUN-PO-07.3 — a line’s cost', () => {
  // A saved line's cost is the server's STORED `lineTotal` with the supplier
  // discount apportioned, which the table reads straight off the row (no
  // function to test). What IS computed here is the editor's preview of that
  // figure for an unsaved draft, on the server's own rule: packs × the
  // after-discount pack price, less the order's supplier discount.
  it('projects an unsaved draft’s cost as packs times the after-discount price', () => {
    expect(projectedLineCost(line(), undiscounted)).toBe(60);
    expect(
      projectedLineCost(line({ adjustedNumberOfUnits: 50 }), undiscounted)
    ).toBe(30);
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
    expect(projectedLineCost(zeroPack, undiscounted)).toBe(0);
  });
});

describe('OMS-FUN-PO-07.11 — the supplier discount apportioned to a line', () => {
  // The contract's live figures: a 25% supplier discount on a 60.00 subtotal
  // gives a discounted total of 45.00 — and the one line that makes up that
  // subtotal reads 45.00 too, so the lines reconcile with the order.
  it('takes the order’s percentage off each line’s cost', () => {
    expect(supplierDiscountFactor({ supplierDiscountPercentage: 25 })).toBe(
      0.75
    );
    expect(projectedLineCost(line(), { supplierDiscountPercentage: 25 })).toBe(
      45
    );
  });

  it('leaves a line whole when the order carries no discount', () => {
    expect(supplierDiscountFactor(undiscounted)).toBe(1);
    expect(supplierDiscountFactor({ supplierDiscountPercentage: 0 })).toBe(1);
  });

  it('takes everything off at a discount of 100', () => {
    expect(projectedLineCost(line(), { supplierDiscountPercentage: 100 })).toBe(
      0
    );
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
