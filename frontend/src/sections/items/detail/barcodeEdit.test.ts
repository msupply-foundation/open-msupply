import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { setDictionaries, setLocale } from '@/intl/intl';
import commonEn from '@/intl/locales/en/common.json';
import {
  addInput,
  canManageBarcodes,
  canWithdraw,
  thisSiteId,
  EMPTY_DRAFT,
  isDraftValid,
  barcodeRows,
} from './barcodeEdit';

// The Barcodes tab's pure logic, anchored to OMS-REG-BAC-01's mapping
// behaviours (spec/barcode-scanning/cases) — the permission gate and what each
// save sends. What a save does to the mappings is the service's
// (server/service/src/barcode.rs tests).

beforeAll(() => {
  setDictionaries({ en: commonEn });
  setLocale('en');
});
afterAll(() => setDictionaries({}));

const confirmed = {
  id: 'b1',
  barcode: '5012345678900',
  packSize: 10,
  manufacturerName: null,
};
const proposal = {
  id: 'p1',
  barcode: '5012345678900',
  packSize: null,
  store: { id: 'store-2', code: 'S2', storeName: 'Store two', siteId: 2 },
};
const thisStore = { __typename: 'StoreNode' as const, siteId: 1 };

const RETAIL = '4006381333931'; // EAN-13, valid check digit

describe('permissions — rules § Permissions', () => {
  it.each([
    'ITEM_MUTATE',
    'STOCK_LINE_MUTATE',
    'INBOUND_SHIPMENT_MUTATE',
    'INVENTORY_ADJUSTMENT_MUTATE',
  ] as const)(
    '.231 away from central, %s alone lets the user add a barcode',
    granted => {
      expect(canManageBarcodes(p => p === granted, false)).toBe(true);
    }
  );

  it('.231 a user with none of the four gets no add', () => {
    expect(canManageBarcodes(() => false, false)).toBe(false);
  });

  it('.230 on central, only item editing changes barcodes', () => {
    expect(canManageBarcodes(p => p === 'ITEM_MUTATE', true)).toBe(true);
    expect(canManageBarcodes(p => p === 'STOCK_LINE_MUTATE', true)).toBe(false);
  });
});

describe('rows — rules § Maintaining barcodes', () => {
  it('lists confirmed barcodes, then proposals', () => {
    expect(
      barcodeRows({
        itemBarcodes: [confirmed],
        itemBarcodeProposals: [proposal],
        store: thisStore,
      })
    ).toEqual([
      { status: 'confirmed', barcode: confirmed },
      { status: 'proposed', barcode: proposal },
    ]);
  });
});

describe('withdrawing a proposal — rules § Learning a barcode', () => {
  const proposed = { status: 'proposed' as const, barcode: proposal };
  const ownSite = {
    status: 'proposed' as const,
    barcode: { ...proposal, store: { ...proposal.store, siteId: 1 } },
  };

  it('reads the site of the store the tab is open in', () => {
    const data = {
      itemBarcodes: [],
      itemBarcodeProposals: [],
    };
    expect(thisSiteId({ ...data, store: thisStore })).toBe(1);
    expect(
      thisSiteId({
        ...data,
        store: { __typename: 'NodeError' as const },
      })
    ).toBeUndefined();
  });

  it("away from central, every listed proposal is this site's", () => {
    expect(canWithdraw(proposed, false, 1)).toBe(true);
    expect(canWithdraw(proposed, false, undefined)).toBe(true);
  });

  it("on central, only proposals from central's own stores", () => {
    expect(canWithdraw(ownSite, true, 1)).toBe(true);
    expect(canWithdraw(proposed, true, 1)).toBe(false);
    expect(canWithdraw(ownSite, true, undefined)).toBe(false);
  });

  it('never a confirmed barcode', () => {
    const row = { status: 'confirmed' as const, barcode: confirmed };
    expect(canWithdraw(row, false, 1)).toBe(false);
    expect(canWithdraw(row, true, 1)).toBe(false);
  });
});

describe('Add barcode — rules § Maintaining barcodes', () => {
  it('.156 saves the barcode for this item without asking', () => {
    expect(addInput({ barcode: 'ABC 1', packSize: 12 }, 'item-1')).toEqual({
      barcode: 'ABC 1',
      itemId: 'item-1',
      packSize: 12,
    });
  });

  it('omits an unknown pack size', () => {
    expect(addInput({ barcode: 'ABC', packSize: undefined }, 'item-1')).toEqual(
      {
        barcode: 'ABC',
        itemId: 'item-1',
      }
    );
  });

  it('offers Save only once a code is typed, with a positive pack size if any', () => {
    expect(isDraftValid(EMPTY_DRAFT)).toBe(false);
    expect(isDraftValid({ barcode: '   ', packSize: undefined })).toBe(false);
    expect(isDraftValid({ barcode: RETAIL, packSize: undefined })).toBe(true);
    expect(isDraftValid({ barcode: RETAIL, packSize: 0 })).toBe(false);
    expect(isDraftValid({ barcode: RETAIL, packSize: 5 })).toBe(true);
  });

  it('accepts any barcode that is not blank, GTIN or not', () => {
    expect(isDraftValid({ barcode: 'ABC', packSize: undefined })).toBe(true);
    expect(
      isDraftValid({ barcode: '4006381333932', packSize: undefined })
    ).toBe(true);
  });
});

describe('copy', () => {
  it('.161 never calls the code a GTIN', () => {
    const copy = [
      commonEn['label.barcodes'],
      commonEn['label.add-barcode'],
      commonEn['button.move-barcode'],
      commonEn['title.move-barcode'],
      commonEn['label.move-barcode-to'],
      commonEn['title.which-item-is-this-barcode'],
      commonEn['messages.barcode-mapped-to-several-items'],
      commonEn['title.remove-barcode'],
      commonEn['messages.confirm-remove-barcode'],
      commonEn['messages.no-barcodes'],
    ];
    for (const text of copy) expect(text).not.toMatch(/gtin/i);
  });
});
