import { describe, expect, it } from 'vitest';
import { readText, scanCode, type BarcodeLookup } from '@/domain/barcode';
import {
  borrowDates,
  captureBatch,
  captureMessage,
  chooseItem,
  codeToLearn,
  draftFromScan,
  matchingLine,
  saveRefusal,
  shortContent,
  type CaptureItem,
  type CaptureRead,
} from './captureScan';

// The capture window's decisions (spec/barcode-scanning/rules.md § Learning
// a code while receiving; ui-surface.md § S2).

const GS = '\u001d';
const GTIN = '05012345678900';
const RETAIL = '4006381333931'; // EAN-13, valid check digit

const read = (text: string): CaptureRead => {
  const scan = readText(text);
  if (scan.kind === 'unreadable') throw new Error('unreadable');
  return scan;
};

const item: CaptureItem = {
  id: 'item-1',
  code: 'PARA',
  name: 'Paracetamol',
  defaultPackSize: 10,
  defaultSellPricePerPack: 5,
};

const known = (packSize: number | null): BarcodeLookup => ({
  kind: 'known',
  barcode: { id: 'b-1', gtin: GTIN, itemId: 'item-1', packSize },
});

const LABEL = read(`01${GTIN}10AB12${GS}17271231`);

describe('draftFromScan', () => {
  it('.31 a recognised code fills in the item and locks it', () => {
    const draft = draftFromScan(
      LABEL,
      known(null),
      item
    );
    expect(draft.item).toBe(item);
    expect(draft.itemLocked).toBe(true);
    expect(draft.packSizeLocked).toBe(false);
    expect(draft.learnCode).toBeUndefined();
  });

  it('.32 a recognised code carrying a pack size fills it in and locks it', () => {
    const draft = draftFromScan(
      LABEL,
      known(24),
      item
    );
    expect(draft.packSize).toBe(24);
    expect(draft.packSizeLocked).toBe(true);
  });

  it('.108 the locked pack size shows the book value, not the label value', () => {
    const draft = draftFromScan(
      read(`01${GTIN}3712${GS}10AB12`),
      known(24),
      item
    );
    expect(draft.packSize).toBe(24);
    expect(draft.packSizeLocked).toBe(true);
  });

  it(".102 a known code with no pack size in the book takes the item's default", () => {
    const draft = draftFromScan(LABEL, known(null), item);
    expect(draft.packSize).toBe(10);
    expect(draft.packSizeLocked).toBe(false);
  });

  it('.33 an unrecognised item number leaves the item empty and is learnable', () => {
    const draft = draftFromScan(LABEL, { kind: 'unknown' }, undefined);
    expect(draft.item).toBeUndefined();
    expect(draft.itemLocked).toBe(false);
    expect(draft.learnCode).toBe(GTIN);
  });

  it('.65 an unrecognised retail barcode is learnable', () => {
    const draft = draftFromScan(read(RETAIL), { kind: 'unknown' }, undefined);
    expect(draft.learnCode).toBe(RETAIL);
  });

  it('.70 a plain code that is not a retail barcode is not learnable', () => {
    const scan = read('WAREHOUSE-7');
    expect(scanCode(scan)).toBe('WAREHOUSE-7');
    const draft = draftFromScan(scan, { kind: 'unknown' }, undefined);
    expect(draft.learnCode).toBeUndefined();
    expect(draft.itemNumber).toBeUndefined();
  });

  it('.67 a label without an item number has no code, and keeps its values', () => {
    const scan = read(`${GS}10AB12${GS}17271231`);
    expect(scanCode(scan)).toBeUndefined();
    const draft = draftFromScan(scan, { kind: 'no-code' }, undefined);
    expect(draft.batch).toBe('AB12');
    expect(draft.expiryDate).toBe('2027-12-31');
    expect(draft.learnCode).toBeUndefined();
  });

  it('.20 batch, dates and quantity pre-fill from the label', () => {
    const draft = draftFromScan(
      read(`01${GTIN}10AB12${GS}17271231${GS}11250101${GS}306`),
      { kind: 'unknown' },
      undefined
    );
    expect(draft).toMatchObject({
      batch: 'AB12',
      expiryDate: '2027-12-31',
      manufactureDate: '2025-01-01',
      quantity: 6,
      packSize: 1,
    });
  });

  it('.74 a known code whose item cannot be resolved opens unlocked', () => {
    const draft = draftFromScan(LABEL, known(24), undefined);
    expect(draft.itemLocked).toBe(false);
    expect(draft.codeKnown).toBe(true);
    expect(draft.learnCode).toBeUndefined();
    // The entry's pack size belongs to an item this store cannot see.
    expect(draft.packSizeLocked).toBe(false);
    expect(draft.packSize).toBe(1);
  });

  it('a failed lookup opens like a scan with no code', () => {
    const draft = draftFromScan(LABEL, { kind: 'failed' }, undefined);
    expect(draft.codeKnown).toBe(false);
    expect(draft.learnCode).toBeUndefined();
  });
});

describe('chooseItem', () => {
  const unknown = draftFromScan(LABEL, { kind: 'unknown' }, undefined);

  it("takes the item's default pack size when the label gave none", () => {
    expect(chooseItem(unknown, item, undefined).packSize).toBe(10);
  });

  it("keeps the label's pack size over the item's default", () => {
    expect(chooseItem(unknown, item, 12).packSize).toBe(12);
  });
});

describe('matchingLine', () => {
  const lines = [
    { id: 'a', batch: 'AB12', packSize: 10, numberOfPacks: 3 },
    { id: 'b', batch: null, packSize: 10, numberOfPacks: 1 },
  ];

  it('.35 matches on item, batch and pack size together', () => {
    const draft = { item, batch: 'AB12', packSize: 10, expiryDate: null };
    expect(matchingLine(draft, lines)?.id).toBe('a');
    expect(matchingLine({ ...draft, packSize: 5 }, lines)).toBeUndefined();
  });

  it('an empty batch matches a line with none', () => {
    expect(matchingLine({ item, batch: ' ', packSize: 10, expiryDate: null }, lines)?.id).toBe(
      'b'
    );
  });

  it('matches nothing without an item', () => {
    expect(
      matchingLine(
        { item: undefined, batch: 'AB12', packSize: 10, expiryDate: null },
        lines
      )
    ).toBeUndefined();
  });

  it('.5 a different expiry is a separate line; a blank expiry matches any', () => {
    const dated = [
      { id: 'a', batch: 'AB12', packSize: 10, numberOfPacks: 3, expiryDate: '2027-12-31' },
      { id: 'c', batch: 'CD34', packSize: 10, numberOfPacks: 2, expiryDate: null },
    ];
    const draft = { item, batch: 'AB12', packSize: 10 };
    expect(matchingLine({ ...draft, expiryDate: '2027-12-31' }, dated)?.id).toBe('a');
    expect(matchingLine({ ...draft, expiryDate: '2028-06-30' }, dated)).toBeUndefined();
    expect(matchingLine({ ...draft, expiryDate: null }, dated)?.id).toBe('a');
    expect(
      matchingLine({ ...draft, batch: 'CD34', expiryDate: '2028-06-30' }, dated)?.id
    ).toBe('c');
  });
});

describe('borrowDates', () => {
  it("fills the label's blanks from the matched line", () => {
    const draft = draftFromScan(
      read(`01${GTIN}10AB12`),
      { kind: 'unknown' },
      undefined
    );
    const borrowed = borrowDates(draft, {
      id: 'a',
      packSize: 1,
      numberOfPacks: 1,
      expiryDate: '2028-01-31',
      manufactureDate: '2024-06-01',
    });
    expect(borrowed.expiryDate).toBe('2028-01-31');
    expect(borrowed.manufactureDate).toBe('2024-06-01');
  });

  it("never overwrites the label's own date", () => {
    const draft = draftFromScan(LABEL, { kind: 'unknown' }, undefined);
    const borrowed = borrowDates(draft, {
      id: 'a',
      packSize: 1,
      numberOfPacks: 1,
      expiryDate: '2028-01-31',
    });
    expect(borrowed.expiryDate).toBe('2027-12-31');
  });
});

describe('captureMessage', () => {
  it('.70 .110 no item number, no item: says it identifies no product', () => {
    expect(
      captureMessage({ item: undefined, itemNumber: undefined, codeKnown: false }, undefined)
        .key
    ).toBe('messages.receiving-no-product-code');
  });

  it('.33 .110 an unknown item number, no item: a new barcode to remember', () => {
    expect(
      captureMessage({ item: undefined, itemNumber: GTIN, codeKnown: false }, undefined).key
    ).toBe('messages.receiving-new-barcode');
  });

  // The book is not a catalogue: the code is known, but its item is not
  // visible here — nothing will be learned, so nothing is promised.
  it('.74 a known code whose item cannot be resolved: not saved for future scans', () => {
    expect(
      captureMessage(
        { item: undefined, itemNumber: GTIN, codeKnown: true },
        undefined
      )
    ).toEqual({ key: 'messages.receiving-item-not-in-store' });
  });

  it('.36 an item and no match: a new line will be created', () => {
    expect(captureMessage({ item, itemNumber: GTIN, codeKnown: true }, undefined).key).toBe(
      'messages.batch-not-found'
    );
  });

  it('.35 an item and a match: reports its current quantity', () => {
    expect(
      captureMessage(
        { item, itemNumber: GTIN, codeKnown: true },
        { id: 'a', packSize: 10, numberOfPacks: 3 }
      )
    ).toEqual({
      key: 'messages.batch-already-exists',
      numberOfPacks: 3,
    });
  });
});

describe('saveRefusal', () => {
  it('.38 refuses with no item chosen', () => {
    expect(saveRefusal({ item: undefined, quantity: 5 })).toBe(
      'error.barcode-scanner-save-no-item-selected'
    );
  });

  it('.39 refuses with the quantity still zero', () => {
    expect(saveRefusal({ item, quantity: 0 })).toBe(
      'error.barcode-scanner-save-no-quantity-entered'
    );
  });

  it('.40 allows a save with an item and a quantity above zero', () => {
    expect(saveRefusal({ item, quantity: 1 })).toBeUndefined();
  });
});

describe('captureBatch', () => {
  const context = { invoiceId: 'inv', costLocked: false, newLineId: 'new' };
  const draft = {
    ...draftFromScan(
      LABEL,
      known(10),
      item
    ),
    quantity: 4,
  };

  it('.36 inserts a new line from the fields on screen', () => {
    expect(captureBatch(draft, undefined, context)).toEqual({
      insertInboundShipmentLines: [
        {
          id: 'new',
          invoiceId: 'inv',
          itemId: 'item-1',
          packSize: 10,
          numberOfPacks: 4,
          batch: 'AB12',
          expiryDate: '2027-12-31',
          manufactureDate: undefined,
          costPricePerPack: 5,
          sellPricePerPack: 5,
        },
      ],
    });
  });

  it('.35 adds the quantity to the matched line, filling a date it lacks', () => {
    expect(
      captureBatch(
        draft,
        { id: 'a', batch: 'AB12', packSize: 10, numberOfPacks: 3 },
        context
      )
    ).toEqual({
      updateInboundShipmentLines: [
        {
          id: 'a',
          numberOfPacks: 7,
          expiryDate: { value: '2027-12-31' },
        },
      ],
    });
  });

  it(".103 never overwrites the matched line's own dates", () => {
    expect(
      captureBatch(
        { ...draft, manufactureDate: '2025-01-01' },
        {
          id: 'a',
          batch: 'AB12',
          packSize: 10,
          numberOfPacks: 3,
          expiryDate: '2028-06-30',
          manufactureDate: '2024-06-01',
        },
        context
      )
    ).toEqual({
      updateInboundShipmentLines: [{ id: 'a', numberOfPacks: 7 }],
    });
  });

  it('OMS-REG-REPL-09.11 prices are zero off the default pack size', () => {
    const line = captureBatch({ ...draft, packSize: 20 }, undefined, context)
      ?.insertInboundShipmentLines?.[0];
    expect(line?.costPricePerPack).toBe(0);
    expect(line?.sellPricePerPack).toBe(0);
  });

  it('prices are zero where a source link locks cost', () => {
    const line = captureBatch(draft, undefined, {
      ...context,
      costLocked: true,
    })?.insertInboundShipmentLines?.[0];
    expect(line?.costPricePerPack).toBe(0);
  });

  it('builds nothing while refused', () => {
    expect(captureBatch({ ...draft, quantity: 0 }, undefined, context)).toBe(
      undefined
    );
  });
});

describe('codeToLearn', () => {
  it('.25 learns an unknown item number against the chosen item', () => {
    const draft = chooseItem(
      draftFromScan(LABEL, { kind: 'unknown' }, undefined),
      item,
      undefined
    );
    expect(codeToLearn(draft)).toEqual({
      gtin: GTIN,
      itemId: 'item-1',
      packSize: 10,
    });
  });

  it('learns nothing for a known code', () => {
    const draft = draftFromScan(
      LABEL,
      known(null),
      item
    );
    expect(codeToLearn(draft)).toBeUndefined();
  });

  it('.70 learns nothing for a plain code', () => {
    const draft = chooseItem(
      draftFromScan(read('WAREHOUSE-7'), { kind: 'unknown' }, undefined),
      item,
      undefined
    );
    expect(codeToLearn(draft)).toBeUndefined();
  });
});

describe('shortContent', () => {
  it('shortens a long scan with an ellipsis', () => {
    expect(shortContent('0123456789ABC')).toBe('0123456789...');
    expect(shortContent('short')).toBe('short');
  });
});
