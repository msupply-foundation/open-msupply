import { describe, expect, it } from 'vitest';
import type { AllocationPreferences } from '@/domain/allocation';
import type { DispensedRecord } from './dispensedVisit';
import type { SimpleSaveChangesResult } from './dispensedVisit.generated';
import {
  afterDeleteRead,
  changesNothing,
  editInput,
  editOutcome,
  givesListed,
  saveChanges,
  visitListLines,
  withKeptAmounts,
  withOwnStock,
  type EditCalls,
  type EditInput,
  type RecordLine,
  type RecordRead,
} from './editVisit';
import {
  buildCards,
  linePrice,
  shortLines,
  stockFor,
  type CardItem,
  type ListLine,
  type MedicineCard,
  type SaveReply,
} from './simpleDispensingLogic';

const PREFS: AllocationPreferences = {
  expiredStockPreventIssue: false,
  expiredStockIssueThreshold: 0,
  manageVvmStatusForStock: false,
  sortByVvmStatusThenExpiry: false,
};
const TODAY = new Date(2026, 10, 10);

type Batch = CardItem['availableBatches']['nodes'][number];
const batch = (id: string, over: Partial<Batch> = {}): Batch => ({
  id,
  availableNumberOfPacks: 10,
  packSize: 1,
  sellPricePerPack: 1,
  expiryDate: '2030-01-01',
  onHold: false,
  location: null,
  vvmStatus: null,
  ...over,
});

const item = (id: string, batches: Batch[] = []): CardItem => ({
  id,
  code: id.toUpperCase(),
  name: `Item ${id}`,
  unitName: 'Tablet',
  defaultPricePerUnit: null,
  availableBatches: { __typename: 'StockLineConnector', nodes: batches },
});

/** A line of the record: `packs` taken from `from`, charged `price` a pack. */
const recordLine = (
  id: string,
  itemId: string,
  from: Batch,
  packs: number,
  price = from.sellPricePerPack
): RecordLine => ({
  id,
  type: 'STOCK_OUT',
  itemId,
  itemName: `Item ${itemId}`,
  packSize: from.packSize,
  numberOfPacks: packs,
  totalAfterTax: packs * price,
  sellPricePerPack: price,
  stockLine: from,
  item: { id: itemId, unitName: 'Tablet' },
});

const cardsOf = (items: CardItem[]): MedicineCard[] =>
  buildCards(
    items.map(i => ({ itemId: i.id, amounts: [] })),
    items,
    PREFS,
    TODAY
  );

const record = (
  lines: RecordLine[],
  status: DispensedRecord['status'] = 'PICKED'
): DispensedRecord => ({
  __typename: 'InvoiceNode',
  id: 'rx',
  status,
  isCancellation: false,
  createdDatetime: '2026-11-20T09:24:00Z',
  backdatedDatetime: null,
  cancelledDatetime: null,
  patient: { id: 'p', name: 'Somchai', code: 'P1', isUnnamed: false },
  pricing: { totalAfterTax: 0 },
  lines: { nodes: lines },
});

const ids = () => {
  let n = 0;
  return (batchId: string) => `new-${batchId}-${++n}`;
};

describe('visitListLines (rules › editing a dispensed visit)', () => {
  // OMS-REG-DIS-12.285
  it('puts each medicine on the list once, with the amount the visit gave', () => {
    const early = batch('early');
    const late = batch('late', { expiryDate: '2031-01-01' });
    expect(
      visitListLines([
        recordLine('l1', 'para', early, 6),
        recordLine('l2', 'para', late, 4),
        recordLine('l3', 'amox', batch('a'), 2),
      ])
    ).toEqual([
      { itemId: 'amox', units: 2 },
      { itemId: 'para', units: 10 },
    ]);
  });
});

describe('withOwnStock (rules › editing a dispensed visit)', () => {
  // OMS-REG-DIS-12.286
  it('adds back what the visit took from a batch, at the price it was charged', () => {
    const b = batch('b', { availableNumberOfPacks: 4, sellPricePerPack: 2 });
    const [para] = withOwnStock(
      [item('para', [b])],
      [recordLine('l1', 'para', b, 6, 1.5)]
    );
    expect(para?.availableBatches.nodes).toEqual([
      { ...b, availableNumberOfPacks: 10, sellPricePerPack: 1.5 },
    ]);
  });

  // OMS-REG-DIS-12.286
  it('brings back a batch the visit emptied, from the visit’s own line', () => {
    const emptied = batch('gone', { availableNumberOfPacks: 0 });
    const [para] = withOwnStock(
      [item('para', [batch('other')])],
      [recordLine('l1', 'para', emptied, 5)]
    );
    expect(para?.availableBatches.nodes.map(b => b.id)).toEqual([
      'other',
      'gone',
    ]);
    expect(para?.availableBatches.nodes[1]?.availableNumberOfPacks).toBe(5);
  });

  it('leaves an item the visit took nothing of as it is', () => {
    const amox = item('amox', [batch('a')]);
    const [same] = withOwnStock(
      [amox],
      [recordLine('l1', 'para', batch('b'), 1)]
    );
    expect(same).toBe(amox);
  });

  // OMS-REG-DIS-12.286, rules › editing a dispensed visit: a medicine on the
  // default price list whose price went up after the visit. The server keeps
  // an updated line's price and charges a new line today's default, so the
  // list must price the same way.
  it('prices the visit’s own units at what they were charged, and more units at today’s default price', () => {
    // Dispensed 10 at the old default of 1.00; the default is now 1.20.
    const own = batch('own', {
      availableNumberOfPacks: 0,
      sellPricePerPack: 1,
    });
    const next = batch('next', {
      expiryDate: '2031-01-01',
      sellPricePerPack: 0.5,
    });
    const para: CardItem = {
      ...item('para', [next]),
      defaultPricePerUnit: 1.2,
    };
    const [card] = cardsOf(
      withOwnStock([para], [recordLine('l1', 'para', own, 10, 1)])
    );
    // Kept at 10: what the visit was charged.
    expect(linePrice(card, 10)).toBeCloseTo(10, 9);
    // Raised to 12: the visit's 10 at 1.00, the 2 more at today's 1.20.
    expect(linePrice(card, 12)).toBeCloseTo(12.4, 9);
  });
});

describe('editInput (contract › editing a dispensed visit)', () => {
  const b1 = batch('b1', { availableNumberOfPacks: 0 });
  const b2 = batch('b2', { expiryDate: '2031-01-01' });
  const own = [recordLine('l1', 'para', b1, 5)];
  const cards = cardsOf(withOwnStock([item('para', [b2])], own));

  it('changes the amount on the visit’s own line, keeping its batch', () => {
    const input = editInput(
      'rx',
      own,
      [{ itemId: 'para', units: 3 }],
      cards,
      ids()
    );
    expect(input.updatePrescriptionLines).toEqual([
      { id: 'l1', numberOfPacks: 3 },
    ]);
    expect(input.insertPrescriptionLines).toEqual([]);
    expect(input.deletePrescriptionLines).toEqual([]);
  });

  it('takes more from the next batch with a new line once its own batch is used up', () => {
    const input = editInput(
      'rx',
      own,
      [{ itemId: 'para', units: 8 }],
      cards,
      ids()
    );
    expect(input.updatePrescriptionLines).toEqual([]);
    expect(input.insertPrescriptionLines).toEqual([
      { id: 'new-b2-1', invoiceId: 'rx', stockLineId: 'b2', numberOfPacks: 3 },
    ]);
  });

  // OMS-REG-DIS-12.288
  it('deletes the lines of a medicine taken off the list, and adds one put on it', () => {
    const amox = batch('a');
    const input = editInput(
      'rx',
      own,
      [{ itemId: 'amox', units: 2 }],
      [...cards, ...cardsOf([item('amox', [amox])])],
      ids()
    );
    expect(input.deletePrescriptionLines).toEqual([{ id: 'l1' }]);
    expect(input.insertPrescriptionLines).toEqual([
      { id: 'new-a-1', invoiceId: 'rx', stockLineId: 'a', numberOfPacks: 2 },
    ]);
  });

  it('gives a second line on the same batch what is left, and deletes it at none', () => {
    const lines = [
      recordLine('l1', 'para', b1, 3),
      recordLine('l2', 'para', b1, 2),
    ];
    const both = cardsOf(withOwnStock([item('para')], lines));
    const input = editInput(
      'rx',
      lines,
      [{ itemId: 'para', units: 3 }],
      both,
      ids()
    );
    expect(input.updatePrescriptionLines).toEqual([]);
    expect(input.deletePrescriptionLines).toEqual([{ id: 'l2' }]);
  });

  it('leaves a line that takes no stock alone', () => {
    const service: RecordLine = {
      ...recordLine('s1', 'fee', batch('x'), 1),
      type: 'SERVICE',
      stockLine: null,
    };
    const input = editInput(
      'rx',
      [...own, service],
      [{ itemId: 'para', units: 5 }],
      cards,
      ids()
    );
    expect(changesNothing(input)).toBe(true);
  });
});

// A batch the visit took that dispensing wouldn't take now: expired since,
// or put on hold. The record screen's line editor leaves a line alone until
// its quantity is typed again, and only then allocates afresh from the
// batches it may take; the Simple screen does the same.
describe('a batch the visit took that dispensing wouldn’t take now (rules › editing a dispensed visit)', () => {
  const expired = batch('expired', {
    availableNumberOfPacks: 0,
    expiryDate: '2026-11-01',
    sellPricePerPack: 2,
  });
  const held = batch('held', { availableNumberOfPacks: 0, onHold: true });
  const fresh = batch('fresh', {
    expiryDate: '2031-01-01',
    sellPricePerPack: 0.5,
  });
  const cardsFor = (shelf: CardItem[], lines: readonly RecordLine[]) =>
    withKeptAmounts(cardsOf(withOwnStock(shelf, lines)), lines);
  const stockOf = (cards: MedicineCard[]) => (itemId: string, units: number) =>
    stockFor(
      cards.find(card => card.item.id === itemId),
      units
    );

  // OMS-REG-DIS-12.299
  it('leaves a medicine at its amount on the expired batch, at what it was charged, with other stock on the shelf', () => {
    const own = [recordLine('l1', 'para', expired, 6)];
    const cards = cardsFor([item('para', [fresh])], own);
    const listed = [{ itemId: 'para', units: 6 }];
    expect(shortLines(listed, stockOf(cards))).toEqual([]);
    expect(linePrice(cards[0], 6)).toBeCloseTo(12, 9);
    expect(changesNothing(editInput('rx', own, listed, cards, ids()))).toBe(
      true
    );
  });

  // OMS-REG-DIS-12.299
  it('leaves a medicine at its amount on a batch now on hold, with no other stock', () => {
    const own = [recordLine('l1', 'para', held, 4)];
    const cards = cardsFor([item('para')], own);
    const listed = [{ itemId: 'para', units: 4 }];
    expect(shortLines(listed, stockOf(cards))).toEqual([]);
    expect(changesNothing(editInput('rx', own, listed, cards, ids()))).toBe(
      true
    );
  });

  // OMS-REG-DIS-12.299
  it('saves nothing for it when another medicine changes', async () => {
    const amox = batch('a', { availableNumberOfPacks: 5 });
    const own = [
      recordLine('l1', 'para', expired, 6),
      recordLine('l2', 'amox', amox, 2),
    ];
    const cards = cardsFor([item('para', [fresh]), item('amox', [amox])], own);
    const input = editInput(
      'rx',
      own,
      [
        { itemId: 'para', units: 6 },
        { itemId: 'amox', units: 3 },
      ],
      cards,
      ids()
    );
    expect(input).toEqual({
      insertPrescriptionLines: [],
      updatePrescriptionLines: [{ id: 'l2', numberOfPacks: 3 }],
      deletePrescriptionLines: [],
      continueOnError: false,
    });
  });

  // OMS-REG-DIS-12.300
  it('allocates a changed amount afresh from the batches dispensing may take', () => {
    const own = [recordLine('l1', 'para', expired, 6)];
    const cards = cardsFor([item('para', [fresh])], own);
    const listed = [{ itemId: 'para', units: 4 }];
    expect(shortLines(listed, stockOf(cards))).toEqual([]);
    expect(linePrice(cards[0], 4)).toBeCloseTo(2, 9);
    expect(editInput('rx', own, listed, cards, ids())).toEqual({
      insertPrescriptionLines: [
        {
          id: 'new-fresh-1',
          invoiceId: 'rx',
          stockLineId: 'fresh',
          numberOfPacks: 4,
        },
      ],
      updatePrescriptionLines: [],
      deletePrescriptionLines: [{ id: 'l1' }],
      continueOnError: false,
    });
  });

  // OMS-REG-DIS-12.300
  it('is short once changed when only the held batch had it', () => {
    const own = [recordLine('l1', 'para', held, 4)];
    const cards = cardsFor([item('para')], own);
    const listed = [{ itemId: 'para', units: 3 }];
    expect(shortLines(listed, stockOf(cards))).toEqual(listed);
  });

  // OMS-REG-DIS-12.299
  it('saves with nothing to send when the list is as the visit gave it', async () => {
    const own = [recordLine('l1', 'para', expired, 6)];
    const shelf = [item('para', [fresh])];
    const before = cardsFor(shelf, own);
    const saved: EditInput[] = [];
    const end = await saveChanges('rx', [{ itemId: 'para', units: 6 }], {
      read: async () => ({ kind: 'read', record: record(own) }),
      check: async (_, lines) => cardsFor(shelf, lines),
      save: async input => {
        saved.push(input);
        return { kind: 'reply', outcome: 'saved' };
      },
      before: itemId => before.find(card => card.item.id === itemId),
      lineIdFor: batchId => `new-${batchId}`,
    });
    expect(end).toEqual({ kind: 'saved' });
    expect(saved).toEqual([]);
  });
});

describe('givesListed', () => {
  const b = batch('b');
  it('says the record gives what the list holds', () => {
    expect(
      givesListed(
        [recordLine('l1', 'para', b, 4)],
        [{ itemId: 'para', units: 4 }]
      )
    ).toBe(true);
    expect(
      givesListed(
        [recordLine('l1', 'para', b, 4)],
        [{ itemId: 'para', units: 5 }]
      )
    ).toBe(false);
    expect(
      givesListed(
        [recordLine('l1', 'para', b, 4)],
        [
          { itemId: 'para', units: 4 },
          { itemId: 'amox', units: 1 },
        ]
      )
    ).toBe(false);
  });
});

describe('editOutcome', () => {
  const input: EditInput = {
    insertPrescriptionLines: [
      { id: 'n', invoiceId: 'rx', stockLineId: 'b', numberOfPacks: 1 },
    ],
    updatePrescriptionLines: [{ id: 'u', numberOfPacks: 2 }],
    deletePrescriptionLines: [{ id: 'd' }],
    continueOnError: false,
  };
  const reply = (
    over: Partial<SimpleSaveChangesResult['batchPrescription']> = {}
  ): SimpleSaveChangesResult['batchPrescription'] => ({
    insertPrescriptionLines: [
      { id: 'n', response: { __typename: 'InvoiceLineNode', id: 'n' } },
    ],
    updatePrescriptionLines: [
      { id: 'u', response: { __typename: 'InvoiceLineNode', id: 'u' } },
    ],
    deletePrescriptionLines: [
      { id: 'd', response: { __typename: 'DeleteResponse' } },
    ],
    ...over,
  });

  it('is saved when every change comes back saved', () => {
    expect(editOutcome(reply(), input)).toBe('saved');
  });

  it('is a refused line when a batch refuses its line', () => {
    expect(
      editOutcome(
        reply({
          insertPrescriptionLines: [
            {
              id: 'n',
              response: {
                __typename: 'InsertPrescriptionLineError',
                error: { __typename: 'NotEnoughStockForReduction' },
              },
            },
          ],
        }),
        input
      )
    ).toBe('line-refused');
  });

  it('is refused when a change comes back missing', () => {
    expect(editOutcome(reply({ deletePrescriptionLines: [] }), input)).toBe(
      'refused'
    );
  });
});

describe('saveChanges (rules › editing a dispensed visit)', () => {
  const b1 = batch('b1', { availableNumberOfPacks: 5 });
  const own = [recordLine('l1', 'para', b1, 5)];
  const shelf = [item('para', [b1])];
  const listed: ListLine[] = [{ itemId: 'para', units: 7 }];

  const calls = (over: Partial<EditCalls> & { reads?: RecordRead[] } = {}) => {
    const reads = [...(over.reads ?? [{ kind: 'read', record: record(own) }])];
    const saved: EditInput[] = [];
    const before = cardsOf(withOwnStock(shelf, own));
    const made: EditCalls = {
      read: async () => (reads.length > 1 ? reads.shift() : reads[0]),
      check: async (_, lines) => cardsOf(withOwnStock(shelf, lines)),
      save: async input => {
        saved.push(input);
        return { kind: 'reply', outcome: 'saved' };
      },
      before: itemId => before.find(card => card.item.id === itemId),
      lineIdFor: batchId => `new-${batchId}`,
      ...over,
    };
    return { calls: made, saved };
  };

  // OMS-REG-DIS-12.287
  it('saves the difference to the same record', async () => {
    const { calls: c, saved } = calls();
    expect(await saveChanges('rx', listed, c)).toEqual({ kind: 'saved' });
    expect(saved[0]?.updatePrescriptionLines).toEqual([
      { id: 'l1', numberOfPacks: 7 },
    ]);
  });

  it('saves nothing when nothing changed', async () => {
    const { calls: c, saved } = calls();
    expect(await saveChanges('rx', [{ itemId: 'para', units: 5 }], c)).toEqual({
      kind: 'saved',
    });
    expect(saved).toEqual([]);
  });

  // OMS-REG-DIS-12.294
  it('stops, saving nothing, when a line holds more than the stock', async () => {
    const { calls: c, saved } = calls();
    const end = await saveChanges('rx', [{ itemId: 'para', units: 11 }], c);
    expect(end.kind).toBe('stopped');
    expect(saved).toEqual([]);
  });

  it('ends the edit when the record is no longer Picked', async () => {
    const { calls: c } = calls({
      reads: [{ kind: 'read', record: record(own, 'VERIFIED') }],
    });
    expect(await saveChanges('rx', listed, c)).toEqual({
      kind: 'not-editable',
    });
  });

  it('is saved when the reply is lost but the record now gives the list', async () => {
    const after = [recordLine('l1', 'para', b1, 7)];
    const { calls: c } = calls({
      reads: [
        { kind: 'read', record: record(own) },
        { kind: 'read', record: record(after) },
      ],
      save: async (): Promise<SaveReply> => ({ kind: 'lost' }),
    });
    expect(await saveChanges('rx', listed, c)).toEqual({ kind: 'saved' });
  });

  it('can’t tell when the reply is lost and the record is unchanged', async () => {
    const { calls: c } = calls({
      save: async (): Promise<SaveReply> => ({ kind: 'lost' }),
    });
    expect(await saveChanges('rx', listed, c)).toEqual({ kind: 'unsure' });
  });

  // OMS-REG-DIS-12.296
  it('fails, saving nothing, when the save is refused', async () => {
    const { calls: c } = calls({
      save: async (): Promise<SaveReply> => ({
        kind: 'reply',
        outcome: 'refused',
      }),
    });
    expect((await saveChanges('rx', listed, c)).kind).toBe('failed');
  });

  it('checks and tries once more when a batch refuses its line', async () => {
    let tries = 0;
    const { calls: c } = calls({
      save: async (): Promise<SaveReply> =>
        ++tries === 1
          ? { kind: 'reply', outcome: 'line-refused' }
          : { kind: 'reply', outcome: 'saved' },
    });
    expect(await saveChanges('rx', listed, c)).toEqual({ kind: 'saved' });
    expect(tries).toBe(2);
  });
});

describe('afterDeleteRead (rules › editing a dispensed visit)', () => {
  it('says a record that is gone was deleted', () => {
    expect(afterDeleteRead({ kind: 'gone' })).toBe('deleted');
  });

  it('says a record still Picked wasn’t deleted, and one past Picked can’t be edited', () => {
    expect(afterDeleteRead({ kind: 'read', record: record([]) })).toBe(
      'not-deleted'
    );
    expect(
      afterDeleteRead({ kind: 'read', record: record([], 'VERIFIED') })
    ).toBe('not-editable');
  });

  // OMS-REG-DIS-12.298
  it('can’t tell when the record can’t be read', () => {
    expect(afterDeleteRead(undefined)).toBe('unknown');
  });
});
