import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { setDictionaries, setLocale } from '@/intl/intl';
import commonEn from '@/intl/locales/en/common.json';
import {
  AUTO_CREATED_TARGET,
  addInput,
  asksManufacturer,
  asksPackSize,
  canMakeBarcodeVariant,
  canManageBarcodes,
  canWithdraw,
  manufacturerLabel,
  targetOptions,
  thisSiteId,
  EMPTY_DRAFT,
  isDraftValid,
  barcodeRows,
  variantLabel,
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

// A barcode on a real variant's Box level, and one on the item's auto-created
// variant.
const confirmed = {
  id: 'pv-box',
  barcode: '5012345678900',
  packSize: 10,
  itemVariantId: 'iv-real',
  isAutoCreated: false,
};
const barcodeOnly = {
  id: 'pv-auto',
  barcode: 'ABC123',
  packSize: null,
  itemVariantId: 'iv-auto',
  isAutoCreated: true,
};
const proposal = {
  id: 'p1',
  barcode: '5012345678900',
  packSize: null,
  store: { id: 'store-2', code: 'S2', storeName: 'Store two', siteId: 2 },
};
const thisStore = { __typename: 'StoreNode' as const, siteId: 1 };

const realVariant = {
  id: 'iv-real',
  name: 'Acme 10s',
  isAutoCreated: false,
  manufacturer: { id: 'm1', name: 'Acme' },
  packagingVariants: [
    { id: 'pv-unit', name: 'Unit', packSize: 1, barcode: null },
    { id: 'pv-box', name: 'Box', packSize: 10, barcode: '5012345678900' },
  ],
};
const autoVariant = {
  id: 'iv-auto',
  name: 'Barcodes',
  isAutoCreated: true,
  manufacturer: null,
  packagingVariants: [
    { id: 'pv-auto', name: 'ABC123', packSize: null, barcode: 'ABC123' },
  ],
};
const items = (variants: (typeof realVariant | typeof autoVariant)[]) => ({
  __typename: 'ItemConnector' as const,
  nodes: [{ variants }],
});
const noItems = items([]);

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

  it('.237 making a variant is central variant editing', () => {
    const editsVariants = (p: string) =>
      p === 'ITEM_NAMES_CODES_AND_UNITS_MUTATE';
    expect(canMakeBarcodeVariant(editsVariants, true)).toBe(true);
    expect(canMakeBarcodeVariant(editsVariants, false)).toBe(false);
    expect(canMakeBarcodeVariant(p => p === 'ITEM_MUTATE', true)).toBe(false);
  });
});

describe('rows — rules § Maintaining barcodes', () => {
  const data = {
    itemBarcodes: [confirmed, barcodeOnly],
    itemBarcodeProposals: [proposal],
    items: items([realVariant, autoVariant]),
    store: thisStore,
  };

  it('lists confirmed barcodes with their variants, then proposals', () => {
    expect(barcodeRows(data)).toEqual([
      { status: 'confirmed', barcode: confirmed, variant: realVariant },
      { status: 'confirmed', barcode: barcodeOnly, variant: autoVariant },
      { status: 'proposed', barcode: proposal },
    ]);
  });

  it('.238 names the variant and packaging level a barcode is on', () => {
    const [onReal, onAuto, proposed] = barcodeRows(data);
    expect(variantLabel(onReal!)).toBe('Acme 10s – Box');
    expect(manufacturerLabel(onReal!)).toBe('Acme');
    // .236 a barcode-only variant isn't named: it isn't a variant to anyone
    // but central.
    expect(variantLabel(onAuto!)).toBe('');
    expect(variantLabel(proposed!)).toBe('');
  });

  it('leaves out a packaging level named only for its barcode', () => {
    const variant = {
      ...realVariant,
      packagingVariants: [
        {
          id: 'pv-box',
          name: '5012345678900',
          packSize: 10,
          barcode: '5012345678900',
        },
      ],
    };
    expect(
      variantLabel({ status: 'confirmed', barcode: confirmed, variant })
    ).toBe('Acme 10s');
  });
});

describe('where central puts a barcode — rules § Maintaining barcodes', () => {
  it('.235 offers barcode only first, then empty packaging levels and a new one per real variant', () => {
    expect(
      targetOptions([realVariant, autoVariant]).map(option => option.target)
    ).toEqual([
      { kind: 'auto-created' },
      { kind: 'packaging-variant', id: 'pv-unit' },
      { kind: 'item-variant', id: 'iv-real' },
    ]);
  });

  it('.235 with no variants, only barcode only', () => {
    expect(targetOptions([]).map(option => option.value)).toEqual([
      AUTO_CREATED_TARGET,
    ]);
  });

  it('asks a pack size unless the packaging level has its own, and a manufacturer only for barcode only', () => {
    const packaging = { kind: 'packaging-variant', id: 'pv-unit' } as const;
    const variant = { kind: 'item-variant', id: 'iv-real' } as const;
    const auto = { kind: 'auto-created' } as const;
    expect([auto, variant, packaging].map(asksPackSize)).toEqual([
      true,
      true,
      false,
    ]);
    expect([auto, variant, packaging].map(asksManufacturer)).toEqual([
      true,
      false,
      false,
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
      items: noItems,
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
    const row = {
      status: 'confirmed' as const,
      barcode: confirmed,
      variant: realVariant,
    };
    expect(canWithdraw(row, false, 1)).toBe(false);
    expect(canWithdraw(row, true, 1)).toBe(false);
  });
});

describe('Add barcode — rules § Maintaining barcodes', () => {
  const draft = (barcode: string, packSize?: number) => ({
    ...EMPTY_DRAFT,
    barcode,
    packSize,
  });
  const acme = { id: 'm1', name: 'Acme' };

  it('.156 saves the barcode for this item without asking', () => {
    expect(
      addInput({ ...draft('ABC 1', 12), manufacturer: acme }, 'item-1')
    ).toEqual({
      barcode: 'ABC 1',
      itemId: 'item-1',
      packSize: 12,
      manufacturerId: 'm1',
    });
  });

  it('omits an unknown pack size and manufacturer', () => {
    expect(addInput(draft('ABC'), 'item-1')).toEqual({
      barcode: 'ABC',
      itemId: 'item-1',
    });
  });

  it('.235 on central, sends only what the barcode needs where it goes', () => {
    const full = { ...draft('ABC', 12), manufacturer: acme };
    expect(
      addInput(full, 'item-1', { kind: 'packaging-variant', id: 'pv-unit' })
    ).toEqual({ barcode: 'ABC', itemId: 'item-1' });
    expect(
      addInput(full, 'item-1', { kind: 'item-variant', id: 'iv-real' })
    ).toEqual({ barcode: 'ABC', itemId: 'item-1', packSize: 12 });
    expect(addInput(full, 'item-1', { kind: 'auto-created' })).toEqual({
      barcode: 'ABC',
      itemId: 'item-1',
      packSize: 12,
      manufacturerId: 'm1',
    });
  });

  it('offers Save only once a code is typed, with a positive pack size if any', () => {
    expect(isDraftValid(EMPTY_DRAFT)).toBe(false);
    expect(isDraftValid(draft('   '))).toBe(false);
    expect(isDraftValid(draft(RETAIL))).toBe(true);
    expect(isDraftValid(draft(RETAIL, 0))).toBe(false);
    expect(isDraftValid(draft(RETAIL, 5))).toBe(true);
  });

  it('accepts any barcode that is not blank, GTIN or not', () => {
    expect(isDraftValid(draft('ABC'))).toBe(true);
    expect(isDraftValid(draft('4006381333932'))).toBe(true);
  });
});

describe('copy', () => {
  it('.161 never calls the code a GTIN', () => {
    const copy = [
      commonEn['label.barcodes'],
      commonEn['label.add-barcode'],
      commonEn['title.confirm-barcode'],
      commonEn['label.barcode-target'],
      commonEn['label.barcode-target-auto-created'],
      commonEn['description.barcode-target-auto-created'],
      commonEn['label.barcode-confirmed-barcode-only'],
      commonEn['messages.confirm-make-variant'],
      commonEn['title.which-item-is-this-barcode'],
      commonEn['messages.barcode-mapped-to-several-items'],
      commonEn['title.remove-barcode'],
      commonEn['messages.confirm-remove-barcode'],
      commonEn['messages.no-barcodes'],
    ];
    for (const text of copy) expect(text).not.toMatch(/gtin/i);
  });
});
