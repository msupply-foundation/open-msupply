import { describe, expect, it } from 'vitest';
import {
  chargesTotal,
  finalCost,
  linePacks,
  orderTotals,
  projectedLineCost,
} from './purchaseOrderPricing';

// spec/purchase-orders rules § pricing and totals. The figures in the first
// two cases are the ones the contract confirmed live end to end: 100 units at
// pack size 10 and an after-line-discount price of 6.00 give a subtotal of
// 60.00; a 25% supplier discount gives 45.00 and an amount of 15.00.

const line = (over: Partial<Parameters<typeof projectedLineCost>[0]> = {}) => ({
  requestedNumberOfUnits: 100,
  requestedPackSize: 10,
  pricePerPackAfterDiscount: 6,
  ...over,
});

describe('a line’s packs', () => {
  it('divides the requested quantity by the pack size', () => {
    expect(linePacks(line())).toBe(10);
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
  // A saved line's cost is the server's STORED `lineTotal`, which the table
  // reads straight off the row (no function to test). What IS computed here is
  // the editor's preview of what the server will store for an unsaved draft,
  // on the server's own rule: packs × the after-discount pack price.
  it('projects an unsaved draft’s cost as packs times the after-discount price', () => {
    expect(projectedLineCost(line())).toBe(60);
    expect(projectedLineCost(line({ requestedNumberOfUnits: 50 }))).toBe(30);
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

describe('OMS-FUN-PO-07.12 — the totals band’s four figures', () => {
  const node = {
    agentCommission: 1,
    documentCharge: 2,
    communicationsCharge: 4,
    insuranceCharge: 8,
    freightCharge: 16,
    orderTotalBeforeDiscount: 60,
    orderTotalAfterDiscount: 45,
    supplierDiscountAmount: 15,
    supplierDiscountPercentage: 25,
  };

  it('reads across as subtotal − discount + charges = order total', () => {
    const totals = orderTotals(node);
    expect(totals.subtotal).toBe(60);
    expect(totals.discount).toBe(15);
    expect(totals.charges).toBe(31);
    expect(totals.total).toBe(76);
    expect(totals.subtotal - totals.discount + totals.charges).toBe(
      totals.total
    );
  });

  it('carries the stored percentage, which is what the label names', () => {
    expect(orderTotals(node).discountPercentage).toBe(25);
    expect(
      orderTotals({ ...node, supplierDiscountPercentage: null })
        .discountPercentage
    ).toBe(0);
  });

  it('is the undiscounted total itself where no supplier discount is set', () => {
    const undiscounted = orderTotals({
      ...node,
      orderTotalAfterDiscount: 60,
      supplierDiscountAmount: 0,
      supplierDiscountPercentage: null,
    });
    expect(undiscounted.discount).toBe(0);
    expect(undiscounted.total).toBe(91);
  });
});
