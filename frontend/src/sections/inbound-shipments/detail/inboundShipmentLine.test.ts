import { describe, expect, it } from 'vitest';
import {
  batchIsBlank,
  expiryIsBlank,
  lacksBatchOrExpiry,
  missingBatchField,
  newBatchDefaultsFromLine,
  orderLinePrice,
  packDifference,
} from './inboundShipmentLine';

// The Difference figure's DIRECTION (spec/inbound-shipments/ui-surface.md
// § line table col 13, issue #562). The sign is the contract here: the
// reference app reads received − shipped, and a flipped subtraction reports
// an over-receipt as a shortfall without any other symptom.
describe('packDifference', () => {
  it('is positive when more arrived than the supplier declared', () => {
    expect(packDifference(80, 20)).toBe(60);
  });

  it('is negative when the delivery fell short', () => {
    expect(packDifference(90, 100)).toBe(-10);
  });

  it('is zero when the delivery matches what was declared', () => {
    expect(packDifference(10, 10)).toBe(0);
  });

  // Nothing declared ⇒ nothing to compare against. Distinct from 0, which
  // the surfaces render as a figure ("they match") rather than as a blank.
  it('is undefined when nothing was recorded as shipped', () => {
    expect(packDifference(10, null)).toBeUndefined();
    expect(packDifference(10, undefined)).toBeUndefined();
  });

  // A declared zero IS a declaration — the supplier said they sent none — so
  // it compares, and every received pack is an over-receipt against it. This
  // is the shape the reported shipment was in.
  it('compares against a declared zero rather than blanking', () => {
    expect(packDifference(80, 0)).toBe(80);
  });
});

// The batch/expiry prompt's trigger and marking (issue #992): per batch, a
// blank batch OR a blank expiry — either one alone is enough.
describe('batch and expiry blanks', () => {
  const full = { batch: 'B1', expiryDate: '2027-01-31' };

  it('a batch with both is not missing anything', () => {
    expect(batchIsBlank(full)).toBe(false);
    expect(expiryIsBlank(full)).toBe(false);
    expect(lacksBatchOrExpiry(full)).toBe(false);
  });

  it('a blank batch is missing its batch only', () => {
    const b = { ...full, batch: '' };
    expect(batchIsBlank(b)).toBe(true);
    expect(expiryIsBlank(b)).toBe(false);
    expect(lacksBatchOrExpiry(b)).toBe(true);
  });

  it('treats a whitespace-only batch as blank', () => {
    expect(batchIsBlank({ ...full, batch: '  ' })).toBe(true);
  });

  it('a blank expiry is missing its expiry only', () => {
    const b = { ...full, expiryDate: null };
    expect(batchIsBlank(b)).toBe(false);
    expect(expiryIsBlank(b)).toBe(true);
    expect(lacksBatchOrExpiry(b)).toBe(true);
  });
});

// What the prompt and footer name (PR #1587 review): only the field that is
// actually blank, and both only when both are blank somewhere.
describe('missingBatchField', () => {
  const full = { batch: 'B1', expiryDate: '2027-01-31' };
  const noBatch = { ...full, batch: '' };
  const noExpiry = { ...full, expiryDate: null };

  it('is undefined when every batch has both', () => {
    expect(missingBatchField([full, full])).toBeUndefined();
    expect(missingBatchField([])).toBeUndefined();
  });

  it('names the batch alone when only batches are blank', () => {
    expect(missingBatchField([noBatch, full, noBatch])).toBe('batch');
  });

  it('names the expiry alone when only expiries are blank', () => {
    expect(missingBatchField([full, noExpiry])).toBe('expiry');
  });

  it('names either when one batch lacks both', () => {
    expect(missingBatchField([{ batch: '', expiryDate: null }])).toBe('either');
  });

  it('names either when different batches lack different fields', () => {
    expect(missingBatchField([noBatch, noExpiry])).toBe('either');
  });
});

// A new batch's starting figures (spec/inbound-shipments/rules.md › new-batch
// defaults) when "Add batch" is used on an item opened from its row.
describe('newBatchDefaultsFromLine', () => {
  const item = {
    id: 'item-1',
    code: 'PARA',
    name: 'Paracetamol',
    unitName: 'Tab',
    isVaccine: false,
    doses: 1,
    defaultPackSize: 10,
    itemStoreProperties: { defaultSellPricePerPack: 4 },
    volumePerPack: 0.25,
  };
  const orderLine = {
    id: 'pol-1',
    lineNumber: 1,
    requestedPackSize: 20,
    requestedNumberOfUnits: 200,
    shippedNumberOfUnits: 0,
    inTransitNumberOfUnits: 0,
    receivedNumberOfUnits: 0,
    pricePerPackBeforeDiscount: 12,
    pricePerPackAfterDiscount: 10,
    pricePerPackAfterSupplierDiscount: 9,
  };

  it("OMS-REG-REPL-09.40 seeds from the item's default pack size and price", () => {
    expect(
      newBatchDefaultsFromLine({ item, purchaseOrderLine: null }, undefined)
    ).toEqual({
      defaultPackSize: 10,
      prefillPricePerPack: 4,
      volumePerPack: 0.25,
    });
  });

  it('prices at zero where the store has no default sell price', () => {
    expect(
      newBatchDefaultsFromLine(
        {
          item: { ...item, itemStoreProperties: null },
          purchaseOrderLine: null,
        },
        undefined
      ).prefillPricePerPack
    ).toBe(0);
  });

  it('OMS-REG-REPL-09.42 seeds from the cited order line at the shipment rate', () => {
    expect(
      newBatchDefaultsFromLine({ item, purchaseOrderLine: orderLine }, 1.5)
    ).toEqual({
      defaultPackSize: 20,
      prefillPricePerPack: 13.5,
      volumePerPack: 0.25,
    });
  });
});

describe('orderLinePrice', () => {
  it('is the price net of supplier discount at a home-currency rate of one', () => {
    expect(orderLinePrice(9, undefined)).toBe(9);
  });

  it('converts a foreign price at the shipment rate', () => {
    expect(orderLinePrice(9, 2)).toBe(18);
  });
});
