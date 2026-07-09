import { describe, expect, it } from 'vitest';
import { FILTER_FIELDS, toStocktakeFilter, toFilterValues } from './listFilters';

// Conformance (C1 traceability) for the stocktakes list filters — the runnable,
// backend-free half. Cites spec/stocktakes acceptance IDs; the full UI-level
// C1/C2 pass (Playwright against the real backend) is a follow-up.
//
//   AC-L1  — filter by status narrows the list and persists in the URL. Here we
//            verify the value mapping the URL round-trip carries (FilterBar's flat
//            values ⇆ the GraphQL filter object); the URL persistence itself lives
//            in useUrlQueryState.
//   spec/stocktakes rules — the "deliberate filters" requirement: only an explicit
//            set of filters is exposed (nothing by accident).

describe('stocktakes list filters (AC-L1 mapping; deliberate-filters requirement)', () => {
  it('exposes exactly the deliberately-chosen filter fields', () => {
    expect(FILTER_FIELDS.map((f) => f.key)).toEqual([
      'status',
      'description',
      'comment',
      'isLocked',
      'isProgramStocktake',
    ]);
  });

  it('maps a status selection to equalTo — not equalAny, which the server ignores (AC-L1)', () => {
    expect(toStocktakeFilter({ status: ['NEW'] })).toEqual({ status: { equalTo: 'NEW' } });
    // Both values selected is no status filter (the enum has only these two).
    expect(toStocktakeFilter({ status: ['NEW', 'FINALISED'] })).toEqual({});
  });

  it('maps text fields to a like operator and drops empty values', () => {
    expect(toStocktakeFilter({ description: 'count' })).toEqual({
      description: { like: 'count' },
    });
    // An empty value is absent from the filter — never { like: '' } (which the
    // server would wrongly match on).
    expect(toStocktakeFilter({ description: '', comment: '' })).toEqual({});
  });

  it('maps a single boolean choice; nothing (or both) means no filter', () => {
    expect(toStocktakeFilter({ isLocked: ['true'] })).toEqual({ isLocked: true });
    expect(toStocktakeFilter({ isProgramStocktake: ['false'] })).toEqual({
      isProgramStocktake: false,
    });
    expect(toStocktakeFilter({ isLocked: ['true', 'false'] })).toEqual({});
  });

  it('round-trips filter values through the GraphQL shape (URL restore)', () => {
    const values = { status: ['FINALISED'], comment: 'audit', isLocked: ['true'] };
    expect(toFilterValues(toStocktakeFilter(values))).toEqual(values);
  });

  it('ignores unknown status values (a stale/hand-edited URL degrades safely)', () => {
    expect(toStocktakeFilter({ status: ['BOGUS'] })).toEqual({});
  });
});
