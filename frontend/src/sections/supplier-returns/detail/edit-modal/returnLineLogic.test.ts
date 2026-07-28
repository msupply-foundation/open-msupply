import { describe, expect, it } from 'vitest';
import {
  clampQuantity,
  existingLinesBeingRemoved,
  reasonStepLines,
  seedDrafts,
  toLineInputs,
  validateStep1,
  type DraftReturnLine,
} from './returnLineLogic';

// Draft/upsert semantics for the return-items modal
// (spec/supplier-returns/rules.md § line rules; behaviour IDs cited per test).
// These mirror the SERVER's upsert-by-quantity semantics client-side — the wire
// assertions live with the real-backend legs of REPL-06 .31 / SRN-001 .2.

const draft = (over: Partial<DraftReturnLine> = {}): DraftReturnLine => ({
  id: 'l1',
  existing: false,
  stockLineId: 's1',
  batch: null,
  expiryDate: null,
  packSize: 1,
  numberOfPacksToReturn: 0,
  availableNumberOfPacks: 100,
  onHold: false,
  itemCode: 'A',
  itemName: 'Item A',
  item: { id: 'i1', code: 'A', unitName: null },
  reasonId: null,
  reasonOption: null,
  note: null,
  ...over,
});

describe('toLineInputs — the upsert batch set (REPL-06 .31)', () => {
  it('sends quantity > 0 lines, keeps zeroed EXISTING lines (deletes), drops zeroed NEW lines', () => {
    const inputs = toLineInputs([
      draft({ id: 'keep', numberOfPacksToReturn: 2 }),
      draft({ id: 'delete-me', existing: true, numberOfPacksToReturn: 0 }),
      draft({ id: 'dropped', numberOfPacksToReturn: 0 }),
    ]);
    expect(inputs.map(l => l.id)).toEqual(['keep', 'delete-me']);
  });

  // OMS-FUN-SRN-001 .9 — a line is always an existing stock line; the wire
  // input carries its stockLineId, never an invented batch.
  it('maps the wire fields verbatim (id / stockLineId / qty / reason / note)', () => {
    const [input] = toLineInputs([
      draft({
        id: 'l9',
        stockLineId: 'stock-9',
        numberOfPacksToReturn: 3,
        reasonId: 'reason-1',
        note: 'damaged',
      }),
    ]);
    expect(input).toEqual({
      id: 'l9',
      stockLineId: 'stock-9',
      numberOfPacksToReturn: 3,
      reasonId: 'reason-1',
      note: 'damaged',
    });
  });
});

describe('validateStep1 — the quantity-step gate (REPL-06 .29)', () => {
  it('flags an all-zero draft', () => {
    expect(validateStep1([draft(), draft({ id: 'l2' })])).toBe('no-quantity');
  });

  it('passes when any line carries quantity', () => {
    expect(validateStep1([draft({ numberOfPacksToReturn: 1 })])).toBe('ok');
  });
});

describe('existingLinesBeingRemoved — the destructive-save warning (REPL-06 .32)', () => {
  it('is empty when everything to return is NEW (a create-mode block, not a delete)', () => {
    expect(existingLinesBeingRemoved([draft(), draft({ id: 'l2' })])).toEqual(
      []
    );
  });

  it('flags every existing line zeroed when the whole set is zero', () => {
    const removed = existingLinesBeingRemoved([
      draft({ id: 'e1', existing: true }),
      draft({ id: 'l2' }),
    ]);
    expect(removed.map(l => l.id)).toEqual(['e1']);
  });

  // The mixed case: another line still carries quantity, so the verdict is
  // 'ok' — the zeroed existing line would still be a silent delete.
  it('flags a zeroed existing line even when other lines carry quantity', () => {
    const drafts = [
      draft({ id: 'keep', numberOfPacksToReturn: 4 }),
      draft({ id: 'e2', existing: true, numberOfPacksToReturn: 0 }),
    ];
    expect(validateStep1(drafts)).toBe('ok');
    expect(existingLinesBeingRemoved(drafts).map(l => l.id)).toEqual(['e2']);
  });
});

describe('clampQuantity — the UI-only returned ≤ available cap (SRN-001 .2)', () => {
  it('caps at quantity-available-for-return, floors at zero', () => {
    expect(clampQuantity(7, 5)).toBe(5);
    expect(clampQuantity(3, 5)).toBe(3);
    expect(clampQuantity(-1, 5)).toBe(0);
    // No available context: no ceiling — the server accepts any quantity
    // (contract § line rules wire trap).
    expect(clampQuantity(999, null)).toBe(999);
  });
});

describe('reasonStepLines — step 2 shows only returned lines', () => {
  it('filters to quantity > 0', () => {
    const rows = reasonStepLines([
      draft({ id: 'a', numberOfPacksToReturn: 1 }),
      draft({ id: 'b', numberOfPacksToReturn: 0 }),
    ]);
    expect(rows.map(l => l.id)).toEqual(['a']);
  });
});

describe('seedDrafts', () => {
  it('marks generated lines as existing when their id is already on the return', () => {
    const seeded = seedDrafts(
      [draft({ id: 'on-return' }), draft({ id: 'fresh' })],
      new Set(['on-return'])
    );
    expect(seeded.find(l => l.id === 'on-return')?.existing).toBe(true);
    expect(seeded.find(l => l.id === 'fresh')?.existing).toBe(false);
  });
});
