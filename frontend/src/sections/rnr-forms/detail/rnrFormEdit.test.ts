import { describe, expect, it } from 'vitest';
import {
  adjustedQuantityConsumed,
  averageMonthlyConsumption,
  lineHasError,
  linesToSave,
  lowStockStatus,
  previousMonthlyConsumption,
  recomputeLine,
  toUpdateLineInput,
  type DraftRnrLine,
} from './rnrFormEdit';

// The client recompute engine (spec/rnr-forms/rules.md § editing a draft /
// § line generation). Behaviours cited from OMS-REG-REPL-07: .18 (adjusted
// consumption formula), .22 (the balance identity incl. losses), .23 (AMC over
// this period + up to two prior forms), .24 (min/max = AMC × the store
// months-of-stock preferences), .25 (requested = max − final, floored at 0),
// .26 (low-stock thresholds), .28 (an edit recomputes the derived columns),
// .46 (error lines: negative balances are flagged and withheld from save).
// The formulas mirror the server's generation exactly (rules § line
// generation) — verified live against generated forms during the reverse spec.

const line = (overrides: Partial<DraftRnrLine> = {}): DraftRnrLine => ({
  id: 'line-1',
  item: {
    id: 'item-1',
    code: '030063',
    name: 'Acetylsalicylic Acid',
    unitName: 'tablet',
    venCategory: 'NOT_ASSIGNED',
  },
  previousMonthlyConsumptionValues: '',
  averageMonthlyConsumption: 0,
  initialBalance: 0,
  quantityReceived: 0,
  quantityConsumed: 0,
  adjustedQuantityConsumed: 0,
  losses: 0,
  adjustments: 0,
  stockOutDuration: 0,
  finalBalance: 0,
  minimumQuantity: 0,
  maximumQuantity: 0,
  expiryDate: null,
  calculatedRequestedQuantity: 0,
  enteredRequestedQuantity: null,
  lowStock: 'OK',
  comment: null,
  confirmed: false,
  approvedQuantity: null,
  dirty: false,
  rev: 0,
  ...overrides,
});

// A 30-day period with the reference store's 3/6 months preferences — the
// live-verified generation context (README § status).
const ctx = { periodLength: 30, monthsUnderstock: 3, monthsOverstock: 6 };

describe('adjustedQuantityConsumed (OMS-REG-REPL-07.18)', () => {
  it('scales consumption up for stock-out days', () => {
    // 10 days out of 30 in stock-out: 20 consumed over 20 days ⇒ 30 would
    // have been consumed with stock all period.
    expect(adjustedQuantityConsumed(20, 10, 30)).toBe(30);
  });

  it('falls back to plain consumption with no in-stock days', () => {
    expect(adjustedQuantityConsumed(20, 30, 30)).toBe(20);
  });

  it('is plain consumption with no stock-out', () => {
    expect(adjustedQuantityConsumed(9, 0, 30)).toBe(9);
  });
});

describe('averageMonthlyConsumption (OMS-REG-REPL-07.23)', () => {
  it('is this period alone with no history', () => {
    // 9 consumed over a 30-day period = 9/month.
    expect(averageMonthlyConsumption(9, 30, [])).toBe(9);
  });

  it('averages with the stored previous values', () => {
    // The live-verified carry-forward case: previous "9", this period 0 ⇒ 4.5.
    expect(averageMonthlyConsumption(0, 30, [9])).toBe(4.5);
  });

  it('averages across two prior forms', () => {
    expect(averageMonthlyConsumption(6, 30, [3, 9])).toBe(6);
  });
});

describe('previousMonthlyConsumption parsing (contract § line generation)', () => {
  it('parses the comma-joined history', () => {
    expect(
      previousMonthlyConsumption({ previousMonthlyConsumptionValues: '9,4.5' })
    ).toEqual([9, 4.5]);
  });

  it('is empty when the carry-forward chain is broken', () => {
    expect(
      previousMonthlyConsumption({ previousMonthlyConsumptionValues: '' })
    ).toEqual([]);
  });
});

describe('lowStockStatus (OMS-REG-REPL-07.26)', () => {
  it('is severe below a quarter of maximum', () => {
    expect(lowStockStatus(24, 100)).toBe('BELOW_QUARTER');
  });

  it('is mild below half of maximum', () => {
    expect(lowStockStatus(49, 100)).toBe('BELOW_HALF');
  });

  it('is none at or above half', () => {
    expect(lowStockStatus(50, 100)).toBe('OK');
  });

  it('marks a negative balance severe even at maximum 0 (live-verified)', () => {
    expect(lowStockStatus(-5, 0)).toBe('BELOW_QUARTER');
  });
});

describe('recomputeLine (OMS-REG-REPL-07.22 .24 .25 .28)', () => {
  it('derives the full consequence of an edit', () => {
    // The live-verified Nov-form edit: initial 64009, consumed 9.
    const result = recomputeLine(
      line({ initialBalance: 64009, quantityConsumed: 9 }),
      ctx
    );
    // .22 — the balance identity including losses.
    expect(result.finalBalance).toBe(64000);
    // .23 — AMC with no history is this period's monthly consumption.
    expect(result.averageMonthlyConsumption).toBe(9);
    // .24 — min/max are AMC × the store preferences (3 / 6), never a fixed 2×.
    expect(result.minimumQuantity).toBe(27);
    expect(result.maximumQuantity).toBe(54);
    // .25 — requested floors at 0 when final exceeds maximum.
    expect(result.calculatedRequestedQuantity).toBe(0);
  });

  it('subtracts losses in the balance identity (.22)', () => {
    const result = recomputeLine(
      line({
        initialBalance: 100,
        quantityReceived: 20,
        quantityConsumed: 30,
        adjustments: -5,
        losses: 10,
      }),
      ctx
    );
    expect(result.finalBalance).toBe(75);
  });

  it('requests up to maximum when the balance falls short (.25)', () => {
    // Consumed 60 of 60 over 30 days ⇒ AMC 60; max 360; final 0 ⇒ request 360.
    const result = recomputeLine(
      line({ initialBalance: 60, quantityConsumed: 60 }),
      ctx
    );
    expect(result.maximumQuantity).toBe(360);
    expect(result.calculatedRequestedQuantity).toBe(360);
  });
});

describe('error lines (OMS-REG-REPL-07.46)', () => {
  it('flags a negative final balance', () => {
    expect(lineHasError({ initialBalance: 0, finalBalance: -5 })).toBe(true);
  });

  it('flags a negative initial balance', () => {
    expect(lineHasError({ initialBalance: -1, finalBalance: 0 })).toBe(true);
  });

  it('passes non-negative balances', () => {
    expect(lineHasError({ initialBalance: 0, finalBalance: 0 })).toBe(false);
  });

  it('withholds error lines from a save, keeps clean dirty ones (.45/.46)', () => {
    const clean = line({ id: 'clean', dirty: true });
    const error = line({ id: 'error', dirty: true, finalBalance: -5 });
    const untouched = line({ id: 'untouched' });
    expect(linesToSave([clean, error, untouched]).map(l => l.id)).toEqual([
      'clean',
    ]);
  });
});

describe('toUpdateLineInput (contract § editing a draft)', () => {
  it('carries the full line state the input requires', () => {
    const input = toUpdateLineInput(
      line({
        initialBalance: 64009,
        quantityConsumed: 9,
        finalBalance: 64000,
        enteredRequestedQuantity: 123,
        comment: 'line note',
      })
    );
    expect(input).toMatchObject({
      id: 'line-1',
      initialBalance: 64009,
      quantityConsumed: 9,
      finalBalance: 64000,
      enteredRequestedQuantity: 123,
      comment: 'line note',
      confirmed: false,
    });
    // No draft-tracking or display-only fields leak onto the wire.
    expect(input).not.toHaveProperty('dirty');
    expect(input).not.toHaveProperty('item');
    expect(input).not.toHaveProperty('approvedQuantity');
  });
});
