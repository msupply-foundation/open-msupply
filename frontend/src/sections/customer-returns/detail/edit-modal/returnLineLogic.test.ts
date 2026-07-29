import { describe, expect, it } from 'vitest';
import {
  blankDraft,
  clampQuantity,
  existingLinesBeingRemoved,
  reasonStepLines,
  seedDrafts,
  toLineInputs,
  validateStep1,
  type DraftReturnLine,
} from './returnLineLogic';

// Draft/upsert semantics for the return-items modal
// (spec/customer-returns/rules.md § line rules; cases/OMS-REG-DIST-07
// behaviour IDs cited per test). These mirror the SERVER's upsert-by-quantity
// semantics client-side —
// the wire assertions live with OMS-REG-DIST-07.19's real-backend leg.

const draft = (over: Partial<DraftReturnLine> = {}): DraftReturnLine => ({
  id: 'l1',
  existing: false,
  batch: null,
  expiryDate: null,
  packSize: 1,
  numberOfPacksReturned: 0,
  numberOfPacksIssued: null,
  note: null,
  reasonId: null,
  itemVariantId: null,
  volumePerPack: 0,
  itemCode: 'A',
  itemName: 'Item A',
  item: { id: 'i1', code: 'A', unitName: null },
  ...over,
});

describe('toLineInputs — the upsert batch set (OMS-REG-DIST-07.19)', () => {
  it('sends quantity > 0 lines, keeps zeroed EXISTING lines (deletes), drops zeroed NEW lines', () => {
    const inputs = toLineInputs([
      draft({ id: 'keep', numberOfPacksReturned: 2 }),
      draft({ id: 'delete-me', existing: true, numberOfPacksReturned: 0 }),
      draft({ id: 'dropped', numberOfPacksReturned: 0 }),
    ]);
    expect(inputs.map(l => l.id)).toEqual(['keep', 'delete-me']);
  });

  it('maps the wire fields verbatim (no remapping)', () => {
    const [input] = toLineInputs([
      draft({
        id: 'l9',
        numberOfPacksReturned: 3,
        packSize: 12,
        batch: 'B-1',
        expiryDate: '2027-01-01',
        reasonId: 'reason-1',
        note: 'damaged',
        itemVariantId: 'v1',
        volumePerPack: 0.5,
      }),
    ]);
    expect(input).toEqual({
      id: 'l9',
      itemId: 'i1',
      numberOfPacksReturned: 3,
      packSize: 12,
      batch: 'B-1',
      expiryDate: '2027-01-01',
      reasonId: 'reason-1',
      note: 'damaged',
      itemVariantId: 'v1',
      volumePerPack: 0.5,
    });
  });
});

describe('validateStep1 — the quantity-step gates', () => {
  it('flags an all-zero draft', () => {
    expect(validateStep1([draft(), draft({ id: 'l2' })])).toBe('no-quantity');
  });

  // OMS-REG-DIST-07.21's UI half — pack size ≥ 1 for RETURNED lines only; a zeroed line's
  // pack size never blocks (it won't persist).
  it('rejects a returned line with pack size below one', () => {
    expect(
      validateStep1([draft({ numberOfPacksReturned: 1, packSize: 0 })])
    ).toBe('invalid-pack-size');
    expect(
      validateStep1([
        draft({ numberOfPacksReturned: 1, packSize: 1 }),
        draft({ id: 'l2', numberOfPacksReturned: 0, packSize: 0 }),
      ])
    ).toBe('ok');
  });
});

describe('existingLinesBeingRemoved — the destructive-save warning (OMS-REG-DIST-07.20)', () => {
  it('is empty when nothing to return is all NEW (a create-mode block, not a delete)', () => {
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
      draft({ id: 'keep', numberOfPacksReturned: 4 }),
      draft({ id: 'e2', existing: true, numberOfPacksReturned: 0 }),
    ];
    expect(validateStep1(drafts)).toBe('ok');
    expect(existingLinesBeingRemoved(drafts).map(l => l.id)).toEqual(['e2']);
  });
});

describe('clampQuantity — the UI-only returned ≤ issued cap (OMS-REG-DIST-07.23)', () => {
  it('caps at packs issued when known, floors at zero, uncapped otherwise', () => {
    expect(clampQuantity(7, 5)).toBe(5);
    expect(clampQuantity(3, 5)).toBe(3);
    expect(clampQuantity(-1, 5)).toBe(0);
    // No issued context (per-item drafts): no ceiling — the server accepts
    // any quantity (contract § line rules wire trap).
    expect(clampQuantity(999, null)).toBe(999);
  });
});

describe('reasonStepLines — step 2 shows only returned lines', () => {
  it('filters to quantity > 0', () => {
    const rows = reasonStepLines([
      draft({ id: 'a', numberOfPacksReturned: 1 }),
      draft({ id: 'b', numberOfPacksReturned: 0 }),
    ]);
    expect(rows.map(l => l.id)).toEqual(['a']);
  });
});

describe('seedDrafts / blankDraft', () => {
  it('marks generated lines as existing when their id is already on the return', () => {
    const seeded = seedDrafts(
      [draft({ id: 'on-return' }), draft({ id: 'fresh' })],
      new Set(['on-return'])
    );
    expect(seeded.find(l => l.id === 'on-return')?.existing).toBe(true);
    expect(seeded.find(l => l.id === 'fresh')?.existing).toBe(false);
  });

  it('creates a blank batch row at quantity 0 and the minimum pack size', () => {
    const blank = blankDraft({ id: 'i1', code: 'A', unitName: null });
    expect(blank.numberOfPacksReturned).toBe(0);
    expect(blank.packSize).toBe(1);
    expect(blank.existing).toBe(false);
  });
});
