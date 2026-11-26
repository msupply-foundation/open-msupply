import { describe, expect, it } from 'vitest';
import {
  lineDiscount,
  linePacks,
  orderTotals,
  projectedLineCost,
  supplierDiscountFactor,
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

const undiscounted = { supplierDiscountPercentage: null };

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
  // A saved line's cost is the server's STORED `lineTotal` with the supplier
  // discount apportioned, which the table reads straight off the row (no
  // function to test). What IS computed here is the editor's preview of that
  // figure for an unsaved draft, on the server's own rule: packs × the
  // after-discount pack price, less the order's supplier discount.
  it('projects an unsaved draft’s cost as packs times the after-discount price', () => {
    expect(projectedLineCost(line(), undiscounted)).toBe(60);
    expect(
      projectedLineCost(line({ requestedNumberOfUnits: 50 }), undiscounted)
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

describe('OMS-FUN-PO-07.16 — the supplier discount apportioned to a line', () => {
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

  it('takes nothing off a service line', () => {
    expect(
      projectedLineCost(line(), { supplierDiscountPercentage: 25 }, true)
    ).toBe(60);
  });
});

describe('OMS-FUN-PO-07.22 — a line’s discount', () => {
  // 10 packs at 8.00 before discount, 6.00 after: 20.00 off by the line's own
  // discount, and the stored cost of 60.00 is what the table shows.
  const priced = (over = {}) => ({
    requestedNumberOfUnits: 100,
    requestedPackSize: 10,
    pricePerPackBeforeDiscount: 8,
    lineTotalAfterSupplierDiscount: 60,
    ...over,
  });

  it('is the packs at the before-discount price less the line cost', () => {
    expect(lineDiscount(priced())).toBe(20);
  });

  it('takes in a supplier discount’s share, so the row still reads across', () => {
    // The contract's live figures: a 25% supplier discount takes the 60.00
    // line to 45.00, so 35.00 is off the 80.00 it lists at.
    const line = priced({ lineTotalAfterSupplierDiscount: 45 });
    expect(lineDiscount(line)).toBe(35);
    expect(
      linePacks(line) * line.pricePerPackBeforeDiscount - lineDiscount(line)
    ).toBe(line.lineTotalAfterSupplierDiscount);
  });

  it('is zero on an undiscounted line, never a negative zero', () => {
    expect(
      lineDiscount(
        priced({
          requestedNumberOfUnits: 3,
          requestedPackSize: 1,
          pricePerPackBeforeDiscount: 0.1,
          // 3 × 0.1 is 0.30000000000000004 in floating point.
          lineTotalAfterSupplierDiscount: 0.3000000000000001,
        })
      )
    ).toBe(0);
  });

  it('is zero at a pack size of zero, where the line costs nothing', () => {
    expect(
      lineDiscount(
        priced({ requestedPackSize: 0, lineTotalAfterSupplierDiscount: 0 })
      )
    ).toBe(0);
  });
});

describe('OMS-FUN-PO-07.12 — the totals band’s figures', () => {
  const stock = (cost: number) => ({
    item: { id: 'stock', type: 'STOCK' as const },
    lineTotalAfterSupplierDiscount: cost,
  });
  const service = (cost: number) => ({
    item: { id: 'service', type: 'SERVICE' as const },
    lineTotalAfterSupplierDiscount: cost,
  });

  it('reads across as subtotal + charges = order total', () => {
    const totals = orderTotals({ orderTotalAfterDiscount: 130 }, [
      stock(100),
      stock(23.45),
      service(6.55),
    ]);
    expect(totals.charges).toBe(6.55);
    expect(totals.subtotal).toBeCloseTo(123.45, 10);
    expect(totals.total).toBe(130);
    expect(totals.hasCharges).toBe(true);
  });

  it('has no charges, and a subtotal that is the total, with no service line', () => {
    const totals = orderTotals({ orderTotalAfterDiscount: 60 }, [stock(60)]);
    expect(totals.hasCharges).toBe(false);
    expect(totals.charges).toBe(0);
    expect(totals.subtotal).toBe(60);
  });

  it('names charges for a service line priced at nothing', () => {
    expect(
      orderTotals({ orderTotalAfterDiscount: 60 }, [stock(60), service(0)])
        .hasCharges
    ).toBe(true);
  });

  // OMS-FUN-PO-07.16 / .17: a supplier discount the order carries comes off
  // the stock lines alone, so the subtotal is their discounted costs and the
  // service line is charged in full.
  it('keeps a supplier discount in the subtotal, and out of the charges', () => {
    // 60.00 of stock at 25% off is 45.00; a 10.00 service line is not
    // discounted, so the server's total is 55.00.
    const totals = orderTotals({ orderTotalAfterDiscount: 55 }, [
      stock(45),
      service(10),
    ]);
    expect(totals.subtotal).toBe(45);
    expect(totals.charges).toBe(10);
  });
});
