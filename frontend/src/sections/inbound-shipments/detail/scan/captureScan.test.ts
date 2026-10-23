import { describe, expect, it } from 'vitest';
import { readText, scanCode, type BarcodeLookup } from '@/domain/barcode';
import {
  borrowDates,
  captureBatch,
  captureMessage,
  chooseItem,
  draftFromScan,
  isUnrecognised,
  matchingLine,
  saveRefusal,
  shortContent,
  type CaptureItem,
  type CaptureRead,
} from './captureScan';

// The capture window's decisions (spec/barcode-scanning/rules.md § Receiving
// by scanning; ui-surface.md § S2).

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
  barcode: {
    id: 'b-1',
    value: `gtin:${GTIN.padStart(14, '0')}`,
    barcode: GTIN,
    itemId: 'item-1',
    packSize,
    status: 'PROPOSED',
  },
});

const LABEL = read(`01${GTIN}10AB12${GS}17271231`);

describe('draftFromScan', () => {
  it('.31 a recognised code fills in the item and locks it', () => {
    const draft = draftFromScan(LABEL, known(null), item);
    expect(draft.item).toBe(item);
    expect(draft.itemLocked).toBe(true);
    // A mapped barcode goes with the new line in its standard form.
    expect(draft.barcode).toBe(GTIN);
  });

  it('.196 a recognised code carrying a pack size pre-fills it', () => {
    const draft = draftFromScan(LABEL, known(24), item);
    expect(draft.packSize).toBe(24);
    expect(draft.mappingPackSize).toBe(24);
  });

  it('.196 the mapping pack size wins over the label value', () => {
    const draft = draftFromScan(
      read(`01${GTIN}3712${GS}10AB12`),
      known(24),
      item
    );
    expect(draft.packSize).toBe(24);
  });

  it(".102 a known code with no pack size on its mapping takes the item's default", () => {
    const draft = draftFromScan(LABEL, known(null), item);
    expect(draft.packSize).toBe(10);
  });

  it('.33 an unrecognised item number leaves the item empty and is sent to be learned', () => {
    const draft = draftFromScan(LABEL, { kind: 'unknown' }, undefined);
    expect(draft.item).toBeUndefined();
    expect(draft.itemLocked).toBe(false);
    expect(draft.barcode).toBe(GTIN);
  });

  it('.65 an unrecognised retail barcode is sent as read (the server pads it)', () => {
    const draft = draftFromScan(read(RETAIL), { kind: 'unknown' }, undefined);
    expect(draft.barcode).toBe(RETAIL);
  });

  it('.70 a plain code that is not a retail barcode is not sent', () => {
    const scan = read('WAREHOUSE-7');
    expect(scanCode(scan)).toBe('WAREHOUSE-7');
    const draft = draftFromScan(scan, { kind: 'unknown' }, undefined);
    expect(draft.barcode).toBeUndefined();
  });

  it('a known plain barcode resolves the item and is carried', () => {
    const scan = read('SHIP-0042');
    const lookup: BarcodeLookup = {
      kind: 'known',
      barcode: {
        id: 'b-2',
        value: 'plain:SHIP-0042',
        barcode: 'SHIP-0042',
        itemId: 'item-1',
        packSize: null,
        status: 'PROPOSED',
      },
    };
    const draft = draftFromScan(scan, lookup, item);
    expect(draft.item).toBe(item);
    expect(draft.barcode).toBe('SHIP-0042');
  });

  it("an unknown label's item number is carried, whatever its check digit", () => {
    const draft = draftFromScan(
      read(`0105012345678901`),
      { kind: 'unknown' },
      undefined
    );
    expect(draft.barcode).toBe('05012345678901');
  });

  it('.67 a label without an item number has no code, and keeps its values', () => {
    const scan = read(`${GS}10AB12${GS}17271231`);
    expect(scanCode(scan)).toBeUndefined();
    const draft = draftFromScan(scan, { kind: 'no-code' }, undefined);
    expect(draft.batch).toBe('AB12');
    expect(draft.expiryDate).toBe('2027-12-31');
    expect(draft.barcode).toBeUndefined();
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

  it('.205 a mapped barcode whose item cannot be found opens like a new one', () => {
    const draft = draftFromScan(LABEL, known(24), undefined);
    expect(draft.itemLocked).toBe(false);
    // Choosing an item and saving maps the barcode to it as well.
    expect(draft.barcode).toBe(GTIN);
    // The entry's pack size belongs to an item this store cannot see.
    expect(draft.mappingPackSize).toBeUndefined();
    expect(draft.packSize).toBe(1);
  });

  it('a failed lookup opens like a scan with no code', () => {
    const draft = draftFromScan(LABEL, { kind: 'failed' }, undefined);
    expect(draft.barcode).toBeUndefined();
  });
});

describe('isUnrecognised', () => {
  const unknown: BarcodeLookup = { kind: 'unknown' };

  it('.202 a plain code that matched nothing is not recognised', () => {
    expect(isUnrecognised(read('SHIP-0042'), unknown)).toBe(true);
  });

  it('.202 an empty scan is not recognised', () => {
    expect(isUnrecognised(read(''), { kind: 'no-code' })).toBe(true);
  });

  it('.33 an unknown retail barcode or label item number still opens an entry', () => {
    expect(isUnrecognised(read(RETAIL), unknown)).toBe(false);
    expect(isUnrecognised(read(`01${GTIN}`), unknown)).toBe(false);
  });

  it('.188 a batch label still opens an entry', () => {
    expect(
      isUnrecognised(read(`${GS}10AB12${GS}17271231`), { kind: 'no-code' })
    ).toBe(false);
  });

  it('a plain code the lookup knows, or a failed lookup, still opens an entry', () => {
    expect(isUnrecognised(read('SHIP-0042'), known(null))).toBe(false);
    expect(isUnrecognised(read('SHIP-0042'), { kind: 'failed' })).toBe(false);
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

  it('.176 matches on item, batch and pack size together', () => {
    const draft = { item, batch: 'AB12', packSize: 10, barcode: undefined };
    expect(matchingLine(draft, lines)?.id).toBe('a');
    expect(matchingLine({ ...draft, packSize: 5 }, lines)).toBeUndefined();
  });

  it('an empty batch matches a line with none', () => {
    expect(
      matchingLine(
        { item, batch: ' ', packSize: 10, barcode: undefined },
        lines
      )?.id
    ).toBe('b');
  });

  it('matches nothing without an item', () => {
    expect(
      matchingLine(
        { item: undefined, batch: 'AB12', packSize: 10, barcode: undefined },
        lines
      )
    ).toBeUndefined();
  });

  it('.175 two different barcodes keep lines of one batch apart', () => {
    const coded = [
      { id: 'a', batch: 'AB12', packSize: 10, numberOfPacks: 3, barcode: GTIN },
    ];
    const draft = { item, batch: 'AB12', packSize: 10 };
    expect(matchingLine({ ...draft, barcode: GTIN }, coded)?.id).toBe('a');
    expect(
      matchingLine({ ...draft, barcode: '05099999999994' }, coded)
    ).toBeUndefined();
  });

  it('.175 a line or a scan without a barcode still matches', () => {
    const draft = { item, batch: 'AB12', packSize: 10 };
    // Typed in by hand, then a scanned box of the same batch.
    expect(matchingLine({ ...draft, barcode: GTIN }, lines)?.id).toBe('a');
    const coded = [
      { id: 'a', batch: 'AB12', packSize: 10, numberOfPacks: 3, barcode: GTIN },
    ];
    expect(matchingLine({ ...draft, barcode: undefined }, coded)?.id).toBe('a');
  });

  it('.173 a 13-digit scan matches the 14-digit barcode on a line', () => {
    const coded = [
      {
        id: 'a',
        batch: 'AB12',
        packSize: 10,
        numberOfPacks: 3,
        barcode: `0${RETAIL}`,
      },
    ];
    expect(
      matchingLine(
        { item, batch: 'AB12', packSize: 10, barcode: RETAIL },
        coded
      )?.id
    ).toBe('a');
  });

  it('dates are not part of the match', () => {
    const dated = [
      {
        id: 'a',
        batch: 'AB12',
        packSize: 10,
        numberOfPacks: 3,
        expiryDate: '2027-12-31',
      },
    ];
    expect(
      matchingLine(
        { item, batch: 'AB12', packSize: 10, barcode: undefined },
        dated
      )?.id
    ).toBe('a');
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
  it('.110 no barcode to remember, no item: says it identifies no product', () => {
    expect(
      captureMessage({ item: undefined, barcode: undefined }, undefined).key
    ).toBe('messages.receiving-no-product-code');
  });

  it('.33 .205 a barcode to remember, no item: a new barcode to remember', () => {
    expect(
      captureMessage({ item: undefined, barcode: GTIN }, undefined).key
    ).toBe('messages.receiving-new-barcode');
  });

  it('.36 an item and no match: a new line will be created', () => {
    expect(captureMessage({ item, barcode: GTIN }, undefined).key).toBe(
      'messages.batch-not-found'
    );
  });

  it('.176 an item and a match: reports its current quantity', () => {
    expect(
      captureMessage(
        { item, barcode: GTIN },
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
    expect(saveRefusal({ item: undefined })).toBe(
      'error.barcode-scanner-save-no-item-selected'
    );
  });

  it('.199 allows a save once an item is chosen', () => {
    expect(saveRefusal({ item })).toBeUndefined();
  });
});

describe('captureBatch', () => {
  const context = { invoiceId: 'inv', costLocked: false, newLineId: 'new' };
  const draft = {
    ...draftFromScan(LABEL, known(10), item),
    quantity: 4,
  };

  it('.36 .185 inserts a new line from the fields on screen, with its barcode', () => {
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
          barcode: GTIN,
        },
      ],
    });
  });

  it('.176 adds the quantity to the matched line, filling a date it lacks', () => {
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
          barcode: GTIN,
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
          barcode: GTIN,
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
    expect(
      captureBatch({ ...draft, item: undefined }, undefined, context)
    ).toBe(undefined);
  });

  it('.198 a quantity of zero inserts a placeholder line', () => {
    const line = captureBatch({ ...draft, quantity: 0 }, undefined, context)
      ?.insertInboundShipmentLines?.[0];
    expect(line?.numberOfPacks).toBe(0);
  });

  it('.198 adding zero to a matched line with nothing to fill sends nothing', () => {
    expect(
      captureBatch(
        { ...draft, quantity: 0 },
        {
          id: 'a',
          batch: 'AB12',
          packSize: 10,
          numberOfPacks: 3,
          expiryDate: '2027-12-31',
          barcode: GTIN,
        },
        context
      )
    ).toBeUndefined();
  });

  it('.197 gives a matched line without a barcode the scanned one', () => {
    expect(
      captureBatch(
        draft,
        {
          id: 'a',
          batch: 'AB12',
          packSize: 10,
          numberOfPacks: 3,
          expiryDate: '2027-12-31',
        },
        context
      )
    ).toEqual({
      updateInboundShipmentLines: [
        { id: 'a', numberOfPacks: 7, barcode: GTIN },
      ],
    });
  });
});

describe('the barcode a new line carries', () => {
  const context = { invoiceId: 'inv', costLocked: false, newLineId: 'new' };
  const inserted = (draft: Parameters<typeof captureBatch>[0]) =>
    captureBatch({ ...draft, quantity: 1 }, undefined, context)
      ?.insertInboundShipmentLines?.[0];

  it('.25 an unknown item number goes with the line, to be learned for the chosen item', () => {
    const draft = chooseItem(
      draftFromScan(LABEL, { kind: 'unknown' }, undefined),
      item,
      undefined
    );
    expect(inserted(draft)?.barcode).toBe(GTIN);
  });

  it('.70 a plain code does not go with the line', () => {
    const draft = chooseItem(
      draftFromScan(read('WAREHOUSE-7'), { kind: 'unknown' }, undefined),
      item,
      undefined
    );
    expect(inserted(draft)).not.toHaveProperty('barcode');
  });
});

describe('shortContent', () => {
  it('shortens a long scan with an ellipsis', () => {
    expect(shortContent('0123456789ABC')).toBe('0123456789...');
    expect(shortContent('short')).toBe('short');
  });
});
