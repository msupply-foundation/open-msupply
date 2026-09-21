import { describe, expect, it } from 'vitest';
import {
  chargesTotal,
  discountAmountOf,
  discountPercentageOf,
  expectedUnits,
  finalCost,
  lineCost,
  linePacks,
} from './purchaseOrderPricing';

// spec/purchase-orders rules § pricing and totals. The figures in the first
// two cases are the ones the contract confirmed live end to end: 100 units at
// pack size 10 and an after-line-discount price of 6.00 give a subtotal of
// 60.00; a 25% supplier discount gives 45.00 and an amount of 15.00.

const line = (over: Partial<Parameters<typeof lineCost>[0]> = {}) => ({
  requestedNumberOfUnits: 100,
  adjustedNumberOfUnits: null,
  requestedPackSize: 10,
  pricePerPackAfterDiscount: 6,
  ...over,
});

describe('a line’s quantity', () => {
  it('is the requested quantity where no adjusted one is carried', () => {
    expect(expectedUnits(line())).toBe(100);
  });

  it('is the ADJUSTED quantity wherever the order carries one', () => {
    expect(expectedUnits(line({ adjustedNumberOfUnits: 50 }))).toBe(50);
  });

  it('takes an adjusted quantity of zero over the requested one', () => {
    // Zero is a figure, not an absence — the order expects none of the line.
    expect(expectedUnits(line({ adjustedNumberOfUnits: 0 }))).toBe(0);
  });
});

describe('a line’s packs and cost', () => {
  it('divides the expected quantity by the pack size', () => {
    expect(linePacks(line())).toBe(10);
    expect(lineCost(line())).toBe(60);
  });

  it('follows the adjusted quantity when there is one', () => {
    expect(lineCost(line({ adjustedNumberOfUnits: 50 }))).toBe(30);
  });

  // A zero-pack-size line contributes NOTHING, whatever its quantity or price
  // (confirmed live: a 50-unit line at price 5 and pack size 0 left the order
  // total unchanged). On the server the term is NULLIF'd away.
  it('contributes nothing at a pack size of zero', () => {
    const zeroPack = line({
      requestedPackSize: 0,
      requestedNumberOfUnits: 50,
      pricePerPackAfterDiscount: 5,
    });
    expect(linePacks(zeroPack)).toBe(0);
    expect(lineCost(zeroPack)).toBe(0);
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

describe('the supplier discount’s two views', () => {
  it('converts a percentage to an amount against the subtotal', () => {
    expect(discountAmountOf(25, 60)).toBe(15);
  });

  it('converts an amount back to the percentage that is stored', () => {
    expect(discountPercentageOf(15, 60)).toBe(25);
  });

  // The service DISCARDS an amount entered while the subtotal is zero
  // (confirmed live), so there is no percentage to store and the caller must
  // refuse the edit rather than save a figure that will be dropped.
  it('has no percentage for an amount against a zero subtotal', () => {
    expect(discountPercentageOf(15, 0)).toBeUndefined();
  });
});
