import { describe, expect, it } from 'vitest';
import type { AllocationPreferences } from '@/domain/allocation';
import {
  addAmount,
  amountLimit,
  buildCards,
  canAddTyped,
  dispenseInput,
  dispenseOutcome,
  dispenseVisit,
  fillableBatches,
  medicinesFor,
  priceOf,
  removeLine,
  setAmount,
  stockLine,
  shortLines,
  stockAtCheck,
  stockState,
  unitsIn,
  visitWasSaved,
  type CardItem,
  type DispenseCalls,
  type DispenseInput,
  type ListLine,
  type SaveReply,
  type VisitRecord,
} from './simpleDispensingLogic';
import type { SimpleDispenseResult } from './simpleDispense.generated';

const PREFS: AllocationPreferences = {
  expiredStockPreventIssue: false,
  expiredStockIssueThreshold: 0,
  manageVvmStatusForStock: false,
  sortByVvmStatusThenExpiry: false,
};
// Local midnight, so "today" is the 10th in whatever time zone the tests run.
const TODAY = new Date(2026, 10, 10);

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
  code: id.toUpperCase(),
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

describe('medicinesFor', () => {
  it('OMS-REG-DIS-12.84: a medicine from the search has no usual amounts, and a common one keeps its own', () => {
    expect(
      medicinesFor(['searched', 'common'], [{ itemId: 'common', amounts: [5] }])
    ).toEqual([
      { itemId: 'searched', amounts: [] },
      { itemId: 'common', amounts: [5] },
    ]);
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

  it('puts a batch with no expiry date last', () => {
    const batches = fillableBatches(
      item('a', [
        batch('no-expiry', { expiryDate: null }),
        batch('dated', { expiryDate: '2029-01-01' }),
      ]),
      PREFS,
      TODAY
    );
    expect(batches.map(b => b.id)).toEqual(['dated', 'no-expiry']);
  });

  it('keeps the order the server gave for batches that expire on the same day', () => {
    const batches = fillableBatches(
      item('a', [
        batch('first', { expiryDate: '2029-01-01' }),
        batch('second', { expiryDate: '2029-01-01' }),
      ]),
      PREFS,
      TODAY
    );
    expect(batches.map(b => b.id)).toEqual(['first', 'second']);
  });

  it('counts a batch that expires today as not yet expired', () => {
    const batches = fillableBatches(
      item('a', [batch('today', { expiryDate: '2026-11-10' })]),
      PREFS,
      TODAY
    );
    expect(batches.map(b => b.id)).toEqual(['today']);
  });

  it('leaves out a batch inside the prevent-issue-of-expired-stock window', () => {
    const batches = fillableBatches(
      item('a', [
        batch('soon', { expiryDate: '2026-11-20' }),
        batch('later', { expiryDate: '2027-06-01' }),
      ]),
      {
        ...PREFS,
        expiredStockPreventIssue: true,
        expiredStockIssueThreshold: 30,
      },
      TODAY
    );
    expect(batches.map(b => b.id)).toEqual(['later']);
  });

  it('leaves out a batch whose VVM status is unusable', () => {
    const batches = fillableBatches(
      item('a', [
        batch('unusable', { vvmStatus: { unusable: true, priority: 3 } }),
        batch('usable', { vvmStatus: { unusable: false, priority: 1 } }),
      ]),
      PREFS,
      TODAY
    );
    expect(batches.map(b => b.id)).toEqual(['usable']);
  });

  it('under sort by VVM status then expiry, takes the better VVM status first', () => {
    const batches = fillableBatches(
      item('a', [
        batch('sooner-worse', {
          expiryDate: '2027-01-01',
          vvmStatus: { unusable: false, priority: 2 },
        }),
        batch('later-better', {
          expiryDate: '2029-01-01',
          vvmStatus: { unusable: false, priority: 1 },
        }),
      ]),
      { ...PREFS, sortByVvmStatusThenExpiry: true },
      TODAY
    );
    expect(batches.map(b => b.id)).toEqual(['later-better', 'sooner-worse']);
  });

  it('counts units across fractional pack sizes without float dust', () => {
    expect(
      unitsIn(
        fillableBatches(
          item('a', [
            batch('a1', { availableNumberOfPacks: 0.29, packSize: 100 }),
            batch('a2', { availableNumberOfPacks: 4, packSize: 2.5 }),
          ]),
          PREFS,
          TODAY
        )
      )
    ).toBe(39);
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

  it('prices an amount that spans three batches', () => {
    const batches = fillableBatches(
      item('a', [
        batch('third', {
          availableNumberOfPacks: 1,
          packSize: 10,
          sellPricePerPack: 4,
          expiryDate: '2029-01-01',
        }),
        batch('first', {
          availableNumberOfPacks: 1,
          packSize: 10,
          sellPricePerPack: 1,
          expiryDate: '2027-01-01',
        }),
        batch('second', {
          availableNumberOfPacks: 1,
          packSize: 10,
          sellPricePerPack: 2,
          expiryDate: '2028-01-01',
        }),
      ]),
      PREFS,
      TODAY
    );
    // 10 at 1 + 10 at 2 + half a pack at 4.
    expect(priceOf(batches, 25)).toBeCloseTo(5);
  });
});

describe('priceOf, for a line left short', () => {
  it("OMS-REG-DIS-12.106: units beyond what the batches hold cost the last batch's price per unit", () => {
    const batches = fillableBatches(
      item('a', [
        batch('only', {
          availableNumberOfPacks: 1,
          packSize: 5,
          sellPricePerPack: 10,
          expiryDate: '2030-01-01',
        }),
      ]),
      PREFS,
      TODAY
    );
    // 5 units from the batch (one pack, 10), and 1 more at 10 / 5 = 2.
    expect(priceOf(batches, 6)).toBeCloseTo(12);
  });

  it('with no batches left, a line costs nothing', () => {
    expect(priceOf([], 6)).toBe(0);
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

  it('a press of zero or less leaves the list as it was', () => {
    const lines: ListLine[] = [{ itemId: 'a', units: 10 }];
    expect(addAmount(lines, 'a', 0, 100)).toEqual(lines);
    expect(addAmount(lines, 'a', -5, 100)).toEqual(lines);
    expect(addAmount([], 'b', 0, 100)).toEqual([]);
  });

  it('OMS-REG-DIS-12.105: a press on a line whose typed amount stopped at the stock drops its message', () => {
    expect(
      addAmount([{ itemId: 'a', units: 10, capped: true }], 'a', 5, 100)
    ).toEqual([{ itemId: 'a', units: 15 }]);
  });

  it('a press that brings the line to exactly what the card has is taken, without float dust', () => {
    expect(addAmount([{ itemId: 'a', units: 0.1 }], 'a', 0.2, 0.3)).toEqual([
      { itemId: 'a', units: 0.3 },
    ]);
  });

  it('OMS-REG-DIS-12.29, .104: an amount above what is available stops at it, and the line says so', () => {
    expect(setAmount([{ itemId: 'a', units: 10 }], 'a', 500, 120)).toEqual([
      { itemId: 'a', units: 120, capped: true },
    ]);
  });

  it('OMS-REG-DIS-12.105: an amount within the stock drops the stopped-at-stock message', () => {
    expect(
      setAmount([{ itemId: 'a', units: 120, capped: true }], 'a', 50, 120)
    ).toEqual([{ itemId: 'a', units: 50 }]);
    // Exactly the stock is within it.
    expect(
      setAmount([{ itemId: 'a', units: 120, capped: true }], 'a', 120, 120)
    ).toEqual([{ itemId: 'a', units: 120 }]);
  });

  it('OMS-REG-DIS-12.90: with none left, a typed amount leaves the line as it was: it can only be removed', () => {
    const lines: ListLine[] = [{ itemId: 'a', units: 6 }];
    expect(setAmount(lines, 'a', 3, 0)).toEqual(lines);
  });

  it('OMS-REG-DIS-12.58, .100: giving what there is brings a short line within the stock', () => {
    const given = setAmount([{ itemId: 'a', units: 6 }], 'a', 4, 4);
    expect(given).toEqual([{ itemId: 'a', units: 4 }]);
    expect(shortLines(given, () => 4)).toEqual([]);
  });

  it('an amount of zero, or none, leaves the line as it was', () => {
    const lines: ListLine[] = [{ itemId: 'a', units: 10 }];
    expect(setAmount(lines, 'a', 0, 100)).toEqual(lines);
    expect(setAmount(lines, 'a', -3, 100)).toEqual(lines);
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

describe('the amount box', () => {
  it('OMS-REG-DIS-12.78: an amount above what is available cannot be added', () => {
    expect(canAddTyped(29, 28)).toBe(false);
    expect(canAddTyped(28, 28)).toBe(true);
  });

  it('OMS-REG-DIS-12.79: nothing typed, or zero, cannot be added', () => {
    expect(canAddTyped(undefined, 28)).toBe(false);
    expect(canAddTyped(0, 28)).toBe(false);
  });

  it('OMS-REG-DIS-12.86: with none available, nothing can be added', () => {
    expect(canAddTyped(1, 0)).toBe(false);
  });

  it('OMS-REG-DIS-12.78: with nothing on the list, the limit is the stock and none is selected', () => {
    expect(amountLimit(28, 28)).toEqual({ stock: 28, selected: 0, upTo: 28 });
  });

  it('OMS-REG-DIS-12.113: with some on the list, says what is selected and what can still be added', () => {
    expect(amountLimit(28, 16)).toEqual({ stock: 28, selected: 12, upTo: 16 });
    // Without float dust: 0.3 of 0.9 leaves 0.6, not 0.6000000000000001.
    expect(amountLimit(0.9, 0.6).selected).toBe(0.3);
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

  it('OMS-REG-DIS-12.11: at least twice the largest usual amount is plenty', () => {
    expect(stockState(40, [10, 20])).toBe('plenty');
  });

  it('with no usual amounts, is low below two units', () => {
    expect(stockState(1, [])).toBe('low');
    expect(stockState(2, [])).toBe('plenty');
  });
});

describe('stockLine', () => {
  it('OMS-REG-DIS-12.11: plenty shows how much is left', () => {
    expect(stockLine(40, [10, 20], false)).toBe('left');
  });

  it('OMS-REG-DIS-12.10/.12: low and out show their warnings', () => {
    expect(stockLine(39, [10, 20], false)).toBe('low');
    expect(stockLine(0, [10, 20], false)).toBe('out');
  });

  it('OMS-REG-DIS-12.110: on a phone, plenty shows nothing', () => {
    expect(stockLine(40, [10, 20], true)).toBeUndefined();
  });

  it('OMS-REG-DIS-12.111: on a phone, low and out still show', () => {
    expect(stockLine(39, [10, 20], true)).toBe('low');
    expect(stockLine(0, [10, 20], true)).toBe('out');
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

  it('OMS-REG-DIS-12.57, .59: finds the lines the stock can no longer cover, and leaves their amounts alone', () => {
    const before = cardsFor(item('gone', [batch('g1')]));
    const listed: ListLine[] = [
      { itemId: 'a', units: 30 },
      { itemId: 'b', units: 30 },
      { itemId: 'gone', units: 5 },
    ];
    const checked = stockAtCheck(
      listed,
      cardsFor(
        item('a', [batch('a1', { availableNumberOfPacks: 2, packSize: 10 })]),
        item('b', [batch('b1', { availableNumberOfPacks: 5, packSize: 10 })])
      ),
      id => before.find(card => card.item.id === id)
    );
    const stockOf = (id: string) =>
      checked.find(card => card.item.id === id)?.stock ?? 0;
    expect(checked.map(card => [card.item.id, card.stock])).toEqual([
      ['a', 20],
      ['b', 50],
      // No longer returned: the store can't dispense it, so none available.
      ['gone', 0],
    ]);
    expect(shortLines(listed, stockOf)).toEqual([
      { itemId: 'a', units: 30 },
      { itemId: 'gone', units: 5 },
    ]);
  });

  it('a medicine the check no longer returns, and that never had a card, is left out', () => {
    expect(
      stockAtCheck([{ itemId: 'x', units: 1 }], [], () => undefined)
    ).toEqual([]);
  });

  it('OMS-REG-DIS-12.51-.53: saves one record, a line per batch first expiry first, and saves it as Picked', () => {
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
    expect(input.updatePrescriptions).toEqual([{ id: 'rx', status: 'PICKED' }]);
    expect(input.continueOnError).toBe(false);
  });

  it('OMS-REG-DIS-12.51: saves every medicine on the list, each from its own batches', () => {
    const cards = cardsFor(
      item('a', [batch('a1', { availableNumberOfPacks: 5, packSize: 10 })]),
      item('b', [batch('b1', { availableNumberOfPacks: 5, packSize: 10 })])
    );
    let n = 0;
    const input = dispenseInput(
      'rx',
      'patient',
      [
        { itemId: 'a', units: 20 },
        { itemId: 'b', units: 5 },
      ],
      cards,
      () => `line-${++n}`
    );
    expect(
      input.insertPrescriptionLines.map(line => [
        line.stockLineId,
        line.numberOfPacks,
      ])
    ).toEqual([
      ['a1', 2],
      ['b1', 0.5],
    ]);
  });

  it('never saves more than the batches hold', () => {
    const cards = cardsFor(
      item('a', [batch('a1', { availableNumberOfPacks: 1, packSize: 10 })])
    );
    const input = dispenseInput(
      'rx',
      'patient',
      [{ itemId: 'a', units: 50 }],
      cards,
      () => 'line'
    );
    expect(input.insertPrescriptionLines.map(l => l.numberOfPacks)).toEqual([
      1,
    ]);
  });
});

describe('dispenseOutcome', () => {
  type Result = SimpleDispenseResult['batchPrescription'];
  const saved = (lines = 2): Result => ({
    insertPrescriptions: [
      { id: 'rx', response: { __typename: 'InvoiceNode' } },
    ],
    insertPrescriptionLines: Array.from({ length: lines }, (_, i) => ({
      id: `l${i}`,
      response: { __typename: 'InvoiceLineNode', id: `l${i}` },
    })),
    updatePrescriptions: [
      { id: 'rx', response: { __typename: 'InvoiceNode' } },
    ],
  });

  it('OMS-REG-DIS-12.51: everything came back saved', () => {
    expect(dispenseOutcome(saved(), 2)).toBe('saved');
  });

  it('OMS-REG-DIS-12.89: a batch refusing its line is worth checking again', () => {
    const result = saved();
    result.insertPrescriptionLines = [
      {
        id: 'l0',
        response: {
          __typename: 'InsertPrescriptionLineError',
          error: {
            __typename: 'NotEnoughStockForReduction',
            description: 'Not enough stock',
          },
        },
      },
    ];
    expect(dispenseOutcome(result, 2)).toBe('line-refused');
  });

  it('OMS-REG-DIS-12.93: a refused move to Picked is not saved', () => {
    const result = saved();
    result.updatePrescriptions = [
      { id: 'rx', response: { __typename: 'UpdatePrescriptionError' } },
    ];
    expect(dispenseOutcome(result, 2)).toBe('refused');
    result.updatePrescriptions = [
      { id: 'rx', response: { __typename: 'NodeError' } },
    ];
    expect(dispenseOutcome(result, 2)).toBe('refused');
  });

  it('OMS-REG-DIS-12.93: a part missing from the reply is not saved', () => {
    expect(dispenseOutcome({ ...saved(), updatePrescriptions: null }, 2)).toBe(
      'refused'
    );
    expect(dispenseOutcome({ ...saved(), insertPrescriptions: null }, 2)).toBe(
      'refused'
    );
    expect(dispenseOutcome(saved(1), 2)).toBe('refused');
  });

  it('a save with no lines is never saved', () => {
    expect(dispenseOutcome(saved(0), 0)).toBe('refused');
  });
});

describe('dispenseVisit', () => {
  const WHO = { id: 'p1', name: 'First' };
  const OTHER = { id: 'p2', name: 'Second' };
  const LIST: ListLine[] = [{ itemId: 'a', units: 5 }];
  const cardWith = (units: number) =>
    buildCards(
      [{ itemId: 'a', amounts: [] }],
      [
        item('a', [
          batch('a1', { availableNumberOfPacks: units, packSize: 1 }),
        ]),
      ],
      PREFS,
      TODAY
    );

  /**
   * A server holding `stock` units of one medicine. A save can be held back
   * on the way: its reply is lost, and it lands when `land()` is called.
   */
  const server = (stock = 10) => {
    const state = {
      stock,
      saved: new Set<string>(),
      saves: [] as string[],
      looks: 0,
      land: () => {},
    };
    const arrive = (input: DispenseInput): SaveReply => {
      const id = input.insertPrescriptions[0]?.id ?? '';
      // A second record with the same id is a plain GraphQL error.
      if (state.saved.has(id)) return { kind: 'reply', outcome: 'refused' };
      const units = input.insertPrescriptionLines.reduce(
        (sum, l) => sum + l.numberOfPacks,
        0
      );
      if (units > state.stock)
        return { kind: 'reply', outcome: 'line-refused' };
      state.stock -= units;
      state.saved.add(id);
      return { kind: 'reply', outcome: 'saved' };
    };
    const send = (input: DispenseInput): SaveReply => {
      state.saves.push(input.insertPrescriptions[0]?.id ?? '');
      return arrive(input);
    };
    let n = 0;
    const calls = (over: Partial<DispenseCalls> = {}): DispenseCalls => ({
      look: async id => {
        state.looks++;
        return state.saved.has(id);
      },
      check: async () => cardWith(state.stock),
      save: async input => send(input),
      before: () => undefined,
      newId: () => `id-${++n}`,
      ...over,
    });
    const heldBack: DispenseCalls['save'] = async input => {
      state.saves.push(input.insertPrescriptions[0]?.id ?? '');
      state.land = () => void arrive(input);
      return { kind: 'lost' };
    };
    return { state, calls, send, heldBack };
  };

  it('OMS-REG-DIS-12.51: saves the visit once when everything is there', async () => {
    const { state, calls } = server();
    expect(await dispenseVisit({}, WHO, LIST, calls())).toEqual({
      kind: 'saved',
      patient: WHO,
    });
    expect(state.saves).toEqual(['id-1']);
    expect(state.looks).toBe(0);
  });

  it('OMS-REG-DIS-12.92: a lost reply with nothing saved is unsure, and marks the id as possibly saved', async () => {
    const { state, calls, heldBack } = server();
    const visit: { current?: VisitRecord } = {};
    expect(
      await dispenseVisit(visit, WHO, LIST, calls({ save: heldBack }))
    ).toEqual({ kind: 'unsure' });
    expect(visit.current).toEqual({ id: 'id-1', sentFor: WHO });
    expect(state.looks).toBe(1);
  });

  it('OMS-REG-DIS-12.97: a lost reply whose save went through is saved, without saving again', async () => {
    const { state, calls, send } = server();
    const lostReply: DispenseCalls['save'] = async input => {
      send(input);
      return { kind: 'lost' };
    };
    expect(
      await dispenseVisit({}, WHO, LIST, calls({ save: lostReply }))
    ).toEqual({ kind: 'saved', patient: WHO });
    expect(state.saves).toEqual(['id-1']);
  });

  it('OMS-REG-DIS-12.150: a lost save landing between the look and the check is finished, not shown short', async () => {
    const { state, calls, heldBack } = server(5);
    const visit: { current?: VisitRecord } = {};
    await dispenseVisit(visit, WHO, LIST, calls({ save: heldBack }));
    // Dispense again: the look finds nothing, then the lost save lands, so
    // the check finds the visit's own stock gone.
    const landsFirst = calls({
      check: async listed => {
        state.land();
        return calls().check(listed);
      },
    });
    expect(await dispenseVisit(visit, WHO, LIST, landsFirst)).toEqual({
      kind: 'saved',
      patient: WHO,
    });
    expect(state.saves).toEqual(['id-1']);
    expect([...state.saved]).toEqual(['id-1']);
  });

  it('OMS-REG-DIS-12.98: a lost save landing while saving again is found after the refusal', async () => {
    const { state, calls, heldBack } = server();
    const visit: { current?: VisitRecord } = {};
    await dispenseVisit(visit, WHO, LIST, calls({ save: heldBack }));
    const landsFirst = calls({
      save: async input => {
        state.land();
        return calls().save(input);
      },
    });
    expect(await dispenseVisit(visit, WHO, LIST, landsFirst)).toEqual({
      kind: 'saved',
      patient: WHO,
    });
    expect([...state.saved]).toEqual(['id-1']);
  });

  it('OMS-REG-DIS-12.150: after a lost reply, a short line then a refused save still look, so the visit is neither failed nor saved twice', async () => {
    const { state, calls, heldBack } = server(5);
    const visit: { current?: VisitRecord } = {};
    await dispenseVisit(visit, WHO, LIST, calls({ save: heldBack }));
    // Someone else takes 2 before Dispense again: genuinely short.
    state.stock = 3;
    expect((await dispenseVisit(visit, WHO, LIST, calls())).kind).toBe('short');
    // Staff give what there is. More stock arrives, and the lost save lands
    // just before this save, which the server refuses as a second record.
    state.stock = 8;
    const landsFirst = calls({
      save: async input => {
        state.land();
        return calls().save(input);
      },
    });
    expect(
      await dispenseVisit(visit, WHO, [{ itemId: 'a', units: 3 }], landsFirst)
    ).toEqual({ kind: 'saved', patient: WHO });
    expect([...state.saved]).toEqual(['id-1']);
  });

  it('OMS-REG-DIS-12.155: a visit found saved after someone else was chosen is saved for the person it was sent for', async () => {
    const { state, calls, heldBack } = server();
    const visit: { current?: VisitRecord } = {};
    await dispenseVisit(visit, WHO, LIST, calls({ save: heldBack }));
    state.land();
    expect(await dispenseVisit(visit, OTHER, LIST, calls())).toEqual({
      kind: 'saved',
      patient: WHO,
    });
  });

  it('OMS-REG-DIS-12.153: a check that fails after a lost reply looks again, and holds the visit when it cannot', async () => {
    const { calls, heldBack } = server();
    const visit: { current?: VisitRecord } = {};
    await dispenseVisit(visit, WHO, LIST, calls({ save: heldBack }));
    // Nothing can be read: unsure.
    expect(
      await dispenseVisit(
        visit,
        WHO,
        LIST,
        calls({ check: async () => undefined, look: async () => undefined })
      )
    ).toEqual({ kind: 'unsure' });
    // The look works but the check doesn't: nothing saved yet, and the id
    // stays marked for the next try.
    expect(
      await dispenseVisit(
        visit,
        WHO,
        LIST,
        calls({ check: async () => undefined })
      )
    ).toEqual({ kind: 'failed' });
    expect(visit.current?.sentFor).toEqual(WHO);
  });

  it('OMS-REG-DIS-12.153: a check that fails with no save sent fails without looking', async () => {
    const { state, calls } = server();
    expect(
      await dispenseVisit(
        {},
        WHO,
        LIST,
        calls({ check: async () => undefined })
      )
    ).toEqual({ kind: 'failed' });
    expect(state.looks).toBe(0);
    expect(state.saves).toEqual([]);
  });

  it('OMS-REG-DIS-12.93, .96: a definite refusal of the only save fails without looking, and leaves the id unmarked', async () => {
    const { state, calls } = server();
    const visit: { current?: VisitRecord } = {};
    const refused = await dispenseVisit(
      visit,
      WHO,
      LIST,
      calls({
        save: async () => ({ kind: 'reply', outcome: 'refused', missing: [] }),
      })
    );
    expect(refused).toMatchObject({ kind: 'failed', missing: [] });
    expect(state.looks).toBe(0);
    expect(visit.current).toEqual({ id: 'id-1' });
  });

  it('OMS-REG-DIS-12.89: a line refused at the save checks again once, with the same id, then fails', async () => {
    const { state, calls } = server();
    let checks = 0;
    const end = await dispenseVisit(
      {},
      WHO,
      LIST,
      calls({
        check: async listed => {
          checks++;
          return calls().check(listed);
        },
        save: async input => {
          state.saves.push(input.insertPrescriptions[0]?.id ?? '');
          return { kind: 'reply', outcome: 'line-refused' };
        },
      })
    );
    expect(end.kind).toBe('failed');
    expect(checks).toBe(2);
    expect(state.saves).toEqual(['id-1', 'id-1']);
  });

  it('never sends a save with no lines', async () => {
    const { state, calls } = server();
    const end = await dispenseVisit(
      {},
      WHO,
      [{ itemId: 'a', units: 0 }],
      calls()
    );
    expect(end.kind).toBe('failed');
    expect(state.saves).toEqual([]);
  });
});

describe('visitWasSaved', () => {
  it('OMS-REG-DIS-12.92: a visit whose record exists past New was saved, even if it has moved on since', () => {
    for (const status of ['PICKED', 'VERIFIED', 'CANCELLED'] as const)
      expect(
        visitWasSaved({ __typename: 'InvoiceNode', id: 'rx', status })
      ).toBe(true);
    expect(
      visitWasSaved({ __typename: 'InvoiceNode', id: 'rx', status: 'NEW' })
    ).toBe(false);
  });

  it('OMS-REG-DIS-12.92: a visit with no record was not saved', () => {
    expect(
      visitWasSaved({
        __typename: 'NodeError',
        error: { __typename: 'RecordNotFound' },
      })
    ).toBe(false);
  });
});
