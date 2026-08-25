import { describe, expect, it } from 'vitest';
import { survivingSelection, wholeRegisterVariables } from './campaignDelete';

// Anchors: spec/campaigns/cases/OMS-REG-MNG-04.
//   .29 — a refused selection deletes nothing; dismissing the notice drops the
//         vanished rows from the kept selection
// The delete is ATOMIC — one mutation, one server transaction — and its
// outcomes are the fetch result's own kind, read inline in
// DeleteCampaignsAction (the response union has no error member); what needs
// pinning at this layer is only the pruning a refusal triggers. The
// server-side facts (.25's absent in-use guard, .30's not-found, the rollback
// itself) are verified against the real backend — see BUILD_REPORT.

describe('OMS-REG-MNG-04.29 — the prune reads the whole register', () => {
  it('sends no page — a selection can span pages, so the visible page cannot answer', () => {
    expect(wholeRegisterVariables('store-a')).not.toHaveProperty('page');
  });

  it('keeps the register read discipline: exactly one sort entry, storeId as sent', () => {
    expect(wholeRegisterVariables('store-a')).toEqual({
      storeId: 'store-a',
      sort: [{ key: 'name', desc: false }],
    });
  });
});

describe('OMS-REG-MNG-04.29 — the kept selection drops vanished rows', () => {
  it('keeps ids still in the register, in selection order', () => {
    expect(
      survivingSelection(
        ['a', 'gone', 'c'],
        [{ id: 'c' }, { id: 'a' }, { id: 'x' }]
      )
    ).toEqual(['a', 'c']);
  });

  it('keeps the whole selection while the register still holds it', () => {
    expect(survivingSelection(['a', 'b'], [{ id: 'a' }, { id: 'b' }])).toEqual([
      'a',
      'b',
    ]);
  });

  it('empties when the register lost the whole selection', () => {
    expect(survivingSelection(['a'], [])).toEqual([]);
  });

  it('does nothing for an empty selection', () => {
    expect(survivingSelection([], [{ id: 'a' }])).toEqual([]);
  });
});
