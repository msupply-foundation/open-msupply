import { describe, expect, it } from 'vitest';
import type { AllocationPreferences } from '@/domain/allocation';
import {
  addAmount,
  buildCards,
  dispenseInput,
  reduceToAvailable,
  shortfalls,
  fillableBatches,
  priceOf,
  removeLine,
  setAmount,
  stockState,
  unitsIn,
  type CardItem,
  type ListLine,
} from './simpleDispensingLogic';

const PREFS: AllocationPreferences = {
  expiredStockPreventIssue: false,
  expiredStockIssueThreshold: 0,
  manageVvmStatusForStock: false,
  sortByVvmStatusThenExpiry: false,
};
const TODAY = new Date('2026-11-10T00:00:00Z');

type Batch = CardItem['availableBatches']['nodes'][number];
const batch = (id: string, over: Partial<Batch> = {}): Batch => ({
  id,
  availableNumberOfPacks: 10,
  packSize: 10,
  sellPricePerPack: 1,
  expiryDate: '2030-01-01',
  onHold: false,
  location: null,
  vvmStatus: null,
  ...over,
});

const item = (id: string, batches: Batch[] = []): CardItem => ({
  id,
  name: `Item ${id}`,
  unitName: 'Tablet',
  availableBatches: { __typename: 'StockLineConnector', nodes: batches },
});

describe('buildCards', () => {
  it('OMS-REG-DIS-12.4: one card per common medicine, in the order the store set them', () => {
    const cards = buildCards(
      [
        { itemId: 'b', amounts: [10] },
        { itemId: 'a', amounts: [] },
      ],
      // The query returns items in its own order, not the store's.
      [item('a'), item('b')],
      PREFS,
      TODAY
    );
    expect(cards.map(card => card.item.id)).toEqual(['b', 'a']);
  });

  it('OMS-REG-DIS-12.5: a common medicine whose item did not come back gets no card', () => {
    const cards = buildCards(
      [
        { itemId: 'gone', amounts: [10] },
        { itemId: 'a', amounts: [5] },
      ],
      [item('a')],
      PREFS,
      TODAY
    );
    expect(cards.map(card => card.item.id)).toEqual(['a']);
  });

  it('counts only the stock dispensing may take', () => {
    const [card] = buildCards(
      [{ itemId: 'a', amounts: [10] }],
      [
        item('a', [
          batch('good', { availableNumberOfPacks: 2, packSize: 100 }),
          batch('half', { availableNumberOfPacks: 0.5, packSize: 10 }),
          batch('held', { onHold: true }),
        ]),
      ],
      PREFS,
      TODAY
    );
    expect(card?.stock).toBe(205);
  });
});

describe('fillableBatches', () => {
  it('OMS-REG-DIS-12.34: stock on hold, in a held location or expired is not available', () => {
    const batches = fillableBatches(
      item('a', [
        batch('held', { onHold: true }),
        batch('held-location', { location: { onHold: true } }),
        batch('expired', { expiryDate: '2026-01-01' }),
        batch('good'),
      ]),
      PREFS,
      TODAY
    );
    expect(batches.map(b => b.id)).toEqual(['good']);
  });

  it('takes the earliest expiry first', () => {
    const batches = fillableBatches(
      item('a', [
        batch('later', { expiryDate: '2029-01-01' }),
        batch('sooner', { expiryDate: '2027-01-01' }),
      ]),
      PREFS,
      TODAY
    );
    expect(batches.map(b => b.id)).toEqual(['sooner', 'later']);
  });

  it('leaves out batches with nothing available', () => {
    expect(
      unitsIn(
        fillableBatches(
          item('a', [batch('empty', { availableNumberOfPacks: 0 })]),
          PREFS,
          TODAY
        )
      )
    ).toBe(0);
  });
});

describe('priceOf', () => {
  it('OMS-REG-DIS-12.26: prices the batches first expiry first, each at its own sell price', () => {
    const batches = fillableBatches(
      item('a', [
        // 10 units at 2 per pack of 10 expire later; 5 at 3 per pack of 5
        // expire first, so they go first.
        batch('later', {
          availableNumberOfPacks: 1,
          packSize: 10,
          sellPricePerPack: 2,
          expiryDate: '2029-01-01',
        }),
        batch('sooner', {
          availableNumberOfPacks: 1,
          packSize: 5,
          sellPricePerPack: 3,
          expiryDate: '2027-01-01',
        }),
      ]),
      PREFS,
      TODAY
    );
    // 5 from "sooner" (one pack, 3) + 5 from "later" (half a pack, 1).
    expect(priceOf(batches, 10)).toBeCloseTo(4);
  });
});

describe('the list', () => {
  it('OMS-REG-DIS-12.24: a press starts a line for the medicine', () => {
    expect(addAmount([], 'a', 10, 100)).toEqual([{ itemId: 'a', units: 10 }]);
  });

  it('OMS-REG-DIS-12.25: a press for a medicine already on the list adds to its line', () => {
    const lines: ListLine[] = [
      { itemId: 'a', units: 20 },
      { itemId: 'b', units: 5 },
    ];
    expect(addAmount(lines, 'a', 20, 100)).toEqual([
      { itemId: 'a', units: 40 },
      { itemId: 'b', units: 5 },
    ]);
  });

  it('a press past what the card has leaves the list as it was', () => {
    const lines: ListLine[] = [{ itemId: 'a', units: 90 }];
    expect(addAmount(lines, 'a', 20, 100)).toEqual(lines);
  });

  it('OMS-REG-DIS-12.29: an amount above what is available is brought down to it', () => {
    expect(setAmount([{ itemId: 'a', units: 10 }], 'a', 500, 120)).toEqual([
      { itemId: 'a', units: 120 },
    ]);
  });

  it('an amount of zero, or none, leaves the line as it was', () => {
    const lines: ListLine[] = [{ itemId: 'a', units: 10 }];
    expect(setAmount(lines, 'a', 0, 100)).toEqual(lines);
    expect(setAmount(lines, 'a', undefined, 100)).toEqual(lines);
  });

  it('OMS-REG-DIS-12.30: removing a line takes its medicine off the list', () => {
    expect(
      removeLine(
        [
          { itemId: 'a', units: 10 },
          { itemId: 'b', units: 5 },
        ],
        'a'
      )
    ).toEqual([{ itemId: 'b', units: 5 }]);
  });
});

describe('stockState', () => {
  it('OMS-REG-DIS-12.12: none available is out', () => {
    expect(stockState(0, [10, 20])).toBe('out');
  });

  it('OMS-REG-DIS-12.10: some, but less than twice the largest usual amount, is low', () => {
    expect(stockState(39, [10, 20])).toBe('low');
    expect(stockState(1, [10, 20])).toBe('low');
  });

  it('OMS-REG-DIS-12.11: at least twice the largest usual amount shows no stock line', () => {
    expect(stockState(40, [10, 20])).toBe('plenty');
  });

  it('with no usual amounts, is low below two units', () => {
    expect(stockState(1, [])).toBe('low');
    expect(stockState(2, [])).toBe('plenty');
  });
});

describe('dispensing the visit', () => {
  const cardsFor = (...items: CardItem[]) =>
    buildCards(
      items.map(i => ({ itemId: i.id, amounts: [] })),
      items,
      PREFS,
      TODAY
    );

  it('OMS-REG-DIS-12.57: finds the lines the stock can no longer cover', () => {
    const fresh = cardsFor(
      item('a', [batch('a1', { availableNumberOfPacks: 2, packSize: 10 })]),
      item('b', [batch('b1', { availableNumberOfPacks: 5, packSize: 10 })])
    );
    expect(
      shortfalls(
        [
          { itemId: 'a', units: 30 },
          { itemId: 'b', units: 30 },
          { itemId: 'gone', units: 5 },
        ],
        fresh
      )
    ).toEqual([
      { itemId: 'a', wanted: 30, available: 20 },
      { itemId: 'gone', wanted: 5, available: 0 },
    ]);
  });

  it('OMS-REG-DIS-12.59: reduces a short line to what is available, and removes one with none left', () => {
    expect(
      reduceToAvailable(
        [
          { itemId: 'a', units: 30 },
          { itemId: 'b', units: 5 },
          { itemId: 'c', units: 7 },
        ],
        [
          { itemId: 'a', wanted: 30, available: 20 },
          { itemId: 'c', wanted: 7, available: 0 },
        ]
      )
    ).toEqual([
      { itemId: 'a', units: 20 },
      { itemId: 'b', units: 5 },
    ]);
  });

  it('OMS-REG-DIS-12.51-.53: saves one record, a line per batch first expiry first, and finishes it as Verified', () => {
    const cards = cardsFor(
      item('a', [
        batch('later', {
          availableNumberOfPacks: 10,
          packSize: 10,
          expiryDate: '2029-01-01',
        }),
        batch('sooner', {
          availableNumberOfPacks: 1,
          packSize: 10,
          expiryDate: '2027-01-01',
        }),
      ])
    );
    let n = 0;
    const input = dispenseInput(
      'rx',
      'patient',
      [{ itemId: 'a', units: 15 }],
      cards,
      () => `line-${++n}`
    );
    expect(input.insertPrescriptions).toEqual([
      { id: 'rx', patientId: 'patient' },
    ]);
    expect(input.insertPrescriptionLines).toEqual([
      {
        id: 'line-1',
        invoiceId: 'rx',
        stockLineId: 'sooner',
        numberOfPacks: 1,
      },
      {
        id: 'line-2',
        invoiceId: 'rx',
        stockLineId: 'later',
        numberOfPacks: 0.5,
      },
    ]);
    expect(input.updatePrescriptions).toEqual([
      { id: 'rx', status: 'VERIFIED' },
    ]);
    expect(input.continueOnError).toBe(false);
  });
});
