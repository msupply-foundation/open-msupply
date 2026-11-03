import { describe, expect, it } from 'vitest';
import {
  discountPercentage,
  draftFromLine,
  factsFromLine,
  insertInput,
  lineChanges,
  lineGates,
  newLineDraft,
  packsEntered,
  packSizeEntered,
  pricePerUnit,
  PRICE_DECIMALS,
  repriced,
  requestedDateEntered,
  servicePriced,
  unitsFigure,
  type LineDraft,
} from './purchaseOrderLineEdit';
import { linePacks, projectedLineCost } from '../purchaseOrderPricing';
import { MAX_FRACTION_DIGITS } from '@/intl';
import type { PurchaseOrderDetailLineFragment } from '../purchaseOrderDetail.generated';

// Anchors: spec/purchase-orders/cases/OMS-FUN-PO-02 (the line editor),
// OMS-FUN-PO-07 (pricing arithmetic).

const line = (
  over: Partial<PurchaseOrderDetailLineFragment> = {}
): PurchaseOrderDetailLineFragment => ({
  id: 'line-1',
  lineNumber: 3,
  status: 'NEW',
  item: {
    id: 'item-1',
    code: 'AMOX',
    name: 'Amoxicillin',
    unitName: 'tablet',
    type: 'STOCK',
    stats: { stockOnHand: 4200 },
  },
  unit: 'tablet',
  requestedPackSize: 10,
  requestedNumberOfUnits: 100,
  shippedNumberOfUnits: 0,
  receivedNumberOfUnits: 0,
  pricePerPackBeforeDiscount: 8,
  pricePerPackAfterDiscount: 6,
  // The stored total: 10 packs at 6.00, with no supplier discount to apportion.
  lineTotalAfterSupplierDiscount: 60,
  requestedDeliveryDate: '2026-10-01',
  expectedDeliveryDate: null,
  supplierItemCode: null,
  manufacturer: null,
  comment: null,
  note: null,
  unitsOrderedInOthers: 12000,
  ...over,
});

const draft = (over: Partial<LineDraft> = {}): LineDraft => ({
  ...draftFromLine(line()),
  ...over,
});

describe('OMS-FUN-PO-02.7 / .24 — what a new line is born as', () => {
  it('carries the default pack size, no quantity, no prices, and the order’s dates', () => {
    const born = newLineDraft(
      { defaultPackSize: 100, type: 'STOCK' },
      { requestedDeliveryDate: '2026-10-01', latestExpectedDate: '2026-11-15' }
    );
    expect(born.requestedPackSize).toBe(100);
    expect(born.requestedNumberOfUnits).toBe(0);
    expect(born.pricePerPackBeforeDiscount).toBe(0);
    expect(born.pricePerPackAfterDiscount).toBe(0);
    expect(born.requestedDeliveryDate).toBe('2026-10-01');
    expect(born.expectedDeliveryDate).toBe('2026-11-15');
  });

  it('leaves the dates empty where the order has none', () => {
    const born = newLineDraft(
      { defaultPackSize: 1, type: 'STOCK' },
      { requestedDeliveryDate: null, latestExpectedDate: undefined }
    );
    expect(born.requestedDeliveryDate).toBeNull();
    expect(born.expectedDeliveryDate).toBeNull();
  });
});

describe('OMS-FUN-PO-02.28 — a service item makes a line of one charge', () => {
  it('is born as one of one, whatever the item’s default pack size', () => {
    const born = newLineDraft(
      { defaultPackSize: 12, type: 'SERVICE' },
      { requestedDeliveryDate: null, latestExpectedDate: null }
    );
    expect(born.requestedPackSize).toBe(1);
    expect(born.requestedNumberOfUnits).toBe(1);
  });

  it('has one price: no line discount', () => {
    expect(servicePriced(25)).toEqual({
      pricePerPackBeforeDiscount: 25,
      discountPercentage: 0,
      pricePerPackAfterDiscount: 25,
    });
  });

  it('is known as a service line when opened from its row', () => {
    expect(factsFromLine(line()).isService).toBe(false);
    expect(
      factsFromLine(line({ item: { ...line().item, type: 'SERVICE' } }))
        .isService
    ).toBe(true);
  });
});

describe('OMS-FUN-PO-02.18 / .19 — the figures the editor shows come from the item', () => {
  it('reads the item’s current stock and the units ordered elsewhere', () => {
    const facts = factsFromLine(line());
    expect(facts.stockOnHand).toBe(4200);
    expect(facts.unitsOrderedInOthers).toBe(12000);
  });

  // No dictionary is loaded under node, so the translated word is asserted as
  // its key (the ladder tests do the same).
  it('falls back to a bare “units” where the item has none', () => {
    expect(unitsFigure(5, null)).toBe('5 label.units-plural');
  });

  it('shows a units figure exact when given the full places', () => {
    expect(unitsFigure(1.23456789, 'Tablet', MAX_FRACTION_DIGITS)).toBe(
      '1.23456789 Tablet'
    );
    expect(unitsFigure(1.23456789, 'Tablet', 2)).toBe('1.23* Tablet');
  });
});

describe('OMS-FUN-PO-07.4 — packs are units over pack size', () => {
  // The editor shows a draft's packs on the same rule as the table's column.
  it('shows the requested quantity in packs', () => {
    expect(linePacks(draft())).toBe(10);
  });
});

describe('OMS-FUN-PO-02.12 — the packs write the requested quantity', () => {
  it('writes packs × pack size as the requested units', () => {
    expect(packsEntered(draft(), 20)).toEqual({
      requestedNumberOfUnits: 200,
    });
  });

  it('a new pack size keeps the packs and moves the units', () => {
    expect(packSizeEntered(draft(), 25)).toEqual({
      requestedPackSize: 25,
      requestedNumberOfUnits: 250,
    });
  });
});

describe('OMS-REG-PO-01.1 / .2, OMS-FUN-PO-02.22 — the editor’s gates', () => {
  it('opens the quantity while drafting', () => {
    for (const status of ['NEW', 'REQUEST_APPROVAL'] as const) {
      const gates = lineGates({ status, lineStatus: 'NEW', addMode: false });
      expect(gates.drafting).toBe(true);
    }
  });

  it('opens the dates and texts while drafting', () => {
    const gates = lineGates({
      status: 'NEW',
      lineStatus: 'NEW',
      addMode: false,
    });
    expect(gates.requestedDate).toBe(true);
    expect(gates.expectedDate).toBe(true);
    expect(gates.text).toBe(true);
  });

  it('fixes the quantity from Approved', () => {
    expect(
      lineGates({ status: 'CONFIRMED', lineStatus: 'NEW', addMode: false })
        .drafting
    ).toBe(false);
    expect(
      lineGates({ status: 'SENT', lineStatus: 'SENT', addMode: false }).drafting
    ).toBe(false);
  });

  it('closes the requested date once Sent, keeping the expected date and the texts open (OMS-REG-PO-01.24, .26)', () => {
    const gates = lineGates({
      status: 'SENT',
      lineStatus: 'SENT',
      addMode: false,
    });
    expect(gates.requestedDate).toBe(false);
    expect(gates.expectedDate).toBe(true);
    expect(gates.text).toBe(true);
  });

  it('closes everything on a Finalised order and on a closed line', () => {
    for (const options of [
      { status: 'FINALISED' as const, lineStatus: 'SENT' as const },
      { status: 'SENT' as const, lineStatus: 'CLOSED' as const },
    ]) {
      const gates = lineGates({
        ...options,
        addMode: false,
      });
      expect(gates.drafting).toBe(false);
      expect(gates.requestedDate).toBe(false);
      expect(gates.expectedDate).toBe(false);
      expect(gates.text).toBe(false);
    }
  });

  it('keeps the chooser live in add mode and fixes the item on an opened line (OMS-FUN-PO-02.11, OMS-FUN-PO-02.23)', () => {
    expect(
      lineGates({
        status: 'NEW',
        lineStatus: 'NEW',
        addMode: true,
      }).item
    ).toBe(true);
    expect(
      lineGates({
        status: 'NEW',
        lineStatus: 'NEW',
        addMode: false,
      }).item
    ).toBe(false);
  });

  it('never opens the status control (OMS-FUN-PO-02.22)', () => {
    for (const status of [
      'NEW',
      'REQUEST_APPROVAL',
      'CONFIRMED',
      'SENT',
      'FINALISED',
    ] as const)
      expect(
        lineGates({
          status,
          lineStatus: 'NEW',
          addMode: false,
        }).status
      ).toBe(false);
  });
});

describe('OMS-FUN-PO-07.2 — the three prices settle', () => {
  it('a new before-price recomputes the after-price at the held percentage', () => {
    expect(
      repriced('pricePerPackBeforeDiscount', {
        pricePerPackBeforeDiscount: 10,
        discountPercentage: 25,
        pricePerPackAfterDiscount: 6,
      })
    ).toEqual({
      pricePerPackBeforeDiscount: 10,
      discountPercentage: 25,
      pricePerPackAfterDiscount: 7.5,
    });
  });

  it('a new percentage recomputes the after-price', () => {
    expect(
      repriced('discountPercentage', {
        pricePerPackBeforeDiscount: 8,
        discountPercentage: 50,
        pricePerPackAfterDiscount: 6,
      }).pricePerPackAfterDiscount
    ).toBe(4);
  });

  it('a new after-price recomputes the percentage', () => {
    expect(
      repriced('pricePerPackAfterDiscount', {
        pricePerPackBeforeDiscount: 8,
        discountPercentage: 25,
        pricePerPackAfterDiscount: 2,
      }).discountPercentage
    ).toBe(75);
  });

  it('holds the percentage between 0 and 100', () => {
    expect(
      repriced('discountPercentage', {
        pricePerPackBeforeDiscount: 8,
        discountPercentage: 140,
        pricePerPackAfterDiscount: 0,
      })
    ).toEqual({
      pricePerPackBeforeDiscount: 8,
      discountPercentage: 100,
      pricePerPackAfterDiscount: 0,
    });
  });

  it('recovers the percentage from the two stored prices, and reads zero with no before-price', () => {
    expect(discountPercentage(8, 6)).toBe(25);
    expect(discountPercentage(0, 0)).toBe(0);
    expect(draftFromLine(line()).discountPercentage).toBe(25);
    expect(
      draftFromLine(
        line({ pricePerPackBeforeDiscount: 0, pricePerPackAfterDiscount: 0 })
      ).discountPercentage
    ).toBe(0);
  });

  it('accepts six decimal places on a price (OMS-FUN-PO-07.1)', () => {
    expect(PRICE_DECIMALS).toBe(6);
  });
});

describe('OMS-FUN-PO-07.3 — the editor previews the line’s total cost', () => {
  // The editor previews the Line cost the table will show on save — the
  // server's own rule, the after-discount price times the packs authored,
  // less the order's supplier discount. A saved line's row then reads the
  // stored figure (`lineTotalAfterSupplierDiscount`) rather than recomputing.
  const undiscounted = { supplierDiscountPercentage: null };

  it('previews the after-discount price times the packs authored', () => {
    expect(projectedLineCost(draft(), undiscounted)).toBe(60);
    expect(
      projectedLineCost(draft({ requestedNumberOfUnits: 50 }), undiscounted)
    ).toBe(30);
  });

  // OMS-FUN-PO-07.16 — the order's supplier discount reaches the preview too
  it('takes the order’s supplier discount off the preview', () => {
    expect(projectedLineCost(draft(), { supplierDiscountPercentage: 25 })).toBe(
      45
    );
  });
});

describe('OMS-FUN-PO-07.11 — the editor shows the per-unit price', () => {
  it('divides the after-discount pack price by the pack size', () => {
    expect(
      pricePerUnit({ pricePerPackAfterDiscount: 3.4, requestedPackSize: 100 })
    ).toBeCloseTo(0.034);
  });

  it('is zero where the pack size is zero', () => {
    expect(
      pricePerUnit({ pricePerPackAfterDiscount: 3.4, requestedPackSize: 0 })
    ).toBe(0);
  });
});

describe('OMS-FUN-PO-02.20 — the requested date fills an empty expected date', () => {
  it('fills the expected date where it is empty', () => {
    expect(requestedDateEntered(draft(), '2026-10-05')).toEqual({
      requestedDeliveryDate: '2026-10-05',
      expectedDeliveryDate: '2026-10-05',
    });
  });

  it('leaves an expected date already set alone', () => {
    expect(
      requestedDateEntered(
        draft({ expectedDeliveryDate: '2026-12-01' }),
        '2026-10-05'
      )
    ).toEqual({ requestedDeliveryDate: '2026-10-05' });
  });

  it('clearing the requested date touches nothing else', () => {
    expect(requestedDateEntered(draft(), null)).toEqual({
      requestedDeliveryDate: null,
    });
  });
});

describe('OMS-FUN-PO-02.26 — an untouched line saves nothing', () => {
  it('reports no change for an identical draft', () => {
    expect(lineChanges(draft(), draft())).toBeUndefined();
  });

  it('sends only the fields that moved', () => {
    expect(
      lineChanges(
        draft(),
        draft({
          requestedNumberOfUnits: 200,
          comment: 'urgent',
        })
      )
    ).toEqual({
      requestedNumberOfUnits: 200,
      comment: { value: 'urgent' },
    });
  });

  it('clears a text, a date and the manufacturer through the nullable wrapper', () => {
    const before = draft({
      supplierItemCode: 'S-1',
      manufacturer: { id: 'm1', name: 'Maker' },
      expectedDeliveryDate: '2026-11-01',
    });
    expect(
      lineChanges(
        before,
        draft({
          supplierItemCode: '',
          manufacturer: null,
          expectedDeliveryDate: null,
        })
      )
    ).toEqual({
      supplierItemCode: { value: null },
      manufacturerId: { value: null },
      expectedDeliveryDate: { value: null },
    });
  });
});

describe('OMS-FUN-PO-02.1 / .7 — a new line’s insert', () => {
  it('names the item, the order and the whole draft', () => {
    const input = insertInput(
      'new-id',
      'order-1',
      { itemId: 'item-1', unitName: 'tablet' },
      newLineDraft(
        { defaultPackSize: 100, type: 'STOCK' },
        { requestedDeliveryDate: '2026-10-01', latestExpectedDate: null }
      )
    );
    expect(input).toEqual({
      id: 'new-id',
      purchaseOrderId: 'order-1',
      itemIdOrCode: 'item-1',
      requestedPackSize: 100,
      requestedNumberOfUnits: 0,
      pricePerPackBeforeDiscount: 0,
      pricePerPackAfterDiscount: 0,
      requestedDeliveryDate: '2026-10-01',
      expectedDeliveryDate: null,
      supplierItemCode: null,
      manufacturerId: null,
      comment: null,
      note: null,
      unit: 'tablet',
    });
  });
});
