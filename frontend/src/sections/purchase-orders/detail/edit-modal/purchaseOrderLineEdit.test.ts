import { describe, expect, it } from 'vitest';
import {
  discountPercentage,
  draftFromLine,
  draftPacks,
  factsFromLine,
  insertInput,
  lineChanges,
  lineGates,
  newLineDraft,
  orderedElsewhere,
  packsEntered,
  packSizeEntered,
  packsLabelKey,
  PRICE_DECIMALS,
  repriced,
  requestedDateEntered,
  showsAdjustedUnits,
  type LineDraft,
} from './purchaseOrderLineEdit';
import { lineCost } from '../purchaseOrderPricing';
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
    stats: { stockOnHand: 4200 },
  },
  unit: 'tablet',
  requestedPackSize: 10,
  requestedNumberOfUnits: 100,
  adjustedNumberOfUnits: null,
  shippedNumberOfUnits: 0,
  pricePerPackBeforeDiscount: 8,
  pricePerPackAfterDiscount: 6,
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

describe('OMS-FUN-PO-02.7 — what a new line is born as', () => {
  it('carries the default pack size, no quantity, no prices, and the order’s dates', () => {
    const born = newLineDraft(
      { defaultPackSize: 100 },
      { requestedDeliveryDate: '2026-10-01', latestExpectedDate: '2026-11-15' }
    );
    expect(born.requestedPackSize).toBe(100);
    expect(born.requestedNumberOfUnits).toBe(0);
    expect(born.adjustedNumberOfUnits).toBeNull();
    expect(born.pricePerPackBeforeDiscount).toBe(0);
    expect(born.pricePerPackAfterDiscount).toBe(0);
    expect(born.requestedDeliveryDate).toBe('2026-10-01');
    expect(born.expectedDeliveryDate).toBe('2026-11-15');
  });

  it('leaves the dates empty where the order has none', () => {
    const born = newLineDraft(
      { defaultPackSize: 1 },
      { requestedDeliveryDate: null, latestExpectedDate: undefined }
    );
    expect(born.requestedDeliveryDate).toBeNull();
    expect(born.expectedDeliveryDate).toBeNull();
  });
});

describe('OMS-FUN-PO-02.18 / .19 — the figures the editor shows come from the item', () => {
  it('reads the item’s current stock and the units ordered elsewhere', () => {
    const facts = factsFromLine(line());
    expect(facts.stockOnHand).toBe(4200);
    expect(facts.unitsOrderedInOthers).toBe(12000);
  });

  it('renders the ordered-elsewhere figure in the item’s unit, pluralised', () => {
    expect(orderedElsewhere(12000, 'tablet')).toBe('12,000 tablets');
    expect(orderedElsewhere(1, 'tablet')).toBe('1 tablet');
  });

  // No dictionary is loaded under node, so the translated word is asserted as
  // its key (the ladder tests do the same).
  it('falls back to a bare “units” where the item has none', () => {
    expect(orderedElsewhere(5, null)).toBe('5 label.units-plural');
  });
});

describe('OMS-FUN-PO-07.4 — packs are units over pack size', () => {
  it('shows the requested quantity in packs', () => {
    expect(draftPacks(draft())).toBe(10);
  });

  it('shows the adjusted quantity once there is one', () => {
    expect(draftPacks(draft({ adjustedNumberOfUnits: 50 }))).toBe(5);
  });
});

describe('OMS-FUN-PO-02.12 — which quantity the packs write', () => {
  it('writes requested and adjusted alike while New', () => {
    expect(packsEntered('NEW', draft(), 20)).toEqual({
      requestedNumberOfUnits: 200,
      adjustedNumberOfUnits: 200,
    });
  });

  it('writes both while Ready for approval', () => {
    expect(packsEntered('REQUEST_APPROVAL', draft(), 3)).toEqual({
      requestedNumberOfUnits: 30,
      adjustedNumberOfUnits: 30,
    });
  });

  it('writes the adjusted quantity alone from Ready for sending', () => {
    expect(packsEntered('CONFIRMED', draft(), 20)).toEqual({
      adjustedNumberOfUnits: 200,
    });
    expect(packsEntered('SENT', draft(), 20)).toEqual({
      adjustedNumberOfUnits: 200,
    });
  });

  it('a new pack size keeps the packs and moves the units', () => {
    expect(packSizeEntered('NEW', draft(), 25)).toEqual({
      requestedPackSize: 25,
      requestedNumberOfUnits: 250,
      adjustedNumberOfUnits: 250,
    });
  });
});

describe('OMS-FUN-PO-02.12 — one input, two labels', () => {
  it('reads Requested packs while drafting and Adjusted packs once Ready for sending', () => {
    expect(packsLabelKey('NEW')).toBe('label.requested-packs');
    expect(packsLabelKey('REQUEST_APPROVAL')).toBe('label.requested-packs');
    expect(packsLabelKey('CONFIRMED')).toBe('label.adjusted-packs');
    expect(packsLabelKey('SENT')).toBe('label.adjusted-packs');
  });

  it('reads Requested packs on a Finalised order', () => {
    expect(packsLabelKey('FINALISED')).toBe('label.requested-packs');
  });

  it('shows the Adjusted units row only past Ready for approval', () => {
    expect(showsAdjustedUnits('NEW')).toBe(false);
    expect(showsAdjustedUnits('REQUEST_APPROVAL')).toBe(false);
    expect(showsAdjustedUnits('CONFIRMED')).toBe(true);
    expect(showsAdjustedUnits('FINALISED')).toBe(true);
  });
});

describe('OMS-FUN-PO-02.13 / .22 — the editor’s gates', () => {
  it('opens the packs as the requested quantity while drafting, whoever the user is', () => {
    const gates = lineGates({
      status: 'NEW',
      lineStatus: 'NEW',
      isNew: false,
      canAuthorise: false,
    });
    expect(gates.packs).toBe(true);
    expect(gates.drafting).toBe(true);
    expect(gates.dates).toBe(true);
    expect(gates.text).toBe(true);
  });

  it('needs the authorise permission for the adjusted quantity from Ready for sending', () => {
    const plain = lineGates({
      status: 'CONFIRMED',
      lineStatus: 'NEW',
      isNew: false,
      canAuthorise: false,
    });
    expect(plain.packs).toBe(false);
    expect(plain.drafting).toBe(false);
    const authorised = lineGates({
      ...plain,
      status: 'SENT',
      lineStatus: 'SENT',
      isNew: false,
      canAuthorise: true,
    });
    expect(authorised.packs).toBe(true);
  });

  it('closes the dates once Sent and keeps the texts open', () => {
    const gates = lineGates({
      status: 'SENT',
      lineStatus: 'SENT',
      isNew: false,
      canAuthorise: true,
    });
    expect(gates.dates).toBe(false);
    expect(gates.text).toBe(true);
  });

  it('closes everything on a Finalised order and on a closed line', () => {
    for (const options of [
      { status: 'FINALISED' as const, lineStatus: 'SENT' as const },
      { status: 'SENT' as const, lineStatus: 'CLOSED' as const },
    ]) {
      const gates = lineGates({ ...options, isNew: false, canAuthorise: true });
      expect(gates.packs).toBe(false);
      expect(gates.drafting).toBe(false);
      expect(gates.dates).toBe(false);
      expect(gates.text).toBe(false);
    }
  });

  it('fixes the item once the line exists (OMS-FUN-PO-02.11)', () => {
    expect(
      lineGates({
        status: 'NEW',
        lineStatus: 'NEW',
        isNew: true,
        canAuthorise: false,
      }).item
    ).toBe(true);
    expect(
      lineGates({
        status: 'NEW',
        lineStatus: 'NEW',
        isNew: false,
        canAuthorise: false,
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
          isNew: false,
          canAuthorise: true,
        }).status
      ).toBe(false);
  });
});

describe('OMS-FUN-PO-02.14 / OMS-FUN-PO-07.2 — the three prices settle', () => {
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

describe('OMS-FUN-PO-07.3 — the line’s total cost', () => {
  it('is the after-discount price times the packs authored', () => {
    expect(lineCost(draft())).toBe(60);
    expect(lineCost(draft({ adjustedNumberOfUnits: 50 }))).toBe(30);
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

describe('OMS-FUN-PO-02.15 — an untouched line saves nothing', () => {
  it('reports no change for an identical draft', () => {
    expect(lineChanges(draft(), draft())).toBeUndefined();
  });

  it('sends only the fields that moved', () => {
    expect(
      lineChanges(
        draft(),
        draft({
          requestedNumberOfUnits: 200,
          adjustedNumberOfUnits: 200,
          comment: 'urgent',
        })
      )
    ).toEqual({
      requestedNumberOfUnits: 200,
      adjustedNumberOfUnits: 200,
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
  it('names the item, the order and the whole draft, with no adjusted quantity', () => {
    const input = insertInput(
      'new-id',
      'order-1',
      { itemId: 'item-1', unitName: 'tablet' },
      newLineDraft(
        { defaultPackSize: 100 },
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
    expect(input).not.toHaveProperty('adjustedNumberOfUnits');
  });
});
